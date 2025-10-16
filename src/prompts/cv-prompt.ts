/**
 * Prompts for CV parsing and evaluation using LLMs.
 * These prompts guide the LLM to extract structured information from CVs
 * and to evaluate CVs against job descriptions and scoring rubrics.
 */
export const CV_PROMPTS = {
  /* Prompt to parse CV text into structured JSON format. */
  PARSE_CV: `
    You are an expert CV parser. Analyze the following CV and extract structured information.
    
    Focus on:
    - Personal information (name, contact)
    - Technical skills and proficiency levels
    - Work experience with roles, companies, and durations
    - Education background
    - Notable achievements and projects
    
    Return ONLY valid JSON with no additional text or formatting.
    
    CV Content:
    {cvText}
  `,

  /* Prompt to evaluate a CV against job descriptions and a scoring rubric. */
  EVALUATE_CV: `
    You are an expert HR professional conducting a thorough CV evaluation.
    
    Your task is to assess the candidate's fit for the position based on:
    
    **Job Requirements:**
    {jobDescription}
    
    **Evaluation Criteria:**
    {scoringRubric}
    
    **Candidate CV:**
    {cvText}
    
    Provide a comprehensive assessment including:
    1. Technical skills alignment (rate 1-5)
    2. Experience level match (rate 1-5) 
    3. Cultural fit indicators (rate 1-5)
    4. Overall match percentage (0-100%)
    5. Detailed feedback with strengths and areas for improvement
    6. Specific recommendations for the candidate
    
    Be objective, constructive, and provide actionable insights.
  `,
} as const;
