import { GoogleGenAI } from "@google/genai";
import { GEMINI_MODEL_NAME } from "../utils/constants";
import { buildPrompt, CV_PROMPTS, PROJECT_PROMPTS } from "../prompts";
import {
  cvEvaluationSchema,
  cvParseSchema,
  projectEvaluationSchema,
  projectParseSchema,
} from "../schemas";
import { OVERALL_PROMPT } from "../prompts/overall-summary-prompt";

/* Interfaces for JSON parsed cv evaluation response from LLM */
interface cvEvaluationResponse {
  cvMatchRate: number;
  cvFeedback: string;
}

/* Interfaces for JSON parsed project evaluation response from LLM */
interface projectEvaluationResponse {
  projectScore: number;
  projectFeedback: string;
}

/** 
Service to interact with LLM for parsing and evaluating CVs and project reports
and generating final summaries */
export class LLMService {
  private geminiClient: GoogleGenAI;

  constructor() {
    this.geminiClient = new GoogleGenAI({});
  }

  /**
   * Parses the given CV text using LLM.
   * It constructs a prompt with the CV text and sends it to the model for parsing.
   * The response is expected to conform to the cvParseSchema.
   *
   * @param cvText - The raw text content of the CV to be parsed.
   * @returns A promise that resolves to the parsed CV in JSON string format.
   * @throws An error if the LLM fails to return a valid response.
   */
  async parseCV(cvText: string): Promise<string> {
    // Build the prompt with CV text
    const prompt = buildPrompt(CV_PROMPTS.PARSE_CV, { cvText });

    // Call the LLM to parse the CV
    const response = await this.geminiClient.models.generateContent({
      model: GEMINI_MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: cvParseSchema,
      },
    });

    if (!response?.text) {
      throw new Error("Failed to parse CV - no response from LLM");
    }

    // Return the raw JSON string response
    return response.text;
  }

  /**
   * Evaluates the given CV text against a scoring rubric and job description using LLM.
   * It constructs a prompt with the CV text, scoring rubric, and job description, then sends it to the model for evaluation.
   * The response is expected to conform to the cvEvaluationSchema.
   *
   * @param cvText - The raw text content of the CV to be evaluated.
   * @param scoringRubric - The scoring rubric to evaluate the CV against.
   * @param job_description - The job description relevant to the CV.
   * @returns A promise that resolves to an object containing the CV match rate and feedback.
   * @throws An error if the LLM fails to return a valid response.
   */
  async evaluateCV(
    cvText: string,
    scoringRubric: string,
    job_description: string,
  ): Promise<cvEvaluationResponse> {
    // Build the prompt with CV text, scoring rubric, and job description
    const prompt = buildPrompt(CV_PROMPTS.EVALUATE_CV, {
      cvText,
      scoringRubric,
      jobDescription: job_description,
    });

    // Call the LLM to evaluate the CV
    const response = await this.geminiClient.models.generateContent({
      model: GEMINI_MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: cvEvaluationSchema,
      },
    });

    if (!response?.text) {
      throw new Error("Failed to evaluate CV - no response from LLM");
    }

    // Parse to JSON and return the evaluation result
    return JSON.parse(response.text) as cvEvaluationResponse;
  }

  /**
   * Parses the given project report text using LLM.
   * It constructs a prompt with the project report text and sends it to the model for parsing.
   * The response is expected to conform to the projectParseSchema.
   *
   * @param projectReportText - The raw text content of the project report to be parsed.
   * @returns A promise that resolves to the parsed project report in JSON string format.
   * @throws An error if the LLM fails to return a valid response.
   */
  async parseProjectReport(projectReportText: string): Promise<string> {
    // Build the prompt with project report text
    const prompt = buildPrompt(PROJECT_PROMPTS.PARSE_REPORT, {
      projectReportText,
    });

    // Call the LLM to parse the project report
    const response = await this.geminiClient.models.generateContent({
      model: GEMINI_MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: projectParseSchema,
      },
    });

    if (!response?.text) {
      throw new Error("Failed to parse project report - no response from LLM");
    }

    // Return the raw JSON string response
    return response.text;
  }

  /**
   * Evaluates the given project report text against a scoring rubric and case study brief using LLM.
   * It constructs a prompt with the project report text, scoring rubric, and case study brief, then sends it to the model for evaluation.
   * The response is expected to conform to the projectEvaluationSchema.
   *
   * @param projectReportText - The raw text content of the project report to be evaluated.
   * @param scoringRubric - The scoring rubric to evaluate the project report against.
   * @param caseStudyBrief - The case study brief relevant to the project report.
   * @returns A promise that resolves to an object containing the project score and feedback.
   * @throws An error if the LLM fails to return a valid response.
   */
  async evaluateProjectReport(
    projectReportText: string,
    scoringRubric: string,
    caseStudyBrief: string,
  ): Promise<projectEvaluationResponse> {
    // Build the prompt with project report text, scoring rubric, and case study brief
    const prompt = buildPrompt(PROJECT_PROMPTS.EVALUATE_PROJECT, {
      projectReportText,
      scoringRubric,
      caseStudyBrief,
    });

    // Call the LLM to evaluate the project report
    const response = await this.geminiClient.models.generateContent({
      model: GEMINI_MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: projectEvaluationSchema,
      },
    });

    if (!response?.text) {
      throw new Error(
        "Failed to evaluate project case study - no response from LLM",
      );
    }

    // Parse to JSON and return the evaluation result
    return JSON.parse(response.text) as projectEvaluationResponse;
  }

  /**
   * Generates a final summary combining CV and project evaluations using LLM.
   * It constructs a prompt with CV match rate, CV feedback, project score, project feedback, and job title, then sends it to the model to generate a summary.
   * The response is expected to be a plain text summary.
   * @param cvMatchRate - The match rate score from the CV evaluation.
   * @param cvFeedback - The detailed feedback from the CV evaluation.
   * @param projectScore - The score from the project evaluation.
   * @param projectFeedback - The detailed feedback from the project evaluation.
   * @param jobTitle - The job title for which the candidate is being evaluated.
   * @returns A promise that resolves to the final summary text.
   * @throws An error if the LLM fails to return a valid response.
   */
  async generateFinalSummary(
    cvMatchRate: string,
    cvFeedback: string,
    projectScore: string,
    projectFeedback: string,
    jobTitle: string,
  ): Promise<string> {
    // Build the prompt with evaluation results and job title
    const prompt = buildPrompt(OVERALL_PROMPT.FINAL_SUMMARY, {
      cvMatchRate,
      cvFeedback,
      projectScore,
      projectFeedback,
      jobTitle,
    });

    // Call the LLM to generate the final summary
    const response = await this.geminiClient.models.generateContent({
      model: GEMINI_MODEL_NAME,
      contents: prompt,
    });

    if (!response?.text) {
      throw new Error(
        "Failed to generate final summary - no response from LLM",
      );
    }

    // Return the summary text
    return response.text;
  }
}
