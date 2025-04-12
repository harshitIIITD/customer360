"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"

export default function DesignerPage() {
  return (
    <DashboardShell>
      <DashboardHeader heading="Data Product Designer" text="Design your Customer 360 data products.">
        <Button variant="outline" asChild>
          <Link href="/data-products">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Data Products
          </Link>
        </Button>
      </DashboardHeader>

      <div className="rounded-lg border p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Designer Tool</h2>
        <p className="text-muted-foreground mb-4">Design your data products based on your requirements.</p>
        <Button>Get Started</Button>
      </div>
    </DashboardShell>
  )
}
