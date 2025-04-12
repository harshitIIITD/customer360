import Link from "next/link"
import { PlusCircle, Search, Filter } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { UseCasesTable } from "@/components/use-cases-table"
import { getUseCases } from "@/app/actions/use-cases"
import { formatDistanceToNow } from "date-fns"

export default async function UseCasesPage() {
  const useCases = await getUseCases()

  // Group use cases by status
  const activeUseCases = useCases.filter((uc) => uc.status === "Active")
  const inProgressUseCases = useCases.filter((uc) => uc.status === "In Progress")
  const draftUseCases = useCases.filter((uc) => uc.status === "Draft")

  // Group use cases by department
  const departmentGroups = useCases.reduce(
    (acc, uc) => {
      const dept = uc.department || "Uncategorized"
      if (!acc[dept]) acc[dept] = []
      acc[dept].push(uc)
      return acc
    },
    {} as Record<string, typeof useCases>,
  )

  return (
    <DashboardShell>
      <DashboardHeader heading="Use Cases" text="Manage and analyze business use cases for data product creation.">
        <Button asChild>
          <Link href="/use-cases/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Use Case
          </Link>
        </Button>
      </DashboardHeader>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder="Search use cases..." className="pl-8 w-[250px]" />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            Import
          </Button>
          <Button variant="outline" size="sm">
            Export
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Use Cases</TabsTrigger>
          <TabsTrigger value="by-status">By Status</TabsTrigger>
          <TabsTrigger value="by-department">By Department</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <UseCasesTable />
        </TabsContent>

        <TabsContent value="by-status" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Active</CardTitle>
                  <Badge>{activeUseCases.length}</Badge>
                </div>
              </CardHeader>
              <CardContent className="max-h-[400px] overflow-auto">
                {activeUseCases.length === 0 ? (
                  <div className="text-center text-muted-foreground py-4">No active use cases</div>
                ) : (
                  <div className="space-y-2">
                    {activeUseCases.map((useCase) => (
                      <Link key={useCase.id} href={`/use-cases/${useCase.id}`}>
                        <div className="rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                          <div className="font-medium">{useCase.name}</div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {useCase.department || "No department"} •{" "}
                            {formatDistanceToNow(new Date(useCase.created_at), { addSuffix: true })}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">In Progress</CardTitle>
                  <Badge variant="outline">{inProgressUseCases.length}</Badge>
                </div>
              </CardHeader>
              <CardContent className="max-h-[400px] overflow-auto">
                {inProgressUseCases.length === 0 ? (
                  <div className="text-center text-muted-foreground py-4">No in-progress use cases</div>
                ) : (
                  <div className="space-y-2">
                    {inProgressUseCases.map((useCase) => (
                      <Link key={useCase.id} href={`/use-cases/${useCase.id}`}>
                        <div className="rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                          <div className="font-medium">{useCase.name}</div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {useCase.department || "No department"} •{" "}
                            {formatDistanceToNow(new Date(useCase.created_at), { addSuffix: true })}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Draft</CardTitle>
                  <Badge variant="secondary">{draftUseCases.length}</Badge>
                </div>
              </CardHeader>
              <CardContent className="max-h-[400px] overflow-auto">
                {draftUseCases.length === 0 ? (
                  <div className="text-center text-muted-foreground py-4">No draft use cases</div>
                ) : (
                  <div className="space-y-2">
                    {draftUseCases.map((useCase) => (
                      <Link key={useCase.id} href={`/use-cases/${useCase.id}`}>
                        <div className="rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                          <div className="font-medium">{useCase.name}</div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {useCase.department || "No department"} •{" "}
                            {formatDistanceToNow(new Date(useCase.created_at), { addSuffix: true })}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="by-department" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {Object.entries(departmentGroups).map(([department, departmentUseCases]) => (
              <Card key={department}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{department}</CardTitle>
                    <Badge>{departmentUseCases.length}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="max-h-[300px] overflow-auto">
                  <div className="space-y-2">
                    {departmentUseCases.map((useCase) => (
                      <Link key={useCase.id} href={`/use-cases/${useCase.id}`}>
                        <div className="rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                          <div className="font-medium">{useCase.name}</div>
                          <div className="flex items-center justify-between mt-1">
                            <Badge
                              variant={
                                useCase.status === "Active"
                                  ? "default"
                                  : useCase.status === "In Progress"
                                    ? "outline"
                                    : "secondary"
                              }
                            >
                              {useCase.status}
                            </Badge>
                            <div className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(useCase.created_at), { addSuffix: true })}
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </DashboardShell>
  )
}
