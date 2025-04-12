"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Copy, Download, Check, Database } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface SchemaGeneratorProps {
  schema: any
}

export function SchemaGenerator({ schema }: SchemaGeneratorProps) {
  const [viewFormat, setViewFormat] = useState<"json" | "sql" | "visual">("json")
  const [copied, setCopied] = useState(false)

  if (!schema) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Generated Schema</CardTitle>
          <CardDescription>No schema has been generated yet.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40 text-muted-foreground">
            Define your requirements and use the AI assistant to generate a schema.
          </div>
        </CardContent>
      </Card>
    )
  }

  const generateJsonSchema = () => {
    const properties: Record<string, any> = {}
    const required: string[] = []

    schema.attributes.forEach((attr: any) => {
      properties[attr.name] = {
        type: attr.dataType,
        description: attr.description,
      }

      if (attr.required) {
        required.push(attr.name)
      }
    })

    return JSON.stringify(
      {
        $schema: "http://json-schema.org/draft-07/schema#",
        title: schema.name,
        description: schema.description,
        type: "object",
        required: required,
        properties: properties,
      },
      null,
      2,
    )
  }

  const generateSqlDefinition = () => {
    if (!schema || !schema.attributes || schema.attributes.length === 0) {
      return "CREATE TABLE data_product (\n  -- No attributes defined yet\n);"
    }

    const tableName = schema.name.toLowerCase().replace(/\s+/g, "_")
    const columnDefinitions = schema.attributes.map((attr: any) => {
      const sqlType = mapDataTypeToSqlType(attr.dataType)
      const nullability = attr.required ? "NOT NULL" : "NULL"
      return `  ${attr.name} ${sqlType} ${nullability}${attr.description ? ` -- ${attr.description}` : ""}`
    })

    return `CREATE TABLE ${tableName} (\n${columnDefinitions.join(",\n")}\n);`
  }

  const mapDataTypeToSqlType = (dataType: string) => {
    switch (dataType.toLowerCase()) {
      case "integer":
      case "int":
        return "INTEGER"
      case "number":
        return "DECIMAL"
      case "boolean":
        return "BOOLEAN"
      case "object":
        return "JSONB"
      case "array":
        return "JSONB"
      default:
        return "VARCHAR(255)"
    }
  }

  const handleCopyToClipboard = () => {
    const textToCopy = viewFormat === "json" ? generateJsonSchema() : generateSqlDefinition()
    navigator.clipboard.writeText(textToCopy)
    setCopied(true)
    toast({
      title: "Copied to clipboard",
      description: `The ${viewFormat.toUpperCase()} schema has been copied to your clipboard.`,
    })

    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const textToDownload = viewFormat === "json" ? generateJsonSchema() : generateSqlDefinition()
    const fileExtension = viewFormat === "json" ? "json" : "sql"
    const fileName = `${schema.name.toLowerCase().replace(/\s+/g, "_")}_schema.${fileExtension}`

    const blob = new Blob([textToDownload], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: "Schema downloaded",
      description: `The ${viewFormat.toUpperCase()} schema has been downloaded as ${fileName}.`,
    })
  }

  return (
    <Card className="shadow-md">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Generated Schema: {schema.name}</CardTitle>
            <CardDescription>{schema.description}</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCopyToClipboard}>
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2 text-green-500" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <Tabs defaultValue="json" onValueChange={(value) => setViewFormat(value as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger
              value="json"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              JSON Schema
            </TabsTrigger>
            <TabsTrigger
              value="sql"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              SQL Definition
            </TabsTrigger>
            <TabsTrigger
              value="visual"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Visual
            </TabsTrigger>
          </TabsList>
          <TabsContent value="json">
            <div className="rounded-md bg-muted p-4 mt-4 border">
              <pre className="text-sm overflow-auto max-h-[500px] font-mono">{generateJsonSchema()}</pre>
            </div>
          </TabsContent>
          <TabsContent value="sql">
            <div className="rounded-md bg-muted p-4 mt-4 border">
              <pre className="text-sm overflow-auto max-h-[500px] font-mono">{generateSqlDefinition()}</pre>
            </div>
          </TabsContent>
          <TabsContent value="visual">
            <div className="mt-4 space-y-4">
              <div className="rounded-md border p-4 bg-primary/5">
                <h3 className="font-medium mb-4 flex items-center">
                  <Database className="h-5 w-5 mr-2 text-primary" />
                  {schema.name}
                </h3>
                <p className="text-sm text-muted-foreground mb-6 pl-7">{schema.description}</p>
                <div className="space-y-3">
                  {schema.attributes.map((attr: any, index: number) => (
                    <div key={index} className="grid grid-cols-3 gap-4 p-3 rounded-md bg-background border">
                      <div>
                        <p className="font-medium">{attr.displayName}</p>
                        <p className="text-xs text-muted-foreground">{attr.name}</p>
                      </div>
                      <div>
                        <p className="text-sm font-mono">{attr.dataType}</p>
                        {attr.required && <span className="text-xs text-primary font-medium">Required</span>}
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{attr.description}</p>
                        {attr.pii && <span className="text-xs text-yellow-600 font-medium">PII</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
