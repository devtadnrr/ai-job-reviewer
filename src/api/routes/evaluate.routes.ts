import express, { Request, Response } from "express";
import { prisma } from "../../utils/prisma-client";
import { JobStatus } from "../../generated/prisma";
import {
  EvaluationJobData,
  evaluationQueue,
} from "../../jobs/evaluation-queue";
import { QUEUE_NAME } from "../../utils/constants";

const router = express.Router();

router.post("/evaluate", async (req: Request, res: Response) => {
  try {
    const { job_title, cv_document_id, report_document_id } = req.body;

    if (!job_title || !cv_document_id || !report_document_id) {
      return res.status(400).json({
        error:
          "job_title, cv_document_id, and report_document_id are required.",
      });
    }

    const [cvDoc, reportDoc] = await Promise.all([
      prisma.document.findUnique({ where: { id: cv_document_id } }),
      prisma.document.findUnique({ where: { id: report_document_id } }),
    ]);

    if (!cvDoc || !reportDoc) {
      return res.status(404).json({
        error: "One or both of the specified documents were not found.",
      });
    }

    const evaluationJob = await prisma.evaluationJob.create({
      data: {
        jobTitle: job_title,
        cvDocumentId: cv_document_id,
        reportDocId: report_document_id,
        status: JobStatus.QUEUED,
      },
    });

    const jobData: EvaluationJobData = {
      jobId: evaluationJob.id,
      jobTitle: job_title,
      cvDocumentId: cv_document_id,
      reportDocId: report_document_id,
    };

    const queueJob = await evaluationQueue.add(QUEUE_NAME, jobData, {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
      removeOnComplete: 10,
      removeOnFail: 50,
    });

    console.log(
      `📤 Queued evaluation job: ${evaluationJob.id} (Queue ID: ${queueJob.id})`,
    );

    return res
      .status(202)
      .json({ id: evaluationJob.id, status: evaluationJob.status });
  } catch (error) {
    console.error("Evaluate error:", error);
    return res.status(500).json({
      error: "An error occurred while creating the evaluation job.",
    });
  }
});

router.get("/result/:jobId", async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;

    const job = await prisma.evaluationJob.findUnique({
      where: { id: jobId },
      include: {
        result: true,
        cvDocument: {
          select: { filename: true },
        },
        reportDocument: {
          select: { filename: true },
        },
      },
    });

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    res.json({
      jobId: job.id,
      status: job.status,
      result: job.result
        ? {
            cv_match_rate: job.result.cvMatchRate,
            cv_feedback: job.result.cvFeedback,
            project_score: job.result.projectScore,
            project_feedback: job.result.projectFeedback,
            overall_summary: job.result.overallSummary,
          }
        : null,
    });
  } catch (error) {
    console.error("Error fetching job status:", error);
    res.status(500).json({
      error: "Failed to fetch job status",
    });
  }
});

export default router;
