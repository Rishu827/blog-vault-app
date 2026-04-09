const WPM = 238;
const CODE_WEIGHT = 0.4;

/**
 * Calculates estimated reading time for MDX/Markdown content.
 * - Prose words counted at full weight.
 * - Code block words counted at 0.4x (readers scan, not read).
 * - Always rounds up, minimum 1 minute.
 */
export function calculateReadingTime(content: string): number {
  // Extract fenced code blocks (``` or ~~~)
  const fencedCodeRegex = /(`{3,}|~{3,})[\s\S]*?\1/g;
  const codeBlocks = content.match(fencedCodeRegex) ?? [];

  // Remove code blocks from prose
  const prose = content.replace(fencedCodeRegex, ' ');

  // Count prose words
  const proseWordCount = (prose.match(/\S+/g) ?? []).length;

  // Count code words (at reduced weight)
  const codeWordCount = codeBlocks.reduce((sum, block) => {
    return sum + (block.match(/\S+/g) ?? []).length;
  }, 0);

  const weightedWords = proseWordCount + codeWordCount * CODE_WEIGHT;
  return Math.max(1, Math.ceil(weightedWords / WPM));
}

/**
 * Formats reading time as "X min read".
 */
export function formatReadingTime(minutes: number): string {
  return `${minutes} min read`;
}
