export { CV_PROMPTS } from "./cv-prompt";
export { PROJECT_PROMPTS } from "./project-prompt";

/**
 * Utility function to build prompts by replacing placeholders with actual values.
 * @param template The prompt template containing placeholders in {key} format.
 * @param variables An object mapping placeholder keys to their replacement values.
 * @returns The final prompt string with all placeholders replaced.
 */
export function buildPrompt(
  template: string,
  variables: Record<string, string>,
): string {
  return template.replace(/{(\w+)}/g, (match, key) => {
    return variables[key] || match;
  });
}
