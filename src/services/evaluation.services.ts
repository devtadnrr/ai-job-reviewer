import { JobStatus } from "../generated/prisma";
import logger from "../utils/logger";
import { extractTextFromPDF } from "../utils/pdf-extraction";
import { prisma } from "../utils/prisma-client";
import { LLMService } from "./llm.services";
import { RAGService } from "./rag.services";

// Interface for input data to the evaluation process from the job queue
interface EvaluationData {
  jobId: string;
  jobTitle: string;
  cvDocumentId: string;
  reportDocId: string;
}

// Interface for the structured results of the evaluation process
interface EvaluationResults {
  parsedCV: string;
  cvEvaluation: {
    cvMatchRate: number;
    cvFeedback: string;
  };
  parsedProject: string;
  projectEvaluation: {
    projectScore: number;
    projectFeedback: string;
  };
  finalSummary: string;
  jobTitle: string;
}

// Service to handle the end-to-end evaluation workflow
export class EvaluationService {
  private llmService: LLMService;
  private ragService: RAGService;

  // Dependency injection of LLM and RAG services
  constructor() {
    this.llmService = new LLMService();
    this.ragService = new RAGService();
  }

  // Initialize RAG service (e.g., connect to ChromaDB)
  async initialize(): Promise<void> {
    logger.info("Initializing RAG service");
    await this.ragService.initialize();
    logger.info("RAG service initialized successfully");
  }

  /**
   * Evaluates a candidate's CV and project report against a job description and scoring rubric.
   * This method orchestrates the entire evaluation workflow, including document retrieval,
   * parsing, evaluation, and result storage.
   *
   * @param data - The evaluation data containing job and document identifiers.
   * @returns The evaluation results including parsed documents, evaluations, and final summary.
   * @throws Will throw an error if any step in the evaluation process fails.
   */
  async evaluateCandidate(data: EvaluationData): Promise<EvaluationResults> {
    // Destructure input data
    const { jobId, jobTitle, cvDocumentId, reportDocId } = data;

    logger.info("Starting candidate evaluation", { jobId, jobTitle });

    try {
      // Update job status to PROCESSING
      await this.updateJobStatus(jobId, JobStatus.PROCESSING);

      // 1. Retrieve job-related documents
      logger.info("Step 1: Retrieving job documents", { jobId, jobTitle });
      const { jobDescription, scoringRubric, caseStudyBrief } =
        await this.retrieveJobDocuments(jobTitle);

      // 2. Load candidate documents (CV and project report)
      logger.info("Step 2: Loading candidate documents", {
        jobId,
        cvDocumentId,
        reportDocId,
      });
      const { cvText, projectText } = await this.loadCandidateDocuments(
        cvDocumentId,
        reportDocId,
      );

      // 3. Parse and evaluate CV document
      logger.info("Step 3: Processing CV", { jobId });
      const { parsedCV, cvEvaluation } = await this.processCV(
        cvText,
        jobDescription,
        scoringRubric,
      );

      // 4. Parse and evaluate project report
      logger.info("Step 4: Processing project report", { jobId });
      const { parsedProject, projectEvaluation } = await this.processProject(
        projectText,
        caseStudyBrief,
        scoringRubric,
      );

      // 5. Generate final summary combining CV and project evaluations
      logger.info("Step 5: Generating final summary", { jobId });
      const finalSummary = await this.llmService.generateFinalSummary(
        String(cvEvaluation.cvMatchRate),
        cvEvaluation.cvFeedback,
        String(projectEvaluation.projectScore),
        projectEvaluation.projectFeedback,
        jobTitle,
      );

      const results: EvaluationResults = {
        parsedCV,
        cvEvaluation,
        parsedProject,
        projectEvaluation,
        finalSummary,
        jobTitle,
      };

      // Save results to database
      logger.info("Step 6: Saving evaluation results", { jobId });
      await this.saveEvaluationResults(jobId, results);

      // Update job status to COMPLETED
      await this.updateJobStatus(jobId, JobStatus.COMPLETED);
      logger.info("Candidate evaluation completed successfully", { jobId });

      return results;
    } catch (error) {
      // On any error, update job status to FAILED with error message
      logger.error("Candidate evaluation failed", {
        jobId,
        error: error instanceof Error ? error.message : error,
      });

      await this.updateJobStatus(
        jobId,
        JobStatus.FAILED,
        error instanceof Error ? error.message : "Unknown error",
      );

      throw error;
    }
  }

  /**
   * Helper method to retrieve job-related documents from the RAG service.
   * It searches for the relevant job and fetches the job description, scoring rubric,
   * and case study brief.
   *
   * @param jobTitle - The title of the job to retrieve documents for.
   * @returns An object containing the job description, scoring rubric, and case study brief.
   * @throws Will throw an error if no relevant job is found or if document retrieval fails.
   */
  private async retrieveJobDocuments(jobTitle: string) {
    // Search for the most relevant job title by its semantic similarity
    logger.debug("Searching for relevant job", { jobTitle });
    const relevantJob = await this.ragService.searchRelevantJob(jobTitle);

    if (!relevantJob) {
      logger.error("No relevant job found", { jobTitle });
      throw new Error(`No relevant job found for title: ${jobTitle}`);
    }

    // Fetch the required documents for the identified job title
    logger.debug("Relevant job found", { relevantJob });
    logger.debug("Fetching job documents", { relevantJob });
    const [jobDescription, scoringRubric, caseStudyBrief] = await Promise.all([
      this.ragService.searchJobDocument(relevantJob, "job_description"),
      this.ragService.searchJobDocument(relevantJob, "scoring_rubric"),
      this.ragService.searchJobDocument(relevantJob, "case_study_brief"),
    ]);

    logger.info("Job documents retrieved successfully", { relevantJob });

    return {
      jobDescription,
      scoringRubric,
      caseStudyBrief,
      relevantJob,
    };
  }

  /**
   * Helper method to load and extract text from the candidate's CV and project report documents.
   *
   * @param cvDocumentId - The ID of the CV document in the database.
   * @param reportDocId - The ID of the project report document in the database.
   * @returns An object containing the extracted text from both documents.
   * @throws Will throw an error if documents are not found or text extraction fails.
   */
  private async loadCandidateDocuments(
    cvDocumentId: string,
    reportDocId: string,
  ) {
    // Log document retrieval attempt
    logger.debug("Fetching candidate documents from database", {
      cvDocumentId,
      reportDocId,
    });

    // Fetch document records from the database
    const [cvDoc, reportDoc] = await Promise.all([
      prisma.document.findUnique({ where: { id: cvDocumentId } }),
      prisma.document.findUnique({ where: { id: reportDocId } }),
    ]);

    if (!cvDoc || !reportDoc) {
      logger.error("Candidate documents not found", {
        cvDocumentId,
        reportDocId,
      });
      throw new Error("Candidate documents not found");
    }

    // Log text extraction attempt
    logger.debug("Extracting text from PDF documents", {
      cvPath: cvDoc.filepath,
      reportPath: reportDoc.filepath,
    });

    // Extract text from both PDF documents concurrently
    const [cvText, projectText] = await Promise.all([
      extractTextFromPDF(cvDoc.filepath),
      extractTextFromPDF(reportDoc.filepath),
    ]);

    logger.info("Candidate documents loaded successfully");

    return { cvText, projectText };
  }

  /**
   * Helper method to process and evaluate the candidate's CV.
   * It parses the CV to extract structured information and evaluates it against
   * the job description and scoring rubric.
   *
   * @param cvText - The raw text content of the CV.
   * @param jobDescription - The job description to evaluate against.
   * @param scoringRubric - The scoring rubric to guide the evaluation.
   * @returns An object containing the parsed CV and its evaluation results.
   * @throws Will throw an error if parsing or evaluation fails.
   */
  private async processCV(
    cvText: string,
    jobDescription: string,
    scoringRubric: string,
  ) {
    try {
      // Parse the CV to extract structured information
      logger.debug("Parsing CV");
      const parsedCV = await this.llmService.parseCV(cvText);

      // Evaluate the CV against the job description and scoring rubric
      logger.debug("Evaluating CV");
      const cvEvaluation = await this.llmService.evaluateCV(
        cvText,
        scoringRubric,
        jobDescription,
      );

      logger.info("CV processed successfully", {
        cvMatchRate: cvEvaluation.cvMatchRate,
      });

      return { parsedCV, cvEvaluation };
    } catch (error) {
      logger.error("Failed to process CV", {
        error: error instanceof Error ? error.message : error,
      });
      throw new Error(
        `Failed to process CV: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  /**
   * Helper method to process and evaluate the candidate's project report.
   * It parses the project report to extract structured information and evaluates it
   * against the case study brief and scoring rubric.
   *
   * @param projectText - The raw text content of the project report.
   * @param caseStudyBrief - The case study brief to evaluate against.
   * @param scoringRubric - The scoring rubric to guide the evaluation.
   * @returns An object containing the parsed project report and its evaluation results.
   * @throws Will throw an error if parsing or evaluation fails.
   */
  private async processProject(
    projectText: string,
    caseStudyBrief: string,
    scoringRubric: string,
  ) {
    try {
      // Parse the project report to extract structured information
      logger.debug("Parsing project report");
      const parsedProject =
        await this.llmService.parseProjectReport(projectText);

      // Evaluate the project report against the case study brief and scoring rubric
      logger.debug("Evaluating project report");
      const projectEvaluation = await this.llmService.evaluateProjectReport(
        projectText,
        scoringRubric,
        caseStudyBrief,
      );

      logger.info("Project report processed successfully", {
        projectScore: projectEvaluation.projectScore,
      });

      return { parsedProject, projectEvaluation };
    } catch (error) {
      logger.error("Failed to process project", {
        error: error instanceof Error ? error.message : error,
      });
      throw new Error(
        `Failed to process project: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  /**
   * Helper method to save the evaluation results to the database.
   *
   * @param jobId - The ID of the evaluation job.
   * @param results - The evaluation results to be saved.
   * @throws Will throw an error if saving to the database fails.
   */
  private async saveEvaluationResults(
    jobId: string,
    results: EvaluationResults,
  ) {
    try {
      // Save the evaluation results in the database
      await prisma.evaluationResult.create({
        data: {
          jobId,
          cvMatchRate: results.cvEvaluation.cvMatchRate,
          cvFeedback: results.cvEvaluation.cvFeedback,
          projectScore: results.projectEvaluation.projectScore,
          projectFeedback: results.projectEvaluation.projectFeedback,
          overallSummary: results.finalSummary,
          rawData: {
            parsedCV: results.parsedCV,
            parsedProject: results.parsedProject,
            jobTitle: results.jobTitle,
          },
        },
      });

      logger.info("Evaluation results saved successfully", { jobId });
    } catch (error) {
      logger.error("Failed to save evaluation results", {
        error: error instanceof Error ? error.message : error,
      });
      throw new Error(
        `Failed to save results: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  /**
   * Helper method to update the status of an evaluation job in the database.
   *
   * @param jobId - The ID of the evaluation job to update.
   * @param status - The new status to set for the job.
   * @param errorMessage - Optional error message if the job failed.
   */
  private async updateJobStatus(
    jobId: string,
    status: JobStatus,
    errorMessage?: string,
  ) {
    try {
      await prisma.evaluationJob.update({
        where: { id: jobId },
        data: {
          status,
          errorMessage: errorMessage || null,
          updatedAt: new Date(),
        },
      });

      logger.info("Job status updated", { jobId, status });
    } catch (error) {
      // Log error if job doesn't exist (might be deleted)
      if (
        error instanceof Error &&
        error.message.includes("Record to update not found")
      ) {
        logger.warn("Job not found in database, cannot update status", {
          jobId,
        });
        return;
      }

      logger.error("Failed to update job status", {
        jobId,
        error: error instanceof Error ? error.message : error,
      });
    }
  }
}
