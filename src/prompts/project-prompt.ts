/**
 * Prompts for project report parsing and evaluation using LLMs.
 * These prompts guide the LLM to extract structured information from project reports
 * and to evaluate projects against case study briefs and scoring rubrics.
 */
export const PROJECT_PROMPTS = {
  /* Prompt to parse project report text into structured JSON format. */
  PARSE_REPORT: `
    You are an expert software engineer skilled in analyzing and summarizing project reports.
    
    Given the following project report, extract and structure the key information into a JSON format, focus on:
    1. Project Overview
    2. Technical Implementation
    3. Features
    4. Code Structure
    5. Documentation
    6. Additional Features
    7. Improvements Made
    8. Lessons Learned
  `,

  /* Prompt to evaluate a project report against a case study brief and a scoring rubric. */
  EVALUATE_PROJECT: `
    You are a senior software architect evaluating a candidate's project submission.
    
    **Project Brief & Requirements:**
    {caseStudyBrief}
    
    **Evaluation Rubric:**
    {scoringRubric}
    
    **Candidate's Project Report:**
    {projectReportText}
    
    Evaluate the project based on:
    1. **Requirements Fulfillment** - How well does it meet the brief?
    2. **Technical Implementation** - Code quality, architecture decisions
    3. **Documentation Quality** - Clarity, completeness, professionalism
    4. **Problem-Solving Approach** - Logical thinking, creativity
    5. **Error Handling & Resilience** - Robustness of the solution
    
    Provide:
    - Overall score (1-5)
    - Detailed feedback for each evaluation criterion
    - Specific examples from their submission
    - Actionable recommendations for improvement
  `,
} as const;
