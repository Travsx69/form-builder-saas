/**
 * Checkbox selections are stored as a JSON array (see the public submit route).
 * Responses written before that used `Array.prototype.toString()`, which joins
 * with commas and is ambiguous when an option label itself contains a comma.
 */
export function parseCheckboxValue(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map(String);
    }
  } catch {
    // Not JSON — legacy comma-joined storage.
  }
  return raw
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}
