"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface ChartProps {
  title?: string
  description?: string
  data: any[]
  type: "bar" | "line" | "pie"
  xKey?: string
  yKey?: string
  dataKey?: string
  nameKey?: string
  valueKey?: string
  colors?: string[]
  className?: string
  height?: number
  showLegend?: boolean
  showGrid?: boolean
  showTooltip?: boolean
}

export function Chart({
  title,
  description,
  data,
  type,
  xKey = "name",
  yKey = "value",
  dataKey = "value",
  nameKey = "name",
  valueKey = "value",
  colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"],
  className,
  height = 300,
  showLegend = true,
  showGrid = true,
  showTooltip = true,
}: ChartProps) {
  const [mounted, setMounted] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  useEffect(() => {
    try {
      setMounted(true)

      const updateWidth = () => {
        if (containerRef.current) {
          setContainerWidth(containerRef.current.clientWidth)
        }
      }

      updateWidth()
      window.addEventListener("resize", updateWidth)

      return () => {
        window.removeEventListener("resize", updateWidth)
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error occurred"))
    }
  }, [])

  // Handle error state
  if (error) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        {title && (
          <CardHeader className="pb-2">
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </CardHeader>
        )}
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center text-center space-y-2">
            <p className="text-sm text-muted-foreground">Unable to load chart. Please try again later.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Handle loading state
  if (!mounted) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        {title && (
          <CardHeader className="pb-2">
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </CardHeader>
        )}
        <CardContent className="p-0">
          <div style={{ height }} className="flex items-center justify-center">
            <div className="animate-pulse bg-muted rounded-md w-full h-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Ensure data is valid
  const validData = Array.isArray(data) && data.length > 0 ? data : []

  return (
    <Card className={cn("overflow-hidden", className)} ref={containerRef}>
      {title && (
        <CardHeader className="pb-2">
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent className="p-0">
        <div style={{ height }}>
          {validData.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-muted-foreground">No data available</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {type === "bar" ? (
                <BarChart data={validData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  {showGrid && <CartesianGrid strokeDasharray="3 3" />}
                  <XAxis dataKey={xKey} />
                  <YAxis />
                  {showTooltip && <Tooltip />}
                  {showLegend && <Legend />}
                  <Bar dataKey={dataKey}>
                    {validData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              ) : type === "line" ? (
                <LineChart data={validData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  {showGrid && <CartesianGrid strokeDasharray="3 3" />}
                  <XAxis dataKey={xKey} />
                  <YAxis />
                  {showTooltip && <Tooltip />}
                  {showLegend && <Legend />}
                  <Line type="monotone" dataKey={yKey} stroke={colors[0]} activeDot={{ r: 8 }} strokeWidth={2} />
                </LineChart>
              ) : (
                <PieChart>
                  <Pie
                    data={validData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey={valueKey}
                    nameKey={nameKey}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {validData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Pie>
                  {showTooltip && <Tooltip />}
                  {showLegend && <Legend />}
                </PieChart>
              )}
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export const ChartContainer = ({ children }: { children: React.ReactNode }) => {
  return <div className="w-full">{children}</div>
}

export const ChartTooltip = () => {
  return null
}

export const ChartTooltipContent = () => {
  return null
}

export const ChartLegend = () => {
  return null
}

export const ChartLegendContent = () => {
  return null
}

export const ChartStyle = () => {
  return null
}
