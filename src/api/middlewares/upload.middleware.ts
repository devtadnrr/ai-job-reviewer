import { NextFunction, Request, Response } from "express";
import multer from "multer";

/**
 * Middleware to handle Multer errors during file upload.
 * sends appropriate HTTP responses based on the error type.
 */
export const handleMulterError = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (error) return next();

  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case "LIMIT_FILE_SIZE":
        return res.status(400).json({
          error: "File size too large. Maximum allowed size is 10MB.",
        });
      case "LIMIT_UNEXPECTED_FILE":
        return res.status(400).json({
          error:
            "Unexpected file field. Only 'cv' and 'project_report' are allowed.",
        });
      default:
        return res.status(400).json({ error: error.message });
    }
  }

  return res.status(400).json({ error: error.message });
};

/**
 * Middleware to validate presence of required files in the upload request.
 * Ensures both 'cv' and 'project_report' files are provided.
 */
export const validateFiles = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
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

  next();
};
