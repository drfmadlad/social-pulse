/** A non-empty string no longer than `maxLength` — the shape every capped request field shares. */
export function isBoundedString(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= maxLength;
}
