import express, { Request, Response } from "express";
import {
  handleMulterError,
  validateFiles,
} from "../middlewares/upload.middleware";
import { prisma } from "../../utils/prisma-client";
import { DocumentType } from "../../generated/prisma";
import { upload } from "../../utils/multer";
import logger from "../../utils/logger";

const router = express.Router();

/**
 * POST /upload
 * Handles uploading of CV and project report files.
 * Expects 'cv' and 'project_report' fields in the multipart/form-data request.
 */
router.post(
  "/upload",
  upload.fields([
    { name: "cv", maxCount: 1 },
    { name: "project_report", maxCount: 1 },
  ]),
  handleMulterError, // Middleware to handle Multer errors
  validateFiles, // Middleware to validate uploaded files
  async (req: Request, res: Response) => {
    try {
      // Access the uploaded files
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      // Save file metadata to the database
      const [cvDoc, reportDoc] = await Promise.all([
        prisma.document.create({
          data: {
            filename: files.cv[0].filename,
            filepath: files.cv[0].path,
            filetype: DocumentType.CV,
          },
        }),
        prisma.document.create({
          data: {
            filename: files.project_report[0].filename,
            filepath: files.project_report[0].path,
            filetype: DocumentType.PROJECT_REPORT,
          },
        }),
      ]);

      // Respond with the document IDs and filenames
      return res.status(201).json({
        cv: {
          id: cvDoc.id,
          filename: cvDoc.filename,
        },
        project_report: {
          id: reportDoc.id,
          filename: reportDoc.filename,
        },
      });
    } catch (error) {
      logger.error("Error uploading files:", error);
      return res.status(500).json({
        error: "An error occurred while uploading files.",
      });
    }
  },
);

export default router;
