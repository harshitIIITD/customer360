"use client"

import React from "react"

import { useState, useEffect } from "react"
import { AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface ErrorFallbackProps {
  error: Error
  resetErrorBoundary: () => void
}

function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          Something went wrong
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription className="mt-2">
            <div className="font-mono text-sm overflow-auto max-h-[200px] p-2 bg-muted rounded-md">{error.message}</div>
          </AlertDescription>
        </Alert>
        <p className="text-muted-foreground">Please try again or contact support if the problem persists.</p>
      </CardContent>
      <CardFooter>
        <Button onClick={resetErrorBoundary} className="w-full">
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      </CardFooter>
    </Card>
  )
}

export function ErrorBoundary({ children, fallback, onError }: ErrorBoundaryProps) {
  const [error, setError] = useState<Error | null>(null)
  const [errorInfo, setErrorInfo] = useState<React.ErrorInfo | null>(null)

  useEffect(() => {
    if (error && errorInfo && onError) {
      onError(error, errorInfo)
    }
  }, [error, errorInfo, onError])

  if (error) {
    return fallback ? <>{fallback}</> : <ErrorFallback error={error} resetErrorBoundary={() => setError(null)} />
  }

  return (
    <ErrorCatcher
      onError={(error, errorInfo) => {
        setError(error)
        setErrorInfo(errorInfo)
      }}
    >
      {children}
    </ErrorCatcher>
  )
}

class ErrorCatcher extends React.Component<{
  children: React.ReactNode
  onError: (error: Error, errorInfo: React.ErrorInfo) => void
}> {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.props.onError(error, errorInfo)
  }

  render() {
    return this.props.children
  }
}
