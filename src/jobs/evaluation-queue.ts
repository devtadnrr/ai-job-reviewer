import { Queue } from "bullmq";
import { redis } from "../utils/redis";
import { QUEUE_NAME } from "../utils/constants";

export interface EvaluationJobData {
  jobId: string;
  jobTitle: string;
  cvDocumentId: string;
  reportDocId: string;
}

export const evaluationQueue = new Queue<EvaluationJobData>(QUEUE_NAME, {
  connection: redis,
});
