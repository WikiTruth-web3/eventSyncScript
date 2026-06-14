/**
 * Convert ISO timestamp string to Unix timestamp (seconds)
 * If timestamp is invalid or undefined, return 0
 */
export function timestampToNumber(timestamp?: string | null): number {
  if (!timestamp) return 0
  const time = new Date(timestamp).getTime()
  return isNaN(time) ? 0 : Math.floor(time / 1000)
}
