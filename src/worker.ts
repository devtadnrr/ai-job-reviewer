import { EvaluationService } from "./services/evaluation.services";
import { RAGService } from "./services/rag.services";
import { evaluationWorker } from "./jobs/evaluation-worker";
import logger from "./utils/logger";

/**
 * Starts the evaluation worker by initializing necessary services and handling graceful shutdown.
 * This function ensures that the RAG service is initialized and documents are ingested before
 * the worker begins processing jobs. It also sets up signal handlers for clean termination.
 */
async function startWorker() {
  try {
    logger.info("Starting evaluation worker");

    // Initialize RAG service and ingest documents once at worker startup
    logger.info("Initializing RAG service");
    const ragService = new RAGService();
    await ragService.initialize();

    // Ingest documents if not already ingested
    logger.info("Ingesting documents into RAG service");
    await ragService.ingestAllDocuments();

    // Pre-initialize services once at startup
    logger.info("Initializing evaluation service");
    const evaluationService = new EvaluationService();
    await evaluationService.initialize();

    logger.info("Worker initialization complete");

    // Graceful shutdown
    process.on("SIGINT", async () => {
      logger.info("Received SIGINT signal, shutting down worker");
      await evaluationWorker.close();
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      logger.info("Received SIGTERM signal, shutting down worker");
      await evaluationWorker.close();
      process.exit(0);
    });
  } catch (error) {
    logger.error("Failed to start worker", { error });
    process.exit(1);
  }
}

startWorker();
