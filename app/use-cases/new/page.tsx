"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UseCaseAIAnalysis } from "@/components/use-case-ai-analysis"
import { createUseCase } from "@/app/actions/use-cases"
import { toast } from "@/components/ui/use-toast"

export default function NewUseCasePage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [useCaseText, setUseCaseText] = useState("")
  const [showAnalysis, setShowAnalysis] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    department: "retail",
    priority: "medium",
    description: "",
    objectives: "",
    stakeholders: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target
    setFormData((prev) => ({ ...prev, [id]: value }))

    if (id === "description") {
      setUseCaseText(value)
    }
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const result = await createUseCase({
        name: formData.name,
        description: formData.description,
        department: formData.department,
        status: "Draft",
        priority: formData.priority,
      })

      if (result.success) {
        toast({
          title: "Use case created",
          description: "Your use case has been created successfully.",
        })
        setShowAnalysis(true)
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to create use case. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSaveAndContinue = () => {
    router.push("/dashboard")
  }

  return (
    <DashboardShell>
      <DashboardHeader heading="Create New Use Case" text="Define a new business use case for data product creation.">
        <Button variant="outline" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </DashboardHeader>
      <Tabs defaultValue="manual" className="space-y-4">
        <TabsList>
          <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          <TabsTrigger value="template">Use Template</TabsTrigger>
          <TabsTrigger value="import">Import</TabsTrigger>
        </TabsList>
        <TabsContent value="manual" className="space-y-4">
          <Card>
            <form onSubmit={handleSubmit}>
              <CardHeader>
                <CardTitle>Use Case Details</CardTitle>
                <CardDescription>Provide detailed information about your business use case.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Use Case Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Retail Customer 360 View"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Select
                    defaultValue={formData.department}
                    onValueChange={(value) => handleSelectChange("department", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="retail">Retail Banking</SelectItem>
                      <SelectItem value="wealth">Wealth Management</SelectItem>
                      <SelectItem value="lending">Lending</SelectItem>
                      <SelectItem value="cards">Cards & Payments</SelectItem>
                      <SelectItem value="risk">Risk Management</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    defaultValue={formData.priority}
                    onValueChange={(value) => handleSelectChange("priority", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Business Use Case Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe the business use case in detail..."
                    className="min-h-[150px]"
                    value={formData.description}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="objectives">Business Objectives</Label>
                  <Textarea
                    id="objectives"
                    placeholder="What are the key business objectives this use case addresses?"
                    className="min-h-[100px]"
                    value={formData.objectives}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stakeholders">Key Stakeholders</Label>
                  <Input
                    id="stakeholders"
                    placeholder="e.g., Retail Banking Head, Customer Service Team"
                    value={formData.stakeholders}
                    onChange={handleChange}
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" asChild>
                  <Link href="/dashboard">Cancel</Link>
                </Button>
                <Button type="submit" disabled={isSubmitting || !formData.name || !formData.description}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    "Analyze Use Case"
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
          {showAnalysis && <UseCaseAIAnalysis useCaseText={useCaseText} onSave={handleSaveAndContinue} />}
        </TabsContent>
        <TabsContent value="template" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Use Case Templates</CardTitle>
              <CardDescription>Select a pre-defined template to quickly create a use case.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="cursor-pointer hover:border-primary transition-colors">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Customer 360 View</CardTitle>
                    <CardDescription>Comprehensive view of retail banking customers</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Create a unified view of customer data including profile, accounts, transactions, and
                      interactions.
                    </p>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer hover:border-primary transition-colors">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Product Recommendation</CardTitle>
                    <CardDescription>Personalized product recommendations</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Enable personalized product recommendations based on customer behavior and financial profile.
                    </p>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer hover:border-primary transition-colors">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Churn Prediction</CardTitle>
                    <CardDescription>Identify at-risk customers</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Identify customers at risk of churning based on account activity and engagement patterns.
                    </p>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer hover:border-primary transition-colors">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Financial Wellness</CardTitle>
                    <CardDescription>Customer financial health assessment</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Analyze customer financial health and provide personalized insights and recommendations.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">
                Load Selected Template
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="import" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Import Use Case</CardTitle>
              <CardDescription>Import a use case from an existing document or file.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="file">Upload File</Label>
                <Input id="file" type="file" />
              </div>
              <div className="text-sm text-muted-foreground">Supported formats: .docx, .pdf, .txt, .json</div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">
                Upload and Analyze
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardShell>
  )
}
