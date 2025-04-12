import Link from "next/link"
import { PlusCircle, Sparkles, ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { DataProductsTable } from "@/components/data-products-table"

export default function DataProductsPage() {
  return (
    <DashboardShell>
      <DashboardHeader heading="Data Products" text="Manage and explore your Customer 360 data products.">
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/data-products/ai-designer">
              <Sparkles className="mr-2 h-4 w-4" />
              AI Designer
            </Link>
          </Button>
          <Button asChild>
            <Link href="/data-products/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              New Data Product
            </Link>
          </Button>
        </div>
      </DashboardHeader>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <Card className="border-2 border-primary/10 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">AI Designer</CardTitle>
            <CardDescription>Create data products with AI assistance</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Use our AI-powered platform to design and create data products collaboratively with intelligent agents.
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/data-products/ai-designer">
                Try AI Designer
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Manual Designer</CardTitle>
            <CardDescription>Create data products manually</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Design your data products from scratch with full control over schema, attributes, and mappings.
            </p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" asChild className="w-full">
              <Link href="/data-products/new">
                Create Manually
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Import Data Product</CardTitle>
            <CardDescription>Import from existing sources</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Import data products from existing schemas, databases, or third-party systems.
            </p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" asChild className="w-full">
              <Link href="/data-products/import">
                Import
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>

      <DataProductsTable />
    </DashboardShell>
  )
}
