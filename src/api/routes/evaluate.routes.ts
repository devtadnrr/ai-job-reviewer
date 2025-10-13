import express, { Request, Response } from "express";
import { prisma } from "../../utils/prisma-client";
import { JobStatus } from "../../generated/prisma";
import { evaluationQueue } from "../../jobs/evaluation-queue";
import { JOB_NAME } from "../../utils/constants";

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

    const job = await prisma.evaluationJob.create({
      data: {
        jobTitle: job_title,
        cvDocumentId: cv_document_id,
        reportDocId: report_document_id,
        status: JobStatus.QUEUED,
      },
    });

    await evaluationQueue.add(JOB_NAME, {
      jobId: job.id,
      jobTitle: job.jobTitle,
      cvDocumentId: job.cvDocumentId,
      reportDocId: job.reportDocId,
    });

    return res.status(202).json({ id: job.id, status: job.status });
  } catch (error) {
    console.error("Evaluate error:", error);
    return res.status(500).json({
      error: "An error occurred while creating the evaluation job.",
    });
  }
});

export default router;
