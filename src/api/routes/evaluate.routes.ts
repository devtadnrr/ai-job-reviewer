import express, { Request, Response } from "express";
import { prisma } from "../../utils/prisma-client";
import { JobStatus } from "../../generated/prisma";
import {
  EvaluationJobData,
  evaluationQueue,
} from "../../jobs/evaluation-queue";
import {
  ATTEMPTS_RETRY,
  EXPONENTIAL_BACKOFF_DELAY,
  QUEUE_NAME,
  REMOVE_ON_COMPLETE,
  REMOVE_ON_FAIL,
} from "../../utils/constants";
import logger from "../../utils/logger";

const router = express.Router();

/**
 * POST /evaluate
 * Creates a new evaluation job for a candidate's CV against a job description.
 * Expects job_title, cv_document_id, and report_document_id in the request body.
 */
router.post("/evaluate", async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { job_title, cv_document_id, report_document_id } = req.body;

    // Check for missing parameters
    if (!job_title || !cv_document_id || !report_document_id) {
      logger.warn("Evaluation request missing required fields", {
        job_title,
        cv_document_id,
        report_document_id,
      });
      return res.status(400).json({
        error:
          "job_title, cv_document_id, and report_document_id are required.",
      });
    }

    // Log the received evaluation request
    logger.info("Received evaluation request", {
      job_title,
      cv_document_id,
      report_document_id,
    });

    // Verify that the specified documents exist
    const [cvDoc, reportDoc] = await Promise.all([
      prisma.document.findUnique({ where: { id: cv_document_id } }),
      prisma.document.findUnique({ where: { id: report_document_id } }),
    ]);

    // If either document is not found, return 404
    if (!cvDoc || !reportDoc) {
      logger.error("Documents not found", {
        cv_document_id,
        report_document_id,
      });
      return res.status(404).json({
        error: "One or both of the specified documents were not found.",
      });
    }

    // Create a new evaluation job in the database
    const evaluationJob = await prisma.evaluationJob.create({
      data: {
        jobTitle: job_title,
        cvDocumentId: cv_document_id,
        reportDocId: report_document_id,
        status: JobStatus.QUEUED,
      },
    });

    logger.info("Evaluation job created", { jobId: evaluationJob.id });

    // Prepare job data for the evaluation queue
    const jobData: EvaluationJobData = {
      jobId: evaluationJob.id,
      jobTitle: job_title,
      cvDocumentId: cv_document_id,
      reportDocId: report_document_id,
    };

    // Add the job to the evaluation queue with retry and cleanup options
    await evaluationQueue.add(QUEUE_NAME, jobData, {
      attempts: ATTEMPTS_RETRY,
      backoff: {
        type: "exponential",
        delay: EXPONENTIAL_BACKOFF_DELAY,
      },
      removeOnComplete: REMOVE_ON_COMPLETE,
      removeOnFail: REMOVE_ON_FAIL,
    });

    logger.info("Job queued successfully", { jobId: evaluationJob.id });

    // Respond with the created job's ID and status
    return res
      .status(202)
      .json({ id: evaluationJob.id, status: evaluationJob.status });
  } catch (error) {
    logger.error("Error creating evaluation job", {
      error: error instanceof Error ? error.message : error,
    });
    return res.status(500).json({
      error: "An error occurred while creating the evaluation job.",
    });
  }
});

export default router;
