import { openai } from "@ai-sdk/openai"
import { generateText } from "ai"

// Define the system prompt for the AI
const SYSTEM_PROMPT = `
You are an AI assistant specialized in designing data products for Customer 360 applications.
Your goal is to help users define, design, and create comprehensive data products.
When analyzing requirements, focus on:
1. Core entities and attributes needed
2. Relationships between entities
3. Data types and constraints
4. Source systems that might contain this data
5. Data quality and governance considerations

Provide specific, actionable recommendations based on best practices in data modeling.
`

export async function analyzeRequirements(requirements: string): Promise<string> {
  try {
    if (!process.env.OPEN_API_KEY) {
      return getFallbackResponse("requirements")
    }

    const { text } = await generateText({
      model: openai("gpt-4o"),
      prompt: requirements,
      system: SYSTEM_PROMPT,
    })

    return text
  } catch (error) {
    console.error("Error analyzing requirements:", error)
    return getFallbackResponse("requirements")
  }
}

export async function generateDataSchema(requirements: string): Promise<any> {
  try {
    if (!process.env.OPEN_API_KEY) {
      return getFallbackSchema()
    }

    const schemaPrompt = `
      Based on these requirements: "${requirements}"
      
      Generate a JSON schema for a Customer 360 data product. The schema should include all necessary attributes, data types, and relationships. Format your response as a valid JSON object that follows JSON Schema standards.
    `

    const { text } = await generateText({
      model: openai("gpt-4o"),
      prompt: schemaPrompt,
      system: SYSTEM_PROMPT,
    })

    try {
      // Try to parse the response as JSON
      return JSON.parse(text)
    } catch (e) {
      // If parsing fails, return the fallback schema
      console.error("Error parsing AI-generated schema:", e)
      return getFallbackSchema()
    }
  } catch (error) {
    console.error("Error generating schema:", error)
    return getFallbackSchema()
  }
}

export async function identifySourceSystems(requirements: string): Promise<string> {
  try {
    if (!process.env.OPEN_API_KEY) {
      return getFallbackResponse("sources")
    }

    const { text } = await generateText({
      model: openai("gpt-4o"),
      prompt: `Identify potential source systems for this data product: "${requirements}"`,
      system: SYSTEM_PROMPT,
    })

    return text
  } catch (error) {
    console.error("Error identifying source systems:", error)
    return getFallbackResponse("sources")
  }
}

// Fallback responses when the API is unavailable
function getFallbackResponse(type: "requirements" | "sources" | "schema"): string {
  if (type === "requirements") {
    return "Based on your requirements, I recommend creating a Customer 360 data product that includes personal information, contact details, account relationships, and preferences. This will provide a comprehensive view of your customers for retail banking applications."
  } else if (type === "sources") {
    return "Potential source systems for this data product include: Core Banking System, CRM platforms, Online Banking platforms, Mobile App databases, and Customer Service systems."
  } else {
    return "I recommend a schema with customer_id (unique identifier), personal_info (name, date of birth, etc.), contact_info (email, phone, address), account_relationships, and preferences."
  }
}

function getFallbackSchema(): any {
  return {
    name: "Customer Profile",
    description: "Core customer profile information for retail banking customers",
    attributes: [
      {
        name: "customer_id",
        displayName: "Customer ID",
        description: "Unique identifier for the customer",
        dataType: "string",
        required: true,
        pii: false,
      },
      {
        name: "full_name",
        displayName: "Full Name",
        description: "Customer's full legal name",
        dataType: "string",
        required: true,
        pii: true,
      },
      {
        name: "email",
        displayName: "Email Address",
        description: "Primary email address for communications",
        dataType: "string",
        required: true,
        pii: true,
      },
      {
        name: "phone_number",
        displayName: "Phone Number",
        description: "Primary contact phone number",
        dataType: "string",
        required: false,
        pii: true,
      },
      {
        name: "address",
        displayName: "Mailing Address",
        description: "Physical mailing address",
        dataType: "object",
        required: false,
        pii: true,
      },
    ],
  }
}
