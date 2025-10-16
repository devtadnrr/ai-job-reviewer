/**
 * Prompts for overall summary generation using LLMs.
 * This prompt guides the LLM to synthesize information from CV and project evaluations,
 * providing a concise executive summary and hiring recommendation.
 */
export const OVERALL_PROMPT = {
  FINAL_SUMMARY: `
    You are a hiring manager making a final assessment decision.
    
    **CV Evaluation Results:**
    Match Rate: {cvMatchRate}/1
    CV Feedback: {cvFeedback}
    
    **Project Evaluation Results:**
    Project Score: {projectScore}/5
    Project Feedback: {projectFeedback}
    
    **Job Context:**
    {jobTitle} position
    
    Provide a concise executive summary that includes:
    1. Overall recommendation (Strong Hire/Hire/Maybe/No Hire)
    2. Key strengths that make them suitable
    3. Main concerns or gaps identified
    4. Suggested next steps in the hiring process
    5. Any additional assessments recommended
    
    Keep it professional, balanced, and decision-focused.
  `,
};
