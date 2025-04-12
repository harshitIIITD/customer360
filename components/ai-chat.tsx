"use client"

import { useState, useEffect, useRef } from "react"
import { Bot, User, Loader2, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"

interface Message {
  role: "user" | "assistant"
  content: string
}

interface AIChatProps {
  requirements: string
  onGenerateSchema: () => void
}

export function AIChat({ requirements, onGenerateSchema }: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (requirements && messages.length === 0) {
      // Add the user's requirements as the first message
      setMessages([
        {
          role: "user",
          content: requirements,
        },
      ])

      // Simulate AI response
      setLoading(true)
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `I understand you're looking to create a Customer 360 data product. Based on your requirements, I would recommend starting with a core customer profile that includes basic personal information, contact details, and account relationships. Would you like me to help you design the schema for this data product?`,
          },
        ])
        setLoading(false)
      }, 1500)
    }
  }, [requirements])

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  const handleGenerateJsonSchema = () => {
    setLoading(true)
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: "Generate a JSON schema for a Customer 360 data product based on our conversation.",
      },
    ])

    // Simulate AI response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `I've generated a schema based on our conversation. You can view and edit it in the Schema tab.`,
        },
      ])
      setLoading(false)
      onGenerateSchema()
    }, 2000)
  }

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content)
    toast({
      title: "Copied to clipboard",
      description: "The message has been copied to your clipboard.",
    })
  }

  return (
    <div className="flex flex-col h-[400px]">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex gap-3 group ${
              message.role === "assistant" ? "bg-primary/5 p-4 rounded-lg border border-primary/10" : "p-4"
            }`}
          >
            {message.role === "assistant" ? (
              <Bot className="h-8 w-8 mt-1 text-primary shrink-0" />
            ) : (
              <User className="h-8 w-8 mt-1 text-muted-foreground shrink-0" />
            )}
            <div className="flex-1 relative">
              <p className="text-sm leading-relaxed">{message.content}</p>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
                onClick={() => handleCopyMessage(message.content)}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3 bg-primary/5 p-4 rounded-lg border border-primary/10">
            <Bot className="h-8 w-8 mt-1 text-primary shrink-0" />
            <div className="flex items-center">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <p className="text-sm text-muted-foreground">Thinking...</p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {messages.length > 0 && !loading && (
        <div className="p-4 border-t bg-muted/20 flex justify-center">
          <Button onClick={handleGenerateJsonSchema} className="bg-primary hover:bg-primary/90">
            Generate a JSON schema for a Customer 360 data product
          </Button>
        </div>
      )}
    </div>
  )
}
