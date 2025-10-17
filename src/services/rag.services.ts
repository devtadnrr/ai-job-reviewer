import { GoogleGeminiEmbeddingFunction } from "@chroma-core/google-gemini";
import { ChromaClient, Collection } from "chromadb";
import * as fs from "fs-extra";
import * as path from "path";

import {
  CHROMA_COLLECTION_NAME,
  CHROMA_URL,
  EMBEDDING_MODEL,
  GEMINI_API_KEY,
  INTERNAL_DOCUMENTS_DIR,
} from "../utils/constants";
import { cleanPdfText, extractTextFromPDF } from "../utils/pdf-extraction";
import logger from "../utils/logger";

interface DocumentMetadata {
  documentType: "job_description" | "case_study_brief" | "scoring_rubric";
  jobTitle: string;
  filename: string;
  [key: string]: string | number;
}

export class RAGService {
  private chromaClient: ChromaClient;
  private embeddingFunction: GoogleGeminiEmbeddingFunction;
  private collection!: Collection;
  private readonly COLLECTION_NAME = CHROMA_COLLECTION_NAME;
  private readonly DOCUMENTS_DIR = INTERNAL_DOCUMENTS_DIR;

  /**
   * Initializes the RAGService with ChromaDB client and embedding function.
   * It sets up the connection to the ChromaDB instance and prepares the embedding model.
   * The collection is initialized separately via the initialize() method.
   */
  constructor() {
    this.chromaClient = new ChromaClient({ path: CHROMA_URL });
    this.embeddingFunction = new GoogleGeminiEmbeddingFunction({
      apiKey: GEMINI_API_KEY,
      modelName: EMBEDDING_MODEL,
    });
  }

  /**
   * Initializes the ChromaDB collection. If the collection does not exist, it creates a new one.
   * This method should be called before any operations that require the collection.
   */
  async initialize(): Promise<void> {
    logger.info("Initializing ChromaDB collection", {
      collectionName: this.COLLECTION_NAME,
    });
    this.collection = await this.chromaClient.getOrCreateCollection({
      name: this.COLLECTION_NAME,
      embeddingFunction: this.embeddingFunction,
    });

    logger.info("ChromaDB collection initialized successfully", {
      collectionName: this.COLLECTION_NAME,
    });
  }

  /**
   * Ingests all documents from the specified directory into the ChromaDB collection.
   * It reads PDF files from subdirectories named after job titles and extracts their text content.
   * Each document is stored with metadata including its type and associated job title.
   */
  async ingestAllDocuments(): Promise<void> {
    // Skip ingestion if documents already exist
    if (await this.hasDocuments()) {
      logger.info("Documents already ingested, skipping ingestion");
      return;
    }

    logger.info("Starting document ingestion", {
      documentsDir: this.DOCUMENTS_DIR,
    });

    // Get job titles from subdirectory names
    const jobTitles = await fs.readdir(this.DOCUMENTS_DIR);
    logger.info("Found job title directories", { count: jobTitles.length });

    // Iterate over each job title directory to ingest documents
    for (const jobTitle of jobTitles) {
      const jobPath = path.join(this.DOCUMENTS_DIR, jobTitle);
      const stats = await fs.stat(jobPath);

      if (stats.isDirectory()) {
        logger.debug("Processing job title directory", { jobTitle });
        await this.ingestJobDocuments(jobTitle, jobPath);
      }
    }

    logger.info("All documents ingested successfully");
  }

  /**
   * Searches for the most relevant job title based on the provided query.
   * It uses the ChromaDB collection to find the closest matching document and extracts the job title from its metadata.
   * @param query The search query string.
   * @returns The most relevant job title or null if no match is found.
   */
  async searchRelevantJob(query: string): Promise<string | null> {
    // Validate input
    if (!query || query.trim().length === 0) {
      logger.error("Search query cannot be empty");
      throw new Error("Search query cannot be empty");
    }

    logger.debug("Searching for relevant job", { query });

    try {
      // Search the collection for the most relevant document
      const results = await this.collection!.query({
        queryTexts: [query],
        nResults: 1, // Retrieve only the top result
      });

      // Return null if no results found
      const metadatas = results.metadatas?.[0] || [];
      if (metadatas.length === 0) {
        logger.warn("No relevant documents found for query", { query });
        return null;
      }

      // Extract the relevant job title from the metadata and validate it
      const relevantJob = metadatas[0]!.jobTitle;
      if (typeof relevantJob !== "string") {
        logger.warn("Relevant job title is missing or invalid");
        return null;
      }

      logger.info("Relevant job found", { query, relevantJob });

      return relevantJob;
    } catch (error) {
      // Log and re-throw error
      logger.error("Error searching for relevant job", {
        query,
        error: error instanceof Error ? error.message : error,
      });
      throw new Error(
        `Failed to search relevant job: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  /**
   * Searches and retrieves a specific type of document for a given job title.
   * It looks for documents like job descriptions, case study briefs, or scoring rubrics.
   * @param jobTitle The job title to search for.
   * @param documentType The type of document to retrieve (e.g., "job_description", "case_study_brief", "scoring_rubric").
   * @returns The text content of the requested document.
   * @throws An error if the document type is not found for the specified job title.
   */
  async searchJobDocument(
    jobTitle: string,
    documentType: string,
  ): Promise<string> {
    // Validate inputs
    if (!jobTitle || jobTitle.trim().length === 0) {
      logger.error("Job title cannot be empty");
      throw new Error("Job title cannot be empty");
    }

    // Check if collection is initialized
    if (!this.collection) {
      logger.error("RAG service not initialized");
      throw new Error("RAG service not initialized. Call initialize() first.");
    }

    logger.debug("Searching for job document", { jobTitle, documentType });

    try {
      // Get documents matching the job title
      const relevantDocs = await this.collection!.get({
        where: { jobTitle: { $eq: jobTitle } },
      });

      const metadatas = relevantDocs.metadatas ?? [];
      const documents = relevantDocs.documents ?? [];

      // Find the index of the requested document type based on metadata
      const index = metadatas.findIndex(
        (meta) => meta!.documentType === documentType,
      );

      // If not found, throw an error
      if (index === -1) {
        throw new Error(`No ${documentType} found for job title: ${jobTitle}`);
      }

      // Return the cleaned text of the found document
      const docText = documents[index] ?? "";
      return cleanPdfText(docText);
    } catch (error) {
      logger.error("Error retrieving job document", {
        jobTitle,
        documentType,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  /**
   * Clears all documents from the ChromaDB collection.
   * This method deletes the existing collection and re-initializes it.
   * Use with caution as this will remove all ingested documents.
   */
  async clearCollection(): Promise<void> {
    logger.info("Clearing ChromaDB collection", {
      collectionName: this.COLLECTION_NAME,
    });

    try {
      await this.chromaClient.deleteCollection({ name: this.COLLECTION_NAME });
      await this.initialize();
      logger.info("Collection cleared successfully");
    } catch (error) {
      logger.error("Error clearing collection", {
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  /**
   * Helper method to check if the collection already has documents.
   * @returns True if documents exist, false otherwise.
   */
  private async hasDocuments(): Promise<boolean> {
    const count = await this.collection!.count();
    logger.debug("Checking document count", { count });
    return count > 0;
  }

  /**
   * Helper method to ingest all PDF documents for a specific job title.
   * It reads all PDF files in the given job path and processes them.
   * @param jobTitle The job title associated with the documents.
   * @param jobPath The file system path to the job title's document directory.
   */
  private async ingestJobDocuments(
    jobTitle: string,
    jobPath: string,
  ): Promise<void> {
    const files = await fs.readdir(jobPath);
    const pdfFiles = files.filter((file) => file.endsWith(".pdf"));

    logger.info("Ingesting job documents", {
      jobTitle,
      fileCount: pdfFiles.length,
    });

    for (const filename of pdfFiles) {
      const filePath = path.join(jobPath, filename);
      await this.ingestDocument(filePath, jobTitle, filename);
    }
  }

  /**
   * Helper method to ingest a single PDF document.
   * It extracts text from the PDF, determines its type, and adds it to the collection with metadata.
   * @param filePath The file system path to the PDF document.
   * @param jobTitle The job title associated with the document.
   * @param filename The name of the PDF file.
   * @throws An error if the file does not exist, is empty, or if text extraction fails.
   */
  private async ingestDocument(
    filePath: string,
    jobTitle: string,
    filename: string,
  ): Promise<void> {
    try {
      logger.debug("Ingesting document", { filename, filePath });

      // Check if file exists
      const fileExists = await fs.pathExists(filePath);
      if (!fileExists) {
        throw new Error(`File not found: ${filePath}`);
      }

      // Check file size (avoid processing corrupted/empty files)
      const stats = await fs.stat(filePath);
      if (stats.size === 0) {
        throw new Error(`File is empty: ${filePath}`);
      }

      // Extract text from the PDF file
      const text = await extractTextFromPDF(filePath);

      // Throw an error if PDF extraction returned empty text
      if (!text || text.trim().length === 0) {
        throw new Error(`Failed to extract text from PDF: ${filePath}`);
      }

      // Determine document type based on filename
      let documentType: DocumentMetadata["documentType"];
      if (filename.includes("job_description")) {
        documentType = "job_description";
      } else if (filename.includes("case_study_brief")) {
        documentType = "case_study_brief";
      } else if (filename.includes("scoring_rubric")) {
        documentType = "scoring_rubric";
      } else {
        throw new Error(`Unknown document type for file: ${filename}`);
      }

      // Create a unique ID for the document
      const id = `${this.normalizeJobTitle(jobTitle)}_${documentType}`;

      // Prepare metadata for the document
      const metadata: DocumentMetadata = {
        documentType,
        jobTitle: this.normalizeJobTitle(jobTitle),
        filename,
      };

      // Add the document to the collection
      await this.collection!.add({
        ids: [id],
        documents: [text],
        metadatas: [metadata],
      });

      logger.info("Document ingested successfully", { filename, documentType });
    } catch (error) {
      logger.error("Error ingesting document", {
        filename,
        error: error instanceof Error ? error.message : error,
      });
      logger.warn("Skipping document due to error", { filename });
    }
  }

  /**
   * Helper method to normalize job titles for consistent metadata storage.
   * It converts the job title to lowercase and replaces spaces and special characters with underscores.
   * @param jobTitle The original job title string.
   * @returns The normalized job title string.
   */
  private normalizeJobTitle(jobTitle: string): string {
    return jobTitle.toLowerCase().replace(/[\s_-]+/g, "_");
  }
}
