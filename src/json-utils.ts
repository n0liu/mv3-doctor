/** Type guards for untrusted JSON, shared by the loader and manifest rules. */

export const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

export const asStringArray = (value: unknown): readonly string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

/**
 * Best-effort line number for a top-level manifest key, so findings can point
 * at a line instead of just the file.
 */
export const lineOfKey = (raw: string, key: string): number | undefined => {
  const needle = `"${key}"`;
  const index = raw.split(/\r?\n/).findIndex((line) => line.includes(needle));
  return index === -1 ? undefined : index + 1;
};
