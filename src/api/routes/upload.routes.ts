import express, { Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import {
  handleMulterError,
  validateFiles,
} from "../middlewares/upload.middleware";
import { prisma } from "../../utils/prisma-client";
import { DocumentType } from "../../generated/prisma";

const router = express.Router();

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../../uploads");
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed!"));
    }
  },
});

router.post(
  "/upload",
  upload.fields([
    { name: "cv", maxCount: 1 },
    { name: "project_report", maxCount: 1 },
  ]),
  handleMulterError,
  validateFiles,
  async (req: Request, res: Response) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      if (!files?.cv || !files?.project_report) {
        return res.status(400).json({
          error: "Both CV and Project Report files are required.",
        });
      }

      if (!files.cv[0] || !files.project_report[0]) {
        return res.status(400).json({
          error: "Invalid file upload. Please ensure both files are provided.",
        });
      }

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
      console.error("Error uploading files:", error);
      return res.status(500).json({
        error: "An error occurred while uploading files.",
      });
    }
  },
);

export default router;
