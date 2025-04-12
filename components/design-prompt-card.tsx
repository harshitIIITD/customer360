"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Copy, Play } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface DesignPromptCardProps {
  title: string
  description: string
  icon: React.ReactNode
  template: string
  platforms: string[]
  onUse: (template: string) => void
}

export function DesignPromptCard({ title, description, icon, template, platforms, onUse }: DesignPromptCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isRunning, setIsRunning] = useState(false)

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(template)
    toast({
      title: "Copied to clipboard",
      description: "The prompt template has been copied to your clipboard.",
    })
  }

  const handleRun = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsRunning(true)

    // Simulate code execution
    setTimeout(() => {
      setIsRunning(false)
      toast({
        title: "Template Executed",
        description: `The ${title} template has been executed successfully.`,
      })
      // Use the template
      onUse(template)
    }, 1500)
  }

  return (
    <Card
      className={`cursor-pointer transition-all duration-200 ${
        isHovered ? "border-primary shadow-lg transform scale-[1.02]" : "border shadow-sm"
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onUse(template)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-primary/10 p-1.5 text-primary">{icon}</div>
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-3">{description}</p>
        <div className="flex flex-wrap gap-2 mb-2">
          {platforms.map((platform) => (
            <Badge key={platform} variant="outline" className="bg-primary/5">
              {platform}
            </Badge>
          ))}
        </div>
      </CardContent>
      <CardFooter className="border-t pt-3 flex justify-between">
        <Button variant="ghost" size="sm" onClick={handleCopy}>
          <Copy className="h-3.5 w-3.5 mr-1" />
          Copy
        </Button>
        <Button variant="ghost" size="sm" onClick={handleRun} disabled={isRunning}>
          {isRunning ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-1 h-3.5 w-3.5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Running...
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5 mr-1" />
              Run
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
