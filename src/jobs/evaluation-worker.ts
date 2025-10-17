import { Worker } from "bullmq";
import { EvaluationService } from "../services/evaluation.services";
import { EvaluationJobData } from "./evaluation-queue";
import { QUEUE_NAME } from "../utils/constants";
import { redis } from "../utils/redis";

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

    try {
      // Initialize only on first job (lazy initialization)
      if (!isInitialized) {
        console.log("🔧 Initializing evaluation service for first job...");
        await evaluationService.initialize();
        isInitialized = true;
      }

      // Run the complete evaluation workflow
      const results = await evaluationService.evaluateCandidate({
        jobId,
        jobTitle,
        cvDocumentId,
        reportDocId,
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
      console.error(`❌ Job ${jobId} failed:`, error);

      throw new Error(
        `Evaluation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
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
  console.log("✅ Worker is ready and listening for jobs!");
});

evaluationWorker.on("error", (error) => {
  console.error("❌ Worker error:", error);
});

evaluationWorker.on("completed", (job, result) => {
  console.log(`✅ Worker completed job ${job.id}:`, result);
});

evaluationWorker.on("failed", (job, err) => {
  console.error(`❌ Worker failed job ${job?.id}:`, err.message);
});

evaluationWorker.on("active", (job) => {
  console.log(`🔄 Worker started processing job ${job.id}`);
});

evaluationWorker.on("drained", () => {
  console.log("⏳ Worker has processed all jobs and is waiting...");
});

evaluationWorker.on("stalled", (jobId) => {
  console.log(`⚠️ Job ${jobId} stalled`);
});

console.log("🚀 Worker setup complete, should be listening for jobs...");
