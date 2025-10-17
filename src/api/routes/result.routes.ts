import express, { Request, Response } from "express";
import { prisma } from "../../utils/prisma-client";

const router = express.Router();

/**
 * GET /result/:jobId
 * Fetches the evaluation result for a given job ID.
 * Returns job status and results if available.
 */
router.get("/result/:jobId", async (req: Request, res: Response) => {
  try {
    // Extract jobId from request parameters
    const { jobId } = req.params;

    // Fetch the evaluation job along with its result and associated documents
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

    // If job not found, return 404
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    // Respond with job details and results
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
