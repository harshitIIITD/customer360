import { render, screen, fireEvent } from "@testing-library/react"
import "@testing-library/jest-dom"
import { AIChatAssistant } from "@/components/ai-chat-assistant"

// Mock the useChat hook
jest.mock("ai/react", () => ({
  useChat: () => ({
    messages: [],
    input: "",
    handleInputChange: jest.fn(),
    handleSubmit: jest.fn(),
    isLoading: false,
    error: null,
    reload: jest.fn(),
    stop: jest.fn(),
  }),
}))

describe("AIChatAssistant", () => {
  it("renders the chat assistant with default props", () => {
    render(<AIChatAssistant />)

    expect(screen.getByText("AI Assistant")).toBeInTheDocument()
    expect(screen.getByText("Ask questions about data products and get AI-powered assistance.")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("Ask a question...")).toBeInTheDocument()
  })

  it("renders the chat assistant with custom props", () => {
    render(<AIChatAssistant title="Custom Title" description="Custom description" />)

    expect(screen.getByText("Custom Title")).toBeInTheDocument()
    expect(screen.getByText("Custom description")).toBeInTheDocument()
  })

  it("expands and minimizes the chat assistant", () => {
    render(<AIChatAssistant />)

    // Initially not expanded
    expect(screen.getByText("Expand")).toBeInTheDocument()

    // Click expand button
    fireEvent.click(screen.getByText("Expand"))

    // Should now show minimize button
    expect(screen.getByText("Minimize")).toBeInTheDocument()

    // Click minimize button
    fireEvent.click(screen.getByText("Minimize"))

    // Should show expand button again
    expect(screen.getByText("Expand")).toBeInTheDocument()
  })
})
