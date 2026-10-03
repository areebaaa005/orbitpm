/** Escapes user input so it can be used literally inside a RegExp / Mongo $regex. */
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
