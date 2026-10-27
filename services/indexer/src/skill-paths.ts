/**
 * Parse the comma-separated `skill_path` stored on add requests.
 *
 * A root-level SKILL.md is stored as "." by the add-request API so it is not
 * mistaken for a missing path. The indexer expects an empty string for the
 * repository root.
 */
export function parseAddRequestSkillPaths(raw: string): string[] {
  return raw
    .split(',')
    .map((path) => path.trim())
    .filter(Boolean)
    .map((path) => (path === '.' ? '' : path));
}
