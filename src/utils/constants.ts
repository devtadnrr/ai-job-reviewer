import path from "path";

// File System Paths
export const INTERNAL_DOCUMENTS_DIR = path.join(process.cwd(), "documents");

// ChromaDB Configuration
export const CHROMA_URL = process.env.CHROMA_URL || "http://localhost:8000";
export const CHROMA_COLLECTION_NAME = "job_documents";

// Google Gemini Configuration
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
export const EMBEDDING_MODEL = "gemini-embedding-exp-03-07";
export const GEMINI_MODEL_NAME = "gemini-2.0-flash";

// BullMQ Queue Configuration
export const QUEUE_NAME = "evaluation";
