"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createDataProduct } from "@/app/actions/data-products"
import { toast } from "@/components/ui/use-toast"

export default function NewDataProductPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const productType = searchParams.get("type")

  const [isSubmitting, setIsSubmitting] = useState(false)

  // Set default values based on product type
  const getDefaultValues = () => {
    if (productType === "customer_profile") {
      return {
        name: "Retail Customer Profile",
        description:
          "Comprehensive profile data for retail banking customers including personal information, contact details, preferences, and relationship summary.",
        department: "retail",
        status: "Draft",
        owner: "",
      }
    } else if (productType === "account_summary") {
      return {
        name: "Account Summary",
        description: "Summary of customer accounts including account types, balances, status, and key metrics.",
        department: "retail",
        status: "Draft",
        owner: "",
      }
    } else if (productType === "transaction_history") {
      return {
        name: "Transaction History",
        description: "Detailed history of customer transactions across all accounts with categorization and analytics.",
        department: "retail",
        status: "Draft",
        owner: "",
      }
    } else {
      return {
        name: "",
        description: "",
        department: "retail",
        status: "Draft",
        owner: "",
      }
    }
  }

  const [formData, setFormData] = useState(getDefaultValues())

  const handleChange = (e) => {
    const { id, value } = e.target
    setFormData((prev) => ({ ...prev, [id]: value }))
  }

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const result = await createDataProduct({
        name: formData.name,
        description: formData.description,
        department: formData.department,
        status: formData.status,
        certified: false,
        owner: formData.owner || null,
        version: "1.0",
      })

      if (result.success) {
        toast({
          title: "Data product created",
          description: "Your data product has been created successfully.",
        })
        router.push(`/data-products/${result.id}`)
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to create data product. Please try again.",
          variant: "destructive",
        })
        setIsSubmitting(false)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-4">New Data Product</h1>
      <p>This is a simple page for creating a new data product.</p>
    </div>
  )
}
