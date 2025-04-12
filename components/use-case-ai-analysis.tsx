"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { generateAIResponse } from "@/lib/ai-sdk"
import { Loader2 } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface UseCaseAIAnalysisProps {
  useCaseText: string
  onSave: () => void
}

export function UseCaseAIAnalysis({ useCaseText, onSave }: UseCaseAIAnalysisProps) {
  const [dataProductRecommendation, setDataProductRecommendation] = useState("")
  const [sourceSystemRecommendation, setSourceSystemRecommendation] = useState("")
  const [certificationRecommendation, setCertificationRecommendation] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const analyzeUseCase = async () => {
      setIsLoading(true)
      try {
        const productRecommendation = await generateAIResponse(
          `Recommend a data product based on the following use case: ${useCaseText}`,
        )
        setDataProductRecommendation(productRecommendation || "No recommendation available.")

        const sourceRecommendation = await generateAIResponse(
          `Identify potential source systems for the following use case: ${useCaseText}`,
        )
        setSourceSystemRecommendation(sourceRecommendation || "No recommendation available.")

        const certificationRec = await generateAIResponse(
          `Recommend certification steps for the following use case: ${useCaseText}`,
        )
        setCertificationRecommendation(certificationRec || "No recommendation available.")
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to analyze use case. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    analyzeUseCase()
  }, [useCaseText])

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Analysis</CardTitle>
        <CardDescription>AI-powered recommendations for data product design and certification.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Analyzing use case...
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label>Data Product Recommendation</Label>
              <Textarea value={dataProductRecommendation} readOnly className="min-h-[100px]" />
            </div>
            <div className="space-y-2">
              <Label>Source System Recommendation</Label>
              <Textarea value={sourceSystemRecommendation} readOnly className="min-h-[100px]" />
            </div>
            <div className="space-y-2">
              <Label>Certification Recommendation</Label>
              <Textarea value={certificationRecommendation} readOnly className="min-h-[100px]" />
            </div>
          </>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={onSave} disabled={isLoading}>
          Save and Continue
        </Button>
      </CardFooter>
    </Card>
  )
}
