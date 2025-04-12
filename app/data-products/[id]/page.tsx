import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Download, Edit, Eye, FileText, GitMerge, ShieldCheck } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { DataSchemaViewer } from "@/components/data-schema-viewer"
import { SourceMappingTable } from "@/components/source-mapping-table"
import { CertificationChecklist } from "@/components/certification-checklist"
import { getDataProduct } from "@/app/actions/data-products"

export default async function DataProductPage({ params }: { params: { id: string } }) {
  const dataProduct = await getDataProduct(params.id)

  if (!dataProduct) {
    notFound()
  }

  return (
    <DashboardShell>
      <DashboardHeader heading={dataProduct.name} text={dataProduct.description || ""}>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/data-products">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button asChild>
            <Link href={`/data-products/${dataProduct.id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
        </div>
      </DashboardHeader>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Badge variant={dataProduct.status === "Active" ? "default" : "outline"}>{dataProduct.status}</Badge>
          <Badge
            variant={dataProduct.certified ? "success" : "outline"}
            className={dataProduct.certified ? "bg-green-600" : ""}
          >
            {dataProduct.certified ? "Certified" : "Not Certified"}
          </Badge>
          <span className="text-sm text-muted-foreground">Version {dataProduct.version}</span>
        </div>
        <div className="text-sm text-muted-foreground">
          Last updated: {formatDistanceToNow(new Date(dataProduct.updated_at), { addSuffix: true })}
        </div>
      </div>
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="schema">Data Schema</TabsTrigger>
          <TabsTrigger value="mapping">Source Mapping</TabsTrigger>
          <TabsTrigger value="certification">Certification</TabsTrigger>
          <TabsTrigger value="lineage">Data Lineage</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Data Product Details</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2">
                  <div className="flex justify-between">
                    <dt className="text-sm font-medium text-muted-foreground">Owner:</dt>
                    <dd className="text-sm">{dataProduct.owner || "—"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm font-medium text-muted-foreground">Department:</dt>
                    <dd className="text-sm">{dataProduct.department || "—"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm font-medium text-muted-foreground">Created:</dt>
                    <dd className="text-sm">
                      {formatDistanceToNow(new Date(dataProduct.created_at), { addSuffix: true })}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm font-medium text-muted-foreground">Source Systems:</dt>
                    <dd className="text-sm">—</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm font-medium text-muted-foreground">Attributes:</dt>
                    <dd className="text-sm">—</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Related Use Cases</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
                  No related use cases yet
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" size="sm" className="w-full">
                  <Eye className="mr-2 h-4 w-4" />
                  Link to Use Cases
                </Button>
              </CardFooter>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Data Product Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full ${
                        dataProduct.certified ? "bg-green-100" : "bg-muted"
                      }`}
                    >
                      <ShieldCheck
                        className={`h-4 w-4 ${dataProduct.certified ? "text-green-600" : "text-muted-foreground"}`}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Certification</p>
                      <p className="text-xs text-muted-foreground">
                        {dataProduct.certified ? "Completed" : "Not started"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full ${
                        dataProduct.status !== "Draft" ? "bg-green-100" : "bg-muted"
                      }`}
                    >
                      <GitMerge
                        className={`h-4 w-4 ${
                          dataProduct.status !== "Draft" ? "text-green-600" : "text-muted-foreground"
                        }`}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Source Mapping</p>
                      <p className="text-xs text-muted-foreground">
                        {dataProduct.status !== "Draft" ? "In progress" : "Not started"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full ${
                        dataProduct.description ? "bg-green-100" : "bg-muted"
                      }`}
                    >
                      <FileText
                        className={`h-4 w-4 ${dataProduct.description ? "text-green-600" : "text-muted-foreground"}`}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Documentation</p>
                      <p className="text-xs text-muted-foreground">
                        {dataProduct.description ? "Basic documentation added" : "Not started"}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Data Product Description</CardTitle>
              <CardDescription>Detailed description and purpose of this data product</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                {dataProduct.description ? (
                  <p>{dataProduct.description}</p>
                ) : (
                  <p className="text-muted-foreground">No detailed description available.</p>
                )}

                {dataProduct.name.includes("Customer Profile") && (
                  <>
                    <h3>Key Features</h3>
                    <ul>
                      <li>Personal information including demographics and identification</li>
                      <li>Contact details across multiple channels</li>
                      <li>Customer preferences and consent settings</li>
                      <li>Relationship summary including tenure and status</li>
                      <li>Customer segmentation and value indicators</li>
                    </ul>
                    <h3>Business Value</h3>
                    <p>
                      This data product enables personalized customer experiences, improved service delivery, and
                      targeted marketing campaigns. It serves as a foundation for customer-centric initiatives across
                      the retail banking division.
                    </p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="schema" className="space-y-4">
          <DataSchemaViewer productId={params.id} />
        </TabsContent>
        <TabsContent value="mapping" className="space-y-4">
          <SourceMappingTable productId={params.id} />
        </TabsContent>
        <TabsContent value="certification" className="space-y-4">
          <CertificationChecklist productId={params.id} />
        </TabsContent>
        <TabsContent value="lineage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Data Lineage</CardTitle>
              <CardDescription>
                Visual representation of data flow from source systems to this data product
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[500px] flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <p>Data lineage visualization would be displayed here</p>
                <p className="text-sm">
                  Showing the flow from source systems through transformations to the final data product
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardShell>
  )
}
