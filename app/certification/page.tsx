import Link from "next/link"
import { Check, CheckCircle, Circle, Search, Filter, ShieldCheck, AlertTriangle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { getDataProducts } from "@/app/actions/data-products"
import { formatDistanceToNow } from "date-fns"

export default async function CertificationPage() {
  const dataProducts = await getDataProducts()

  // Group data products by certification status
  const certifiedProducts = dataProducts.filter((dp) => dp.certified)
  const uncertifiedProducts = dataProducts.filter((dp) => !dp.certified)

  // Calculate certification metrics
  const certificationRate =
    dataProducts.length > 0 ? Math.round((certifiedProducts.length / dataProducts.length) * 100) : 0

  // Get products that need recertification (mock data - would be based on expiration date)
  const needsRecertificationProducts = certifiedProducts.slice(0, 1)

  // Get products ready for certification (active but not certified)
  const readyForCertificationProducts = uncertifiedProducts.filter((dp) => dp.status === "Active")

  return (
    <DashboardShell>
      <DashboardHeader heading="Certification" text="Manage and track the certification status of your data products.">
        <Button asChild>
          <Link href="/certification/standards">
            <ShieldCheck className="mr-2 h-4 w-4" />
            Certification Standards
          </Link>
        </Button>
      </DashboardHeader>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Certification Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{certificationRate}%</div>
            <Progress value={certificationRate} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Certified Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{certifiedProducts.length}</div>
            <p className="text-xs text-muted-foreground">Out of {dataProducts.length} total data products</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Needs Recertification</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{needsRecertificationProducts.length}</div>
            <p className="text-xs text-muted-foreground">Products due for recertification</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ready for Certification</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{readyForCertificationProducts.length}</div>
            <p className="text-xs text-muted-foreground">Active products awaiting certification</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between mt-6">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder="Search certifications..." className="pl-8 w-[250px]" />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="mt-6 space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="certified">Certified</TabsTrigger>
          <TabsTrigger value="pending">Pending Certification</TabsTrigger>
          <TabsTrigger value="recertification">Needs Recertification</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Certification Status Overview</CardTitle>
              <CardDescription>Current certification status of all data products</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                {dataProducts.length === 0 ? (
                  <div className="text-center text-muted-foreground py-4">No data products available</div>
                ) : (
                  dataProducts.map((product) => {
                    // Calculate a mock certification progress value
                    let progress = 0
                    if (product.status === "Draft") progress = 10
                    else if (product.status === "In Progress") progress = 50
                    else if (product.status === "Active") progress = product.certified ? 100 : 80

                    return (
                      <div key={product.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Link href={`/data-products/${product.id}`} className="font-medium hover:underline">
                              {product.name}
                            </Link>
                            {product.certified && (
                              <Badge variant="success" className="bg-green-600">
                                Certified
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{progress}%</span>
                            {product.certified ? (
                              <Button variant="outline" size="sm" asChild>
                                <Link href={`/data-products/${product.id}/certification`}>View Certification</Link>
                              </Button>
                            ) : product.status === "Active" ? (
                              <Button size="sm" asChild>
                                <Link href={`/data-products/${product.id}/certification/new`}>Start Certification</Link>
                              </Button>
                            ) : (
                              <Button variant="outline" size="sm" disabled>
                                Not Ready
                              </Button>
                            )}
                          </div>
                        </div>
                        <Progress value={progress} />
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <div>
                            Status: <Badge variant="outline">{product.status}</Badge>
                          </div>
                          <div>
                            Last updated: {formatDistanceToNow(new Date(product.updated_at), { addSuffix: true })}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="certified" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {certifiedProducts.length === 0 ? (
              <Card className="md:col-span-2">
                <CardContent className="text-center text-muted-foreground py-8">
                  No certified data products available
                </CardContent>
              </Card>
            ) : (
              certifiedProducts.map((product) => (
                <Card key={product.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{product.name}</CardTitle>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <CardDescription>{product.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Department:</span>
                        <span className="text-sm">{product.department || "—"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Owner:</span>
                        <span className="text-sm">{product.owner || "—"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Certification Date:</span>
                        <span className="text-sm">
                          {formatDistanceToNow(new Date(product.updated_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" className="w-full" asChild>
                      <Link href={`/data-products/${product.id}/certification`}>View Certification Details</Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {readyForCertificationProducts.length === 0 ? (
              <Card className="md:col-span-2">
                <CardContent className="text-center text-muted-foreground py-8">
                  No data products pending certification
                </CardContent>
              </Card>
            ) : (
              readyForCertificationProducts.map((product) => (
                <Card key={product.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{product.name}</CardTitle>
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <CardDescription>{product.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Department:</span>
                        <span className="text-sm">{product.department || "—"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Owner:</span>
                        <span className="text-sm">{product.owner || "—"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Status:</span>
                        <Badge>{product.status}</Badge>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full" asChild>
                      <Link href={`/data-products/${product.id}/certification/new`}>Start Certification Process</Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="recertification" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {needsRecertificationProducts.length === 0 ? (
              <Card className="md:col-span-2">
                <CardContent className="text-center text-muted-foreground py-8">
                  No data products need recertification at this time
                </CardContent>
              </Card>
            ) : (
              needsRecertificationProducts.map((product) => (
                <Card key={product.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{product.name}</CardTitle>
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    </div>
                    <CardDescription>{product.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Department:</span>
                        <span className="text-sm">{product.department || "—"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Owner:</span>
                        <span className="text-sm">{product.owner || "—"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Certification Expires:</span>
                        <span className="text-sm text-yellow-600 font-medium">Soon</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full" asChild>
                      <Link href={`/data-products/${product.id}/certification/renew`}>Recertify Data Product</Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Certification Standards</CardTitle>
          <CardDescription>Review and manage the certification standards for your data products</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="rounded-lg border p-4">
              <h3 className="font-medium">Data Quality Standards</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Standards for data completeness, accuracy, consistency, and timeliness
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm">4 standards defined</span>
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <h3 className="font-medium">Data Governance Standards</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Standards for data classification, access controls, retention, and compliance
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm">4 standards defined</span>
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <h3 className="font-medium">Documentation Standards</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Standards for schema documentation, lineage documentation, and usage guidelines
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm">3 standards defined</span>
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <h3 className="font-medium">Technical Standards</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Standards for performance, API implementation, and monitoring
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm">3 standards defined</span>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="outline" className="w-full" asChild>
            <Link href="/certification/standards">View All Certification Standards</Link>
          </Button>
        </CardFooter>
      </Card>
    </DashboardShell>
  )
}
