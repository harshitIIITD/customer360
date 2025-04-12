import { NextResponse } from "next/server"
import { fallbackGenerateResponse, streamAIResponse } from "@/lib/ai-sdk"

export async function POST(request: Request) {
  try {
    const { prompt, systemPrompt } = await request.json()

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    try {
      const stream = await streamAIResponse(prompt, systemPrompt)
      return stream.toDataStreamResponse()
    } catch (error) {
      console.error("Error streaming AI response:", error)

      // Use fallback response
      const fallbackResponse = await fallbackGenerateResponse(prompt, systemPrompt)
      return NextResponse.json({ text: fallbackResponse })
    }
  } catch (error) {
    console.error("Error in AI stream route:", error)
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 })
  }
}
