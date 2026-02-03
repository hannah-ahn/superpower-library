interface LogContext {
  userId?: string
  assetId?: string
  [key: string]: unknown
}

export function logError(error: Error, context?: LogContext) {
  console.error(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: error.message,
      stack: error.stack,
      ...context,
    })
  )
}

export function logInfo(message: string, context?: LogContext) {
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      ...context,
    })
  )
}

export function logWarn(message: string, context?: LogContext) {
  console.warn(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      ...context,
    })
  )
}
