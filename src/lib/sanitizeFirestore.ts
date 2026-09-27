/**
 * Recursively removes any `undefined` values from an object before passing to Firestore
 * setDoc or updateDoc, preventing 'Unsupported field value: undefined' errors.
 */
export function sanitizeFirestore<T>(data: T): T {
  if (data === undefined || data === null) {
    return data;
  }

  if (Array.isArray(data)) {
    return data
      .map((item) => sanitizeFirestore(item))
      .filter((item) => item !== undefined) as unknown as T;
  }

  if (typeof data === 'object') {
    // Keep special instances untouched (Dates, FieldValues like serverTimestamp())
    const proto = Object.getPrototypeOf(data);
    if (proto !== Object.prototype && proto !== null) {
      return data;
    }

    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(data as Record<string, any>)) {
      if (value !== undefined) {
        sanitized[key] = sanitizeFirestore(value);
      }
    }
    return sanitized as T;
  }

  return data;
}
