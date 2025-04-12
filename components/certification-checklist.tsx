"use client"

import { useState, useEffect } from "react"
import { Check, CheckCircle, Circle, Download, Info, Loader2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { getCertification, getCertificationItems, createCertification } from "@/app/actions/certifications"
import { getDataProduct } from "@/app/actions/data-products"
import { toast } from "@/components/ui/use-toast"
import { formatDistanceToNow } from "date-fns"

interface CertificationChecklistProps {
  productId: string
}

// Mock certification items for demonstration
const mockCertificationItems = [
  {
    id: "cert001",
    category: "Data Quality",
    name: "Completeness Check",
    description: "All required attributes have values and are not null",
    status: "passed",
    date: new Date().toISOString(),
  },
  {
    id: "cert002",
    category: "Data Quality",
    name: "Format Validation",
    description: "All attributes conform to their defined data formats",
    status: "passed",
    date: new Date().toISOString(),
  },
  {
    id: "cert003",
    category: "Data Quality",
    name: "Consistency Check",
    description: "Data is consistent across related attributes",
    status: "passed",
    date: new Date().toISOString(),
  },
  {
    id: "cert004",
    category: "Data Governance",
    name: "PII Classification",
    description: "Personal identifiable information is properly classified",
    status: "passed",
    date: new Date().toISOString(),
  },
  {
    id: "cert005",
    category: "Data Governance",
    name: "Access Controls",
    description: "Appropriate access controls are in place",
    status: "passed",
    date: new Date().toISOString(),
  },
  {
    id: "cert006",
    category: "Data Governance",
    name: "Retention Policy",
    description: "Data retention policies are defined and implemented",
    status: "passed",
    date: new Date().toISOString(),
  },
  {
    id: "cert007",
    category: "Documentation",
    name: "Schema Documentation",
    description: "All attributes are documented with descriptions",
    status: "passed",
    date: new Date().toISOString(),
  },
  {
    id: "cert008",
    category: "Documentation",
    name: "Lineage Documentation",
    description: "Data lineage is documented from source to target",
    status: "passed",
    date: new Date().toISOString(),
  },
  {
    id: "cert009",
    category: "Documentation",
    name: "Usage Guidelines",
    description: "Usage guidelines and limitations are documented",
    status: "passed",
    date: new Date().toISOString(),
  },
  {
    id: "cert010",
    category: "Technical",
    name: "Performance Testing",
    description: "Data product meets performance requirements",
    status: "passed",
    date: new Date().toISOString(),
  },
  {
    id: "cert011",
    category: "Technical",
    name: "API Validation",
    description: "APIs for data access are properly implemented",
    status: "passed",
    date: new Date().toISOString(),
  },
  {
    id: "cert012",
    category: "Technical",
    name: "Monitoring Setup",
    description: "Monitoring and alerting are configured",
    status: "passed",
    date: new Date().toISOString(),
  },
]

export function CertificationChecklist({ productId }: CertificationChecklistProps) {
  const [activeTab, setActiveTab] = useState("checklist")
  const [isRecertifying, setIsRecertifying] = useState(false)
  const [certification, setCertification] = useState<any>(null)
  const [certificationItems, setCertificationItems] = useState<any[]>([])
  const [dataProduct, setDataProduct] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [productData, certData] = await Promise.all([getDataProduct(productId), getCertification(productId)])

        setDataProduct(productData)
        setCertification(certData)

        if (certData) {
          const items = await getCertificationItems(certData.id)
          setCertificationItems(items)
        } else {
          // Use mock data for demonstration
          setCertificationItems([])
        }
      } catch (error) {
        console.error("Error fetching certification data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [productId])

  const handleRecertify = async () => {
    setIsRecertifying(true)

    try {
      // For demonstration, we'll create a new certification
      const result = await createCertification(productId, "John Smith")

      if (result.success) {
        toast({
          title: "Certification completed",
          description: "The data product has been certified successfully.",
        })

        // Refresh the data
        const [certData, productData] = await Promise.all([getCertification(productId), getDataProduct(productId)])

        setCertification(certData)
        setDataProduct(productData)

        if (certData) {
          const items = await getCertificationItems(certData.id)
          setCertificationItems(items)
        }
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to certify data product. Please try again.",
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
      setIsRecertifying(false)
    }
  }

  // Use mock certification items for demonstration
  const certItems = certificationItems.length > 0 ? certificationItems : mockCertificationItems
  const categories = Array.from(new Set(certItems.map((item) => item.category)))

  const passedItems = certItems.filter((item) => item.status === "passed").length
  const totalItems = certItems.length
  const certificationProgress = Math.round((passedItems / totalItems) * 100)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Data Product Certification</CardTitle>
            <CardDescription>Certification status and compliance checks for this data product</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export Report
            </Button>
            <Button size="sm" onClick={handleRecertify} disabled={isRecertifying || loading}>
              {isRecertifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Recertifying...
                </>
              ) : dataProduct?.certified ? (
                "Recertify"
              ) : (
                "Certify"
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading certification data...</div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="checklist">Certification Checklist</TabsTrigger>
              <TabsTrigger value="history">Certification History</TabsTrigger>
              <TabsTrigger value="standards">Certification Standards</TabsTrigger>
            </TabsList>
            <TabsContent value="checklist" className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
                <div className="space-y-1">
                  <div className="text-sm font-medium">Certification Status</div>
                  <div className="flex items-center gap-2">
                    {dataProduct?.certified ? (
                      <>
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="font-medium">Certified</span>
                        <span className="text-sm text-muted-foreground">
                          {certification
                            ? `on ${formatDistanceToNow(new Date(certification.certification_date), { addSuffix: true })}`
                            : "recently"}
                        </span>
                      </>
                    ) : (
                      <>
                        <Circle className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium">Not Certified</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-medium">Certification Progress</div>
                  <div className="flex items-center gap-4">
                    <Progress value={certificationProgress} className="w-[200px]" />
                    <span className="font-medium">{certificationProgress}%</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-medium">Next Recertification</div>
                  <div className="text-sm">
                    {certification?.expiration_date
                      ? formatDistanceToNow(new Date(certification.expiration_date), { addSuffix: true })
                      : "Not scheduled"}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {categories.map((category) => (
                  <div key={category} className="rounded-md border">
                    <div className="p-3 font-medium bg-muted/50 flex items-center justify-between">
                      <span>{category}</span>
                      <span className="text-sm">
                        {certItems.filter((item) => item.category === category && item.status === "passed").length} /
                        {certItems.filter((item) => item.category === category).length} Passed
                      </span>
                    </div>
                    <div className="divide-y">
                      {certItems
                        .filter((item) => item.category === category)
                        .map((item) => (
                          <div key={item.id} className="p-3 flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              {item.status === "passed" ? (
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
                                  <Check className="h-4 w-4 text-green-600" />
                                </div>
                              ) : item.status === "failed" ? (
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100">
                                  <X className="h-4 w-4 text-red-600" />
                                </div>
                              ) : (
                                <div className="flex h-6 w-6 items-center justify-center rounded-full border">
                                  <Circle className="h-4 w-4 text-muted-foreground" />
                                </div>
                              )}
                              <div>
                                <div className="font-medium">{item.name}</div>
                                <div className="text-sm text-muted-foreground">{item.description}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">
                                {item.date
                                  ? formatDistanceToNow(new Date(item.date), { addSuffix: true })
                                  : "Not checked"}
                              </span>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <Info className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>View certification details</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="history" className="space-y-4">
              <div className="rounded-md border">
                <div className="p-3 font-medium bg-muted/50">Certification History</div>
                <div className="divide-y">
                  {certification ? (
                    <div className="p-4 flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
                          <Check className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <div className="font-medium">Certification</div>
                          <div className="text-sm text-muted-foreground">All certification checks passed</div>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(certification.certification_date), { addSuffix: true })}
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-muted-foreground">
                      No certification history available. Certify the data product to create a record.
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
            <TabsContent value="standards" className="space-y-4">
              <div className="prose max-w-none">
                <h3>Data Product Certification Standards</h3>
                <p>
                  All data products must meet the following standards to be certified for use in production
                  environments. These standards ensure data quality, governance, and usability across the organization.
                </p>

                <h4>Data Quality Standards</h4>
                <ul>
                  <li>
                    <strong>Completeness:</strong> All required attributes must have values and not be null.
                  </li>
                  <li>
                    <strong>Accuracy:</strong> Data must accurately represent the real-world values it is intended to
                    model.
                  </li>
                  <li>
                    <strong>Consistency:</strong> Data must be consistent across related attributes and across time.
                  </li>
                  <li>
                    <strong>Timeliness:</strong> Data must be updated within the defined freshness requirements.
                  </li>
                </ul>

                <h4>Data Governance Standards</h4>
                <ul>
                  <li>
                    <strong>Classification:</strong> All data must be properly classified according to sensitivity.
                  </li>
                  <li>
                    <strong>Access Controls:</strong> Appropriate access controls must be implemented.
                  </li>
                  <li>
                    <strong>Retention:</strong> Data retention policies must be defined and implemented.
                  </li>
                  <li>
                    <strong>Compliance:</strong> Data must comply with relevant regulations (GDPR, CCPA, etc.).
                  </li>
                </ul>

                <h4>Documentation Standards</h4>
                <ul>
                  <li>
                    <strong>Schema Documentation:</strong> All attributes must be documented with clear descriptions.
                  </li>
                  <li>
                    <strong>Lineage Documentation:</strong> Data lineage must be documented from source to target.
                  </li>
                  <li>
                    <strong>Usage Guidelines:</strong> Usage guidelines and limitations must be documented.
                  </li>
                </ul>

                <h4>Technical Standards</h4>
                <ul>
                  <li>
                    <strong>Performance:</strong> Data product must meet defined performance requirements.
                  </li>
                  <li>
                    <strong>API Implementation:</strong> APIs for data access must be properly implemented.
                  </li>
                  <li>
                    <strong>Monitoring:</strong> Monitoring and alerting must be configured.
                  </li>
                </ul>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="text-sm text-muted-foreground">
          {certification ? `Certified by: ${certification.certified_by || "System"}` : "Not yet certified"}
        </div>
        <div className="text-sm text-muted-foreground">
          {certification
            ? `Certification ID: CERT-${productId.slice(0, 8)}-${new Date(certification.certification_date).toISOString().slice(0, 10)}`
            : "—"}
        </div>
      </CardFooter>
    </Card>
  )
}
