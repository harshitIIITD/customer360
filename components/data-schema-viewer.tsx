"use client"

import { useState, useEffect } from "react"
import { ChevronDown, ChevronRight, Copy, Download, Filter, Plus, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getDataProductAttributes } from "@/app/actions/data-products"
import type { DataProductAttribute } from "@/lib/supabase"

interface DataSchemaViewerProps {
  productId: string
}

export function DataSchemaViewer({ productId }: DataSchemaViewerProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [expandedCategories, setExpandedCategories] = useState<string[]>([])
  const [attributes, setAttributes] = useState<DataProductAttribute[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAttributes = async () => {
      setLoading(true)
      try {
        const data = await getDataProductAttributes(productId)
        setAttributes(data)

        // Expand all categories by default
        const categories = Array.from(new Set(data.map((attr) => attr.category || "Uncategorized")))
        setExpandedCategories(categories)
      } catch (error) {
        console.error("Error fetching attributes:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchAttributes()
  }, [productId])

  const toggleCategory = (category: string) => {
    if (expandedCategories.includes(category)) {
      setExpandedCategories(expandedCategories.filter((c) => c !== category))
    } else {
      setExpandedCategories([...expandedCategories, category])
    }
  }

  const filteredAttributes = attributes.filter(
    (attr) =>
      attr.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      attr.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (attr.description && attr.description.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  const categories = Array.from(new Set(filteredAttributes.map((attr) => attr.category || "Uncategorized")))

  // Generate JSON schema for the data product
  const generateJsonSchema = () => {
    const properties: Record<string, any> = {}
    const required: string[] = []

    attributes.forEach((attr) => {
      properties[attr.name] = {
        type: mapDataTypeToJsonType(attr.data_type),
        description: attr.description || attr.display_name,
      }

      if (attr.required) {
        required.push(attr.name)
      }
    })

    return JSON.stringify(
      {
        $schema: "http://json-schema.org/draft-07/schema#",
        title: "Data Product Schema",
        type: "object",
        required: required,
        properties: properties,
      },
      null,
      2,
    )
  }

  // Map database data types to JSON schema types
  const mapDataTypeToJsonType = (dataType: string) => {
    switch (dataType.toLowerCase()) {
      case "integer":
      case "int":
      case "bigint":
      case "smallint":
        return "integer"
      case "float":
      case "double":
      case "decimal":
      case "numeric":
        return "number"
      case "boolean":
      case "bool":
        return "boolean"
      case "date":
      case "timestamp":
      case "datetime":
        return "string"
      default:
        return "string"
    }
  }

  // Generate SQL definition for the data product
  const generateSqlDefinition = () => {
    if (attributes.length === 0) return "CREATE TABLE data_product (\n  -- No attributes defined yet\n);"

    const tableName = "data_product"
    const columnDefinitions = attributes.map((attr) => {
      const sqlType = mapDataTypeToSqlType(attr.data_type)
      const nullability = attr.required ? "NOT NULL" : "NULL"
      return `  ${attr.name} ${sqlType} ${nullability}${attr.description ? ` -- ${attr.description}` : ""}`
    })

    return `CREATE TABLE ${tableName} (\n${columnDefinitions.join(",\n")}\n);`
  }

  // Map database data types to SQL types
  const mapDataTypeToSqlType = (dataType: string) => {
    return dataType.toUpperCase()
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Data Schema</CardTitle>
            <CardDescription>Attributes and structure of the data product</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export Schema
            </Button>
            <Button variant="outline" size="sm">
              <Copy className="mr-2 h-4 w-4" />
              Copy JSON
            </Button>
            <Button size="sm" asChild>
              <Link href={`/data-products/${productId}/attributes/new`}>
                <Plus className="mr-2 h-4 w-4" />
                Add Attribute
              </Link>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="visual" className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="visual">Visual Schema</TabsTrigger>
              <TabsTrigger value="json">JSON Schema</TabsTrigger>
              <TabsTrigger value="sql">SQL Definition</TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search attributes..."
                  className="pl-8 w-[250px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <TabsContent value="visual" className="space-y-4">
            <div className="rounded-md border">
              <div className="p-4 font-medium bg-muted/50">Attributes ({filteredAttributes.length})</div>
              {loading ? (
                <div className="p-8 text-center text-muted-foreground">Loading attributes...</div>
              ) : filteredAttributes.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  {searchTerm ? "No attributes match your search." : "No attributes defined yet."}
                  <div className="mt-4">
                    <Button asChild>
                      <Link href={`/data-products/${productId}/attributes/new`}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Attribute
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-2 space-y-2">
                  {categories.map((category) => (
                    <div key={category} className="rounded-md border">
                      <div
                        className="p-3 font-medium flex items-center justify-between cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleCategory(category)}
                      >
                        <div className="flex items-center gap-2">
                          {expandedCategories.includes(category) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          {category}
                        </div>
                        <Badge>
                          {filteredAttributes.filter((attr) => (attr.category || "Uncategorized") === category).length}
                        </Badge>
                      </div>
                      {expandedCategories.includes(category) && (
                        <div className="p-2 space-y-1 border-t">
                          {filteredAttributes
                            .filter((attr) => (attr.category || "Uncategorized") === category)
                            .map((attr) => (
                              <div key={attr.id} className="p-2 rounded-md hover:bg-muted/50">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{attr.display_name}</span>
                                    {attr.required && (
                                      <Badge variant="outline" className="text-xs">
                                        Required
                                      </Badge>
                                    )}
                                    {attr.pii && (
                                      <Badge
                                        variant="outline"
                                        className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200 text-xs"
                                      >
                                        PII
                                      </Badge>
                                    )}
                                  </div>
                                  <span className="text-sm text-muted-foreground">{attr.data_type}</span>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {attr.description || "No description"}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs text-muted-foreground">Field: {attr.name}</span>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
          <TabsContent value="json">
            <div className="rounded-md border bg-muted p-4">
              <pre className="text-sm overflow-auto max-h-[500px]">
                {attributes.length === 0
                  ? '{\n  "$schema": "http://json-schema.org/draft-07/schema#",\n  "title": "Data Product Schema",\n  "type": "object",\n  "properties": {}\n}'
                  : generateJsonSchema()}
              </pre>
            </div>
          </TabsContent>
          <TabsContent value="sql">
            <div className="rounded-md border bg-muted p-4">
              <pre className="text-sm overflow-auto max-h-[500px]">{generateSqlDefinition()}</pre>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

import Link from "next/link"
