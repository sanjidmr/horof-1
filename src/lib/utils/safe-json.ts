/**
 * Safe JSON parsing utilities.
 * Never throws — returns a fallback value on invalid/empty input.
 */

/**
 * Safely parse a JSON string. Returns `fallback` (default `null`) on
 * empty strings, null/undefined input, or invalid JSON.
 */
export function safeJsonParse<T = unknown>(value: string | null | undefined, fallback: T | null = null): T | null {
  if (value == null || value === '') return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

/**
 * Safely parse a JSON string and validate it's an object (not array, not null).
 * Returns `fallback` (default `{}`) on failure.
 */
export function safeJsonParseObject<T extends Record<string, unknown>>(
  value: string | null | undefined,
  fallback: T | null = null
): T | null {
  const parsed = safeJsonParse<T>(value, null);
  if (parsed == null) return fallback;
  if (typeof parsed !== 'object' || Array.isArray(parsed)) return fallback;
  return parsed;
}

/**
 * Safely parse a JSON string and validate it's an array.
 * Returns `fallback` (default `[]`) on failure.
 */
export function safeJsonParseArray<T = unknown>(
  value: string | null | undefined,
  fallback: T[] = []
): T[] {
  const parsed = safeJsonParse<T[]>(value, null);
  if (parsed == null) return fallback;
  if (!Array.isArray(parsed)) return fallback;
  return parsed;
}

/**
 * Validate that a value is a plain object (not null, not array, not primitive).
 * Useful for validating JSONB values from the database.
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Merge a stored settings object with defaults, safely.
 * Only copies own enumerable properties that are not null/undefined.
 * Returns a new object — never mutates inputs.
 */
export function mergeSettingsWithDefaults<T extends Record<string, unknown>>(
  stored: unknown,
  defaults: T
): T {
  const result = { ...defaults } as Record<string, unknown>;
  if (isPlainObject(stored)) {
    for (const [key, value] of Object.entries(stored)) {
      if (value !== null && value !== undefined) {
        result[key] = value;
      }
    }
  }
  return result as T;
}