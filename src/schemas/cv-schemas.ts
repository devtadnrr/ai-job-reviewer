import { Type } from "@google/genai";

/**
 * LLM's Structured output schema for parsing CVs into structured JSON format.
 * This schema defines the expected structure and data types for various sections of a CV,
 * including personal information, skills, work experience, education, projects, certifications,
 * total years of experience, and languages.
 * Each section has its own set of required fields to ensure completeness of the parsed data.
 */
export const cvParseSchema = {
  type: Type.OBJECT,
  properties: {
    personalInfo: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        email: { type: Type.STRING },
        phone: { type: Type.STRING },
        location: { type: Type.STRING },
      },
      required: ["name"],
    },
    skills: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING },
          skill: { type: Type.STRING },
          proficiency: { type: Type.STRING },
          yearsExperience: { type: Type.NUMBER },
        },
        required: ["skill", "proficiency"],
      },
    },
    workExperience: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          company: { type: Type.STRING },
          position: { type: Type.STRING },
          duration: { type: Type.STRING },
          startDate: { type: Type.STRING },
          endDate: { type: Type.STRING },
          responsibilities: { type: Type.ARRAY, items: { type: Type.STRING } },
          achievements: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["company", "position", "duration"],
      },
    },
    education: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          institution: { type: Type.STRING },
          degree: { type: Type.STRING },
          field: { type: Type.STRING },
          graduationYear: { type: Type.NUMBER },
          gpa: { type: Type.STRING },
        },
        required: ["institution", "degree"],
      },
    },
    projects: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          technologies: { type: Type.ARRAY, items: { type: Type.STRING } },
          role: { type: Type.STRING },
          duration: { type: Type.STRING },
        },
        required: ["name", "description"],
      },
    },
    certifications: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          issuer: { type: Type.STRING },
          dateObtained: { type: Type.STRING },
          expiryDate: { type: Type.STRING },
        },
        required: ["name", "issuer"],
      },
    },
    totalYearsExperience: { type: Type.NUMBER },
    languages: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: [
    "personalInfo",
    "skills",
    "workExperience",
    "totalYearsExperience",
  ],
} as const;

/**
 * LLM's Structured output schema for evaluating CVs based on a scoring rubric.
 * This schema defines the expected structure for the evaluation results of a CV,
 * including a match rate (as a percentage between 0 and 1) and detailed feedback.
 * The match rate indicates how well the CV aligns with the job requirements,
 * while the feedback provides insights for HR to assess the candidate's fit for the role.
 */
export const cvEvaluationSchema = {
  type: Type.OBJECT,
  properties: {
    cvMatchRate: {
      type: Type.NUMBER,
      minimum: 0,
      maximum: 1,
      description:
        "CV match rate as a percentage (0-1). Based on the scoring rubric scoring criteria.",
    },

    cvFeedback: {
      type: Type.STRING,
      description:
        "Detailed feedback on the CV for HR to assess if this candidate fits the role.",
    },
  },
  required: ["cvMatchRate", "cvFeedback"],
} as const;
