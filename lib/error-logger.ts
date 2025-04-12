type ErrorLogLevel = "info" | "warning" | "error" | "critical"

interface ErrorLogData {
  message: string
  stack?: string
  componentStack?: string
  context?: Record<string, any>
  level: ErrorLogLevel
  timestamp: string
  url?: string
}

export async function logError(
  error: Error | string,
  level: ErrorLogLevel = "error",
  context?: Record<string, any>,
  componentStack?: string,
) {
  const errorMessage = typeof error === "string" ? error : error.message
  const errorStack = typeof error === "string" ? undefined : error.stack

  const logData: ErrorLogData = {
    message: errorMessage,
    stack: errorStack,
    componentStack,
    context,
    level,
    timestamp: new Date().toISOString(),
    url: typeof window !== "undefined" ? window.location.href : undefined,
  }

  // Log to console in development
  if (process.env.NODE_ENV === "development") {
    console.group(`[${level.toUpperCase()}] ${errorMessage}`)
    console.error(error)
    if (componentStack) console.error("Component Stack:", componentStack)
    if (context) console.info("Context:", context)
    console.groupEnd()
  }

  // In a real application, you would send this to a logging service
  try {
    // This is a mock implementation - in a real app, you would send to a logging service
    // await fetch("/api/log-error", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify(logData)
    // })

    // For now, we'll just store in localStorage for demo purposes
    if (typeof window !== "undefined") {
      const logs = JSON.parse(localStorage.getItem("error_logs") || "[]")
      logs.push(logData)
      localStorage.setItem("error_logs", JSON.stringify(logs.slice(-20))) // Keep last 20 logs
    }
  } catch (loggingError) {
    console.error("Failed to log error:", loggingError)
  }

  return logData
}

export function clearErrorLogs() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("error_logs")
  }
}

export function getErrorLogs(): ErrorLogData[] {
  if (typeof window !== "undefined") {
    return JSON.parse(localStorage.getItem("error_logs") || "[]")
  }
  return []
}
