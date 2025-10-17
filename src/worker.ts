import { EvaluationService } from "./services/evaluation.services";
import { RAGService } from "./services/rag.services";
import { evaluationWorker } from "./jobs/evaluation-worker";

/**
 * Starts the evaluation worker by initializing necessary services and handling graceful shutdown.
 * This function ensures that the RAG service is initialized and documents are ingested before
 * the worker begins processing jobs. It also sets up signal handlers for clean termination.
 */
async function startWorker() {
  try {
    // Initialize RAG service and ingest documents once at worker startup
    const ragService = new RAGService();
    await ragService.initialize();

    // Ingest documents if not already ingested
    await ragService.ingestAllDocuments();

    // Pre-initialize services once at startup
    const evaluationService = new EvaluationService();
    await evaluationService.initialize();

    // Graceful shutdown
    process.on("SIGINT", async () => {
      console.log("Shutting down worker...");
      await evaluationWorker.close();
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      console.log("Shutting down worker...");
      await evaluationWorker.close();
      process.exit(0);
    });
  } catch (error) {
    console.error("Failed to start worker:", error);
    process.exit(1);
  }
}

startWorker();
