import Link from "next/link"
import { CheckCircle, Database, FileText, GitMerge, PlusCircle, ShieldCheck, Sparkles } from "lucide-react"
import { Suspense } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { DataProductsTable } from "@/components/data-products-table"
import { UseCasesTable } from "@/components/use-cases-table"
import { Chart } from "@/components/ui/chart"
import { getDataProducts } from "@/app/actions/data-products"
import { getUseCases } from "@/app/actions/use-cases"
import { getSourceSystems } from "@/app/actions/source-systems"
import { formatDistanceToNow } from "date-fns"

// Fallback component for when data loading fails
function ChartFallback({ title, description }: { title: string; description?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex flex-col items-center justify-center text-center space-y-2">
          <p className="text-sm text-muted-foreground">Unable to load chart data. Please try again later.</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default async function DashboardPage() {
  // Wrap data fetching in try/catch to handle errors
  let dataProducts = []
  let useCases = []
  let sourceSystems = []

  try {
    dataProducts = await getDataProducts()
  } catch (error) {
    console.error("Failed to fetch data products:", error)
    dataProducts = []
  }

  try {
    useCases = await getUseCases()
  } catch (error) {
    console.error("Failed to fetch use cases:", error)
    useCases = []
  }

  try {
    sourceSystems = await getSourceSystems()
  } catch (error) {
    console.error("Failed to fetch source systems:", error)
    sourceSystems = []
  }

  const certifiedProducts = dataProducts.filter((p) => p.certified).length
  const certificationRate = dataProducts.length > 0 ? Math.round((certifiedProducts / dataProducts.length) * 100) : 0

  // Get the most recent data products for the progress display
  const recentDataProducts = dataProducts
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 4)

  // Prepare data for charts
  const statusChartData = [
    { name: "Active", value: dataProducts.filter((p) => p.status === "Active").length },
    { name: "In Progress", value: dataProducts.filter((p) => p.status === "In Progress").length },
    { name: "Draft", value: dataProducts.filter((p) => p.status === "Draft").length },
  ]

  const certificationChartData = [
    { name: "Certified", value: certifiedProducts },
    { name: "Not Certified", value: dataProducts.length - certifiedProducts },
  ]

  const useCasesByDepartment = useCases.reduce(
    (acc, uc) => {
      const dept = uc.department || "Other"
      if (!acc[dept]) acc[dept] = 0
      acc[dept]++
      return acc
    },
    {} as Record<string, number>,
  )

  const departmentChartData = Object.entries(useCasesByDepartment).map(([name, value]) => ({ name, value }))

  // Mock data for time series chart
  const timeSeriesData = [
    { name: "Jan", value: 2 },
    { name: "Feb", value: 3 },
    { name: "Mar", value: 5 },
    { name: "Apr", value: 7 },
    { name: "May", value: 8 },
    { name: "Jun", value: 10 },
  ]

  return (
    <DashboardShell>
      <DashboardHeader heading="Dashboard" text="Overview of your Customer 360 data products and use cases.">
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/data-products/ai-designer">
              <Sparkles className="mr-2 h-4 w-4" />
              AI Designer
            </Link>
          </Button>
          <Button asChild>
            <Link href="/use-cases/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              New Use Case
            </Link>
          </Button>
        </div>
      </DashboardHeader>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Data Products</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dataProducts.length}</div>
            <p className="text-xs text-muted-foreground">
              {dataProducts.length > 0
                ? `Latest added ${formatDistanceToNow(new Date(dataProducts[0].created_at), {
                    addSuffix: true,
                  })}`
                : "No data products yet"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Use Cases</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{useCases.filter((uc) => uc.status === "Active").length}</div>
            <p className="text-xs text-muted-foreground">
              {useCases.length > 0 ? `${useCases.length} total use cases` : "No use cases yet"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Certified Products</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{certifiedProducts}</div>
            <p className="text-xs text-muted-foreground">
              {dataProducts.length > 0 ? `${certificationRate}% certification rate` : "No data products yet"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Source Systems</CardTitle>
            <GitMerge className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sourceSystems.length}</div>
            <p className="text-xs text-muted-foreground">Connected and mapped</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-4">
        <Suspense fallback={<ChartFallback title="Data Products by Status" />}>
          <Chart title="Data Products by Status" data={statusChartData} type="pie" height={250} />
        </Suspense>

        <Suspense fallback={<ChartFallback title="Certification Status" />}>
          <Chart
            title="Certification Status"
            data={certificationChartData}
            type="pie"
            height={250}
            colors={["#10b981", "#d1d5db"]}
          />
        </Suspense>

        <Suspense fallback={<ChartFallback title="Use Cases by Department" />}>
          <Chart title="Use Cases by Department" data={departmentChartData} type="bar" height={250} />
        </Suspense>
      </div>

      <div className="grid gap-4 md:grid-cols-2 mt-4">
        <Suspense
          fallback={<ChartFallback title="Data Product Growth" description="Number of data products over time" />}
        >
          <Chart
            title="Data Product Growth"
            description="Number of data products over time"
            data={timeSeriesData}
            type="line"
            height={250}
          />
        </Suspense>

        <Card>
          <CardHeader>
            <CardTitle>Data Product Completion Status</CardTitle>
          </CardHeader>
          <CardContent>
            {recentDataProducts.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-muted-foreground">
                No data products available. Create your first data product to see status here.
              </div>
            ) : (
              <div className="space-y-8">
                {recentDataProducts.map((product) => {
                  // Calculate a mock progress value based on status
                  let progress = 0
                  if (product.status === "Draft") progress = 25
                  else if (product.status === "In Progress") progress = 60
                  else if (product.status === "Active") progress = product.certified ? 100 : 85

                  return (
                    <div key={product.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{product.name}</span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              product.status === "Active"
                                ? "bg-green-100 text-green-800"
                                : product.status === "In Progress"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-800"
                            }`}
                          >
                            {product.status}
                          </span>
                        </div>
                        <div>{progress}%</div>
                      </div>
                      <Progress value={progress} />
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mt-4">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Activities</CardTitle>
            <CardDescription>Latest updates on your data products</CardDescription>
          </CardHeader>
          <CardContent>
            {dataProducts.length === 0 && useCases.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-muted-foreground">
                No recent activities. Start by creating a use case or data product.
              </div>
            ) : (
              <div className="space-y-8">
                {/* Show a mix of recent data products and use cases */}
                {[...dataProducts, ...useCases]
                  .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
                  .slice(0, 4)
                  .map((item, index) => {
                    const isDataProduct = "certified" in item
                    const icon = isDataProduct ? (
                      item.certified ? (
                        <CheckCircle className="h-4 w-4 text-primary" />
                      ) : (
                        <Database className="h-4 w-4 text-primary" />
                      )
                    ) : (
                      <FileText className="h-4 w-4 text-primary" />
                    )

                    const title = isDataProduct
                      ? item.certified
                        ? `${item.name} data product certified`
                        : `Data product updated: ${item.name}`
                      : `Use case ${item.status === "Draft" ? "created" : "updated"}: ${item.name}`

                    return (
                      <div key={`${isDataProduct ? "dp" : "uc"}-${item.id}-${index}`} className="flex items-center">
                        <div className="flex items-center justify-center rounded-full bg-primary/10 p-2 mr-4">
                          {icon}
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium leading-none">{title}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(item.updated_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI-Powered Design
            </CardTitle>
            <CardDescription>
              Use our AI-powered data product designer to quickly create Customer 360 data products
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Our AI can analyze your business requirements and automatically recommend data product structures,
              identify source systems, and generate attribute mappings.
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Analyze business use cases</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Recommend data product structures</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Identify source systems and attributes</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Generate attribute mappings</span>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" asChild>
              <Link href="/data-products/ai-designer">
                <Sparkles className="mr-2 h-4 w-4" />
                Try AI Designer
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>

      <Tabs defaultValue="data-products" className="space-y-4 mt-4">
        <TabsList>
          <TabsTrigger value="data-products">Data Products</TabsTrigger>
          <TabsTrigger value="use-cases">Use Cases</TabsTrigger>
        </TabsList>
        <TabsContent value="data-products" className="space-y-4">
          <Suspense fallback={<div className="h-24 w-full bg-muted animate-pulse rounded-md" />}>
            <DataProductsTable />
          </Suspense>
        </TabsContent>
        <TabsContent value="use-cases" className="space-y-4">
          <Suspense fallback={<div className="h-24 w-full bg-muted animate-pulse rounded-md" />}>
            <UseCasesTable />
          </Suspense>
        </TabsContent>
      </Tabs>
    </DashboardShell>
  )
}
