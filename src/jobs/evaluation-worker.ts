import { Worker } from "bullmq";
import { EvaluationService } from "../services/evaluation.services";
import { EvaluationJobData } from "./evaluation-queue";
import { QUEUE_NAME } from "../utils/constants";
import { redis } from "../utils/redis";
import logger from "../utils/logger";

// Initialize the evaluation service instance (lazy initialization)
const evaluationService = new EvaluationService();
let isInitialized = false;

/**
 * BullMQ Worker to process evaluation jobs from the queue.
 * Each job involves evaluating a candidate's CV against a job description
 * and generating a summary report.
 *
 * The worker initializes the EvaluationService on the first job to optimize
 * resource usage. It processes jobs one at a time (concurrency: 1) to ensure
 * sequential handling and easier debugging.
 *
 * Job Data:
 * - jobId: Unique identifier for the evaluation job.
 * - jobTitle: Title of the job position.
 * - cvDocumentId: ID of the candidate's CV document.
 * - reportDocId: ID of the job description document.
 *
 * The worker logs key events and errors for monitoring and debugging purposes.
 */
export const evaluationWorker = new Worker<EvaluationJobData>(
  QUEUE_NAME,
  async (job) => {
    // Destructure job data
    const { jobId, jobTitle, cvDocumentId, reportDocId } = job.data;

    // Validate required job data
    if (!jobId || !jobTitle || !cvDocumentId || !reportDocId) {
      logger.error("Invalid job data: missing required fields", {
        jobId,
        jobTitle,
        cvDocumentId,
        reportDocId,
      });
      throw new Error("Invalid job data: missing required fields");
    }

    try {
      // Initialize only on first job (lazy initialization)
      if (!isInitialized) {
        logger.info("Initializing evaluation service for first job");
        await evaluationService.initialize();
        isInitialized = true;
        logger.info("Evaluation service initialized successfully");
      }

      // Run the complete evaluation workflow
      const results = await evaluationService.evaluateCandidate({
        jobId,
        jobTitle,
        cvDocumentId,
        reportDocId,
      });

      // Log successful job completion
      logger.info("Job completed successfully", {
        jobId,
        cvMatchRate: results.cvEvaluation.cvMatchRate,
        projectScore: results.projectEvaluation.projectScore,
      });

      return {
        success: true,
        jobId,
        results: {
          cvMatchRate: results.cvEvaluation.cvMatchRate,
          projectScore: results.projectEvaluation.projectScore,
          finalSummary: results.finalSummary,
        },
      };
    } catch (error) {
      logger.error("Job processing failed", {
        jobId,
        error: error instanceof Error ? error.message : error,
      });

      let userMessage = "Evaluation failed";

      if (error instanceof Error) {
        if (error.message.includes("timeout")) {
          userMessage = "Evaluation timed out. Please try again.";
        } else if (
          error.message.includes("quota") ||
          error.message.includes("rate limit")
        ) {
          userMessage = "API rate limit reached. Please try again later.";
        } else if (error.message.includes("overloaded")) {
          userMessage =
            "Model is currently overloaded. Please try again later.";
        } else if (error.message.includes("not found")) {
          userMessage = `Document or job configuration not found: ${error.message}`;
        } else if (
          error.message.includes("empty") ||
          error.message.includes("too short")
        ) {
          userMessage = `Invalid document: ${error.message}`;
        } else {
          userMessage = error.message;
        }
      }

      throw new Error(userMessage);
    }
  },
  {
    connection: redis,
    concurrency: 1,
  },
);

/**
 * Event handlers for debugging
 * These log key events in the worker's lifecycle for monitoring and troubleshooting.
 * They help track the worker's status, job progress, and any issues encountered.
 */
evaluationWorker.on("ready", () => {
  logger.info("Worker is ready and listening for jobs");
});

evaluationWorker.on("error", (error) => {
  logger.error("Worker error occurred", { error: error.message });
  if (error.message.includes("connection") || error.message.includes("Redis")) {
    logger.error(
      "Critical: Redis connection error detected, worker may need restart",
    );
  }
});

evaluationWorker.on("completed", (job, result) => {
  logger.info("Worker completed job", { jobId: job.id, result });
});

evaluationWorker.on("failed", (job, err) => {
  logger.error("Worker failed job", { jobId: job?.id, error: err.message });
});

evaluationWorker.on("active", (job) => {
  logger.info("Worker started processing job", { jobId: job.id });
});

evaluationWorker.on("drained", () => {
  logger.info("Worker has processed all jobs and is waiting...");
});

evaluationWorker.on("stalled", (jobId) => {
  logger.warn("Job stalled", { jobId });
});

logger.info("Worker setup complete, should be listening for jobs...");
