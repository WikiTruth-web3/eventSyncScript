/**
 * BigInt serialization helper function
 */
export const serializeBigInt = (value: unknown): unknown => {
  if (typeof value === 'bigint') {
    return value.toString()
  }
  if (Array.isArray(value)) {
    return value.map(serializeBigInt)
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [key, serializeBigInt(val)])
    )
  }
  return value
}

/**
 * Recursively clean BigInt in object, convert to string or number for DB compatibility
 */
export const sanitizeForDb = (obj: unknown): unknown => {
  if (obj === null || obj === undefined) {
    return obj
  }
  
  if (typeof obj === 'bigint') {
    return obj.toString()
  }
  
  if (typeof obj === 'number') {
    if (!Number.isSafeInteger(obj)) {
      return obj.toString()
    }
    return obj
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForDb)
  }
  
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      result[key] = sanitizeForDb(value)
    }
    return result
  }
  
  return obj
}

