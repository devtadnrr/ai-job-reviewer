import { Type } from "@google/genai";

/**
 * LLM's Structured output schema for parsing project reports into structured JSON format.
 * This schema defines the expected structure and data types for various sections of a project report,
 * including project overview, technical implementation, features, code structure, documentation,
 * additional features, improvements, and lessons learned.
 * Each section has its own set of required fields to ensure completeness of the parsed data.
 */
export const projectParseSchema = {
  type: Type.OBJECT,
  properties: {
    projectOverview: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        description: { type: Type.STRING },
        objectives: { type: Type.ARRAY, items: { type: Type.STRING } },
        approach: { type: Type.STRING },
      },
      required: ["title", "description"],
    },
    technicalImplementation: {
      type: Type.OBJECT,
      properties: {
        technologies: { type: Type.ARRAY, items: { type: Type.STRING } },
        architecture: { type: Type.STRING },
        designDecisions: { type: Type.ARRAY, items: { type: Type.STRING } },
        challenges: { type: Type.ARRAY, items: { type: Type.STRING } },
        solutions: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ["technologies"],
    },
    features: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          feature: { type: Type.STRING },
          description: { type: Type.STRING },
          implementation: { type: Type.STRING },
        },
        required: ["feature", "description"],
      },
    },
    codeStructure: {
      type: Type.OBJECT,
      properties: {
        structure: { type: Type.STRING },
        patterns: { type: Type.ARRAY, items: { type: Type.STRING } },
        bestPractices: { type: Type.ARRAY, items: { type: Type.STRING } },
        testing: { type: Type.STRING },
      },
    },
    documentation: {
      type: Type.OBJECT,
      properties: {
        hasReadme: { type: Type.BOOLEAN },
        setupInstructions: { type: Type.BOOLEAN },
        apiDocumentation: { type: Type.BOOLEAN },
        codeComments: { type: Type.BOOLEAN },
        tradeoffs: { type: Type.STRING },
      },
      required: ["hasReadme"],
    },
    additionalFeatures: { type: Type.ARRAY, items: { type: Type.STRING } },
    improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
    lessons: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ["projectOverview", "technicalImplementation", "features"],
} as const;

/**
 * LLM's Structured output schema for evaluating project reports based on a scoring rubric.
 * This schema defines the expected structure for the evaluation results of a project report,
 * including a project score (from 1 to 5) and detailed feedback.
 * The project score indicates how well the project aligns with the job requirements,
 * while the feedback provides insights for HR to assess the candidate's fit for the role.
 */
export const projectEvaluationSchema = {
  type: Type.OBJECT,
  properties: {
    projectScore: { type: Type.NUMBER, minimum: 1, maximum: 5 },
    projectFeedback: { type: Type.STRING },
  },
  required: ["projectScore", "projectFeedback"],
} as const;
