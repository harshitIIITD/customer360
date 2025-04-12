"use client"

import type React from "react"

import { useState } from "react"
import { Sparkles, MessageSquare, Code, Zap, Layers, Database, Server, Globe, Cpu } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { WorkflowProgress } from "@/components/ui/workflow-progress"
import { AIChat } from "@/components/ai-chat"
import { SchemaGenerator } from "@/components/schema-generator"
import { AttributeEditor } from "@/components/attribute-editor"
import { DesignPromptCard } from "@/components/design-prompt-card"
import { AgentCollaborationPanel } from "@/components/agent-collaboration-panel"
import { toast } from "@/components/ui/use-toast"

export default function AIDesignerPage() {
  const [requirements, setRequirements] = useState("")
  const [activeStep, setActiveStep] = useState(0)
  const [generatedSchema, setGeneratedSchema] = useState<any>(null)
  const [dataProductName, setDataProductName] = useState("Customer Profile")
  const [dataProductDescription, setDataProductDescription] = useState(
    "Core customer profile information for retail banking customers",
  )
  const [activeTab, setActiveTab] = useState("design-prompts")
  const [isLoading, setIsLoading] = useState(false)

  const workflowSteps = [
    {
      id: "define-requirements",
      label: "Define Requirements",
      description: "Describe your data product needs",
    },
    {
      id: "ai-analysis",
      label: "AI Analysis",
      description: "AI analyzes requirements",
    },
    {
      id: "generate-schema",
      label: "Generate Schema",
      description: "Create data schema",
    },
    {
      id: "review-edit",
      label: "Review & Edit",
      description: "Refine the schema",
    },
    {
      id: "create-product",
      label: "Create Data Product",
      description: "Finalize and deploy",
    },
  ]

  const designPrompts = [
    {
      id: "customer-profile",
      title: "Customer Profile Data Product",
      description:
        "Create a comprehensive customer profile with personal information, contact details, and preferences",
      icon: <Database className="h-5 w-5" />,
      template:
        "I need a Customer 360 data product for retail banking that includes personal information, contact details, and customer preferences.",
      platforms: ["CRM", "Mobile App", "Web Portal"],
    },
    {
      id: "transaction-history",
      title: "Transaction History Data Product",
      description: "Design a transaction history data product with categorization and analytics capabilities",
      icon: <Layers className="h-5 w-5" />,
      template:
        "I need a transaction history data product that includes transaction details, categorization, and supports analytics for customer spending patterns.",
      platforms: ["Banking Core", "Analytics Platform", "Mobile App"],
    },
    {
      id: "account-summary",
      title: "Account Summary Data Product",
      description: "Create an account summary with balances, status, and key metrics across all customer accounts",
      icon: <Zap className="h-5 w-5" />,
      template:
        "I need an account summary data product that provides a unified view of all customer accounts, including balances, status, and key metrics.",
      platforms: ["Banking Core", "Web Portal", "Mobile App"],
    },
    {
      id: "customer-interactions",
      title: "Customer Interactions Data Product",
      description: "Design a data product for tracking all customer interactions across channels",
      icon: <MessageSquare className="h-5 w-5" />,
      template:
        "I need a customer interactions data product that tracks all customer touchpoints across digital and physical channels, including support requests, feedback, and engagement metrics.",
      platforms: ["Call Center", "Digital Channels", "CRM"],
    },
    {
      id: "multi-platform-integration",
      title: "Multi-Platform Integration Hub",
      description: "Create a data integration hub that connects multiple platforms and systems",
      icon: <Globe className="h-5 w-5" />,
      template:
        "I need a multi-platform integration hub that connects our core banking system, CRM, digital channels, and analytics platform to provide a unified data view.",
      platforms: ["API Gateway", "Event Bus", "Data Lake", "Microservices"],
    },
    {
      id: "real-time-analytics",
      title: "Real-Time Customer Analytics",
      description: "Design a real-time analytics data product for customer behavior and insights",
      icon: <Cpu className="h-5 w-5" />,
      template:
        "I need a real-time customer analytics data product that processes customer behavior data from multiple sources and provides actionable insights.",
      platforms: ["Stream Processing", "Analytics Dashboard", "ML Platform"],
    },
  ]

  const handleRequirementsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setRequirements(e.target.value)
  }

  const handleAskAI = () => {
    if (requirements.trim()) {
      setIsLoading(true)
      setActiveStep(1) // Move to AI Analysis step

      // In a real implementation, this would trigger an API call
      setTimeout(() => {
        setActiveStep(2) // Move to Generate Schema step
        setIsLoading(false)
      }, 2000)
    }
  }

  const handleGenerateSchema = () => {
    setIsLoading(true)
    setActiveStep(3) // Move to Review & Edit step

    // Mock generated schema
    setTimeout(() => {
      setGeneratedSchema({
        name: dataProductName,
        description: dataProductDescription,
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
      })
      setIsLoading(false)
      setActiveTab("generated-schema")
    }, 2000)
  }

  const handleCreateDataProduct = () => {
    setIsLoading(true)
    setActiveStep(4) // Move to Create Data Product step

    // In a real implementation, this would create the data product
    setTimeout(() => {
      setIsLoading(false)
      toast({
        title: "Data Product Created",
        description: `${dataProductName} has been successfully created and is ready for use.`,
      })
    }, 2000)
  }

  const handleUseTemplate = (template: string) => {
    setRequirements(template)
    // Automatically scroll to the requirements section
    document.getElementById("requirements-section")?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <DashboardShell>
      <DashboardHeader
        heading="AI Designer"
        text="Use our AI-powered platform to design and create data products collaboratively."
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.open("/docs/ai-designer", "_blank")}>
            <Code className="mr-2 h-4 w-4" />
            Documentation
          </Button>
          <Button>
            <Sparkles className="mr-2 h-4 w-4" />
            How It Works
          </Button>
        </div>
      </DashboardHeader>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card id="requirements-section" className="border-2 border-primary/10 shadow-md">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
              <div className="flex items-center">
                <Sparkles className="mr-2 h-5 w-5 text-primary" />
                <CardTitle>AI-Assisted Design</CardTitle>
              </div>
              <CardDescription>
                Describe your data product requirements and our AI will help you design it.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-2">Data Product Requirements</h3>
                  <Textarea
                    placeholder="Describe what kind of Customer 360 data product you need..."
                    className="min-h-[120px] resize-none focus-visible:ring-primary"
                    value={requirements}
                    onChange={handleRequirementsChange}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="justify-between border-t bg-muted/20 py-3">
              <div className="text-xs text-muted-foreground">
                Tip: Be specific about the data attributes, sources, and use cases
              </div>
              <Button
                onClick={handleAskAI}
                disabled={!requirements.trim() || isLoading}
                className="bg-primary hover:bg-primary/90"
              >
                {isLoading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Ask AI Assistant
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>

          <Card className="shadow-md">
            <CardHeader className="border-b">
              <CardTitle>Conversation</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <AIChat requirements={requirements} onGenerateSchema={handleGenerateSchema} />
            </CardContent>
            <CardFooter className="justify-end border-t py-3">
              <Button onClick={handleGenerateSchema} variant="outline" disabled={isLoading || activeStep < 2}>
                {isLoading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Generating...
                  </>
                ) : (
                  "Generate Schema"
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-2 border-primary/10 shadow-md">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 pb-3">
              <CardTitle>Workflow Progress</CardTitle>
              <CardDescription>Track your progress in creating a data product</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <WorkflowProgress steps={workflowSteps} activeStep={activeStep} />
            </CardContent>
          </Card>

          {generatedSchema && (
            <Card className="shadow-md">
              <CardHeader className="border-b">
                <CardTitle>Generated Schema</CardTitle>
                <CardDescription>Review and edit the AI-generated data product schema.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Data Product Name</h3>
                  <Input value={dataProductName} onChange={(e) => setDataProductName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Description</h3>
                  <Textarea
                    value={dataProductDescription}
                    onChange={(e) => setDataProductDescription(e.target.value)}
                    className="min-h-[80px] resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Attributes</h3>
                  <AttributeEditor attributes={generatedSchema.attributes} />
                </div>
              </CardContent>
              <CardFooter className="border-t py-3">
                <Button
                  onClick={handleCreateDataProduct}
                  className="w-full bg-primary hover:bg-primary/90"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Creating...
                    </>
                  ) : (
                    "Create Data Product"
                  )}
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger
            value="design-prompts"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Design Prompts
          </TabsTrigger>
          <TabsTrigger
            value="generated-schema"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Database className="mr-2 h-4 w-4" />
            Generated Schema
          </TabsTrigger>
          <TabsTrigger
            value="agent-collaboration"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Server className="mr-2 h-4 w-4" />
            Agent Collaboration
          </TabsTrigger>
        </TabsList>
        <TabsContent value="design-prompts" className="space-y-4 mt-4">
          <Card className="shadow-md">
            <CardHeader className="border-b">
              <CardTitle>Suggested Design Prompts</CardTitle>
              <CardDescription>Use these prompts to get started with your data product design</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {designPrompts.map((prompt) => (
                  <DesignPromptCard
                    key={prompt.id}
                    title={prompt.title}
                    description={prompt.description}
                    icon={prompt.icon}
                    template={prompt.template}
                    platforms={prompt.platforms}
                    onUse={handleUseTemplate}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="generated-schema" className="mt-4">
          <SchemaGenerator schema={generatedSchema} />
        </TabsContent>
        <TabsContent value="agent-collaboration" className="mt-4">
          <AgentCollaborationPanel />
        </TabsContent>
      </Tabs>
    </DashboardShell>
  )
}
