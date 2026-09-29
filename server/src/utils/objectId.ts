/** True only for a 24-char hex string (a well-formed Mongo ObjectId). */
export function isObjectId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);
}
