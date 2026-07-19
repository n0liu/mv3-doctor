/** Single source of truth for external URLs and magic strings. */

export const REPO_URL = "https://github.com/n0liu/mv3-doctor";

export const DOCS_BASE_URL = `${REPO_URL}/blob/main/docs/rules`;

/** Every rule's docs page is derived from its id, so rules never hardcode a URL. */
export const docsUrlFor = (ruleId: string): string => `${DOCS_BASE_URL}/${ruleId}.md`;

/** Inline comment that suppresses findings on the following line. */
export const DISABLE_NEXT_LINE = "mv3-doctor-disable-next-line";

/** Inline comment that suppresses findings for the whole file. */
export const DISABLE_FILE = "mv3-doctor-disable-file";

/** File extensions we attempt to parse as JavaScript. */
export const SCRIPT_EXTENSIONS = [".js", ".mjs", ".cjs"] as const;
