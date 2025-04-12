import { openai } from "@ai-sdk/openai"
import { generateText } from "ai"

// Fallback responses for when AI is unavailable
const fallbackResponses = {
  dataProduct:
    "Based on the use case, I recommend creating a Customer 360 data product that integrates customer information from multiple sources. This should include basic profile information, transaction history, support interactions, and preference data.",
  sourceSystem:
    "Potential source systems include: CRM systems (Salesforce, Microsoft Dynamics), ERP systems (SAP, Oracle), Customer Support platforms (Zendesk, ServiceNow), and Marketing Automation tools (Marketo, HubSpot).",
  certification:
    "Recommended certification steps: 1) Verify data completeness, 2) Validate data accuracy, 3) Check for proper data transformations, 4) Ensure compliance with data governance policies, 5) Confirm data lineage documentation.",
  schema: `{
    "name": "Customer360",
    "description": "Comprehensive view of customer data",
    "attributes": [
      {
        "name": "customer_id",
        "type": "string",
        "description": "Unique identifier for the customer"
      },
      {
        "name": "full_name",
        "type": "string",
        "description": "Customer's full name"
      },
      {
        "name": "email",
        "type": "string",
        "description": "Customer's email address"
      },
      {
        "name": "phone",
        "type": "string",
        "description": "Customer's phone number"
      },
      {
        "name": "address",
        "type": "object",
        "description": "Customer's address information"
      },
      {
        "name": "segment",
        "type": "string",
        "description": "Customer segment classification"
      },
      {
        "name": "lifetime_value",
        "type": "number",
        "description": "Customer lifetime value"
      }
    ]
  }`,
}

export async function generateAIResponse(prompt: string): Promise<string> {
  try {
    // Determine which type of response to provide based on the prompt
    if (prompt.includes("data product")) {
      return fallbackResponses.dataProduct
    } else if (prompt.includes("source system")) {
      return fallbackResponses.sourceSystem
    } else if (prompt.includes("certification")) {
      return fallbackResponses.certification
    } else if (prompt.includes("schema")) {
      return fallbackResponses.schema
    }

    // If we have an OpenAI API key, use it
    if (process.env.OPEN_API_KEY) {
      const { text } = await generateText({
        model: openai("gpt-3.5-turbo"),
        prompt: prompt,
      })
      return text
    }

    // Default fallback
    return "I'm sorry, I couldn't generate a response at this time. Please try again later."
  } catch (error) {
    console.error("Error generating AI response:", error)
    return "I'm sorry, I couldn't generate a response at this time. Please try again later."
  }
}

export async function fallbackGenerateResponse(prompt: string, systemPrompt: string | undefined): Promise<string> {
  // This is a placeholder - replace with actual fallback logic if needed
  return generateAIResponse(prompt)
}

export async function streamAIResponse(prompt: string, systemPrompt: string | undefined): Promise<any> {
  // This is a placeholder - replace with actual streaming logic
  return {
    toDataStreamResponse: () => ({
      pipeTo: async () => {
        // Mock implementation
        return Promise.resolve()
      },
    }),
  }
}
