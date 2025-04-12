import { NextResponse } from "next/server"
import { analyzeRequirements, generateDataSchema, identifySourceSystems } from "@/lib/ai-service"

export async function POST(request: Request) {
  try {
    const { action, requirements } = await request.json()

    if (!requirements) {
      return NextResponse.json({ error: "Requirements are required" }, { status: 400 })
    }

    let result

    switch (action) {
      case "analyze":
        result = await analyzeRequirements(requirements)
        break
      case "generate-schema":
        result = await generateDataSchema(requirements)
        break
      case "identify-sources":
        result = await identifySourceSystems(requirements)
        break
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    return NextResponse.json({ result })
  } catch (error) {
    console.error("Error in AI designer route:", error)
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 })
  }
}
