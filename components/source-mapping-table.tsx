"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowUpDown, Download, Filter, Plus, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getDataProductSourceMappings } from "@/app/actions/data-products"

interface SourceMappingTableProps {
  productId: string
}

export function SourceMappingTable({ productId }: SourceMappingTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [systemFilter, setSystemFilter] = useState<string>("all")
  const [mappings, setMappings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMappings = async () => {
      setLoading(true)
      try {
        const data = await getDataProductSourceMappings(productId)
        setMappings(data)
      } catch (error) {
        console.error("Error fetching source mappings:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchMappings()
  }, [productId])

  const filteredMappings = mappings.filter((mapping) => {
    const matchesSearch =
      mapping.source_attribute.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (mapping.data_product_attributes?.display_name || "").toLowerCase().includes(searchTerm.toLowerCase())

    const matchesCategory =
      categoryFilter === "all" || (mapping.data_product_attributes?.category || "") === categoryFilter

    const matchesSystem = systemFilter === "all" || (mapping.source_systems?.name || "") === systemFilter

    return matchesSearch && matchesCategory && matchesSystem
  })

  const categories = Array.from(
    new Set(mappings.map((mapping) => mapping.data_product_attributes?.category).filter(Boolean)),
  )

  const systems = Array.from(new Set(mappings.map((mapping) => mapping.source_systems?.name).filter(Boolean)))

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Source to Target Mapping</CardTitle>
            <CardDescription>Mapping between source system attributes and data product attributes</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export Mapping
            </Button>
            <Button size="sm" asChild>
              <Link href={`/data-products/${productId}/mappings/new`}>
                <Plus className="mr-2 h-4 w-4" />
                Add Mapping
              </Link>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search mappings..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={systemFilter} onValueChange={setSystemFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by system" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Systems</SelectItem>
                  {systems.map((system) => (
                    <SelectItem key={system} value={system}>
                      {system}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">
                    <div className="flex items-center space-x-2">
                      <span>Target Attribute</span>
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Source System</TableHead>
                  <TableHead>Source Attribute</TableHead>
                  <TableHead>Transformation Type</TableHead>
                  <TableHead className="w-[300px]">Transformation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      Loading source mappings...
                    </TableCell>
                  </TableRow>
                ) : filteredMappings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      {searchTerm || categoryFilter !== "all" || systemFilter !== "all"
                        ? "No mappings match your filters."
                        : "No source mappings defined yet."}
                      <div className="mt-4 flex justify-center">
                        <Button asChild>
                          <Link href={`/data-products/${productId}/mappings/new`}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Mapping
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMappings.map((mapping) => (
                    <TableRow key={mapping.id}>
                      <TableCell className="font-medium">
                        {mapping.data_product_attributes?.display_name || "Unknown"}
                        <div className="text-xs text-muted-foreground">
                          {mapping.data_product_attributes?.name || "Unknown"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{mapping.data_product_attributes?.category || "Uncategorized"}</Badge>
                      </TableCell>
                      <TableCell>{mapping.source_systems?.name || "Unknown"}</TableCell>
                      <TableCell>{mapping.source_attribute}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            mapping.transformation_type === "Direct"
                              ? "outline"
                              : mapping.transformation_type === "Format"
                                ? "secondary"
                                : "default"
                          }
                        >
                          {mapping.transformation_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{mapping.transformation || "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
