import type React from "react"

import { cn } from "@/lib/utils"

interface DashboardShellProps {
  children: React.ReactNode
  className?: string
}

export function DashboardShell({ children, className }: DashboardShellProps) {
  return (
    <div className={cn("container relative pb-10", className)}>
      <div className="grid gap-6">
        <div>{children}</div>
      </div>
    </div>
  )
}
