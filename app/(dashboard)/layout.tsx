import type React from "react"
import Link from "next/link"
import { Users, Database, FileText, ShieldCheck, Sparkles, LayoutDashboard } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
          <div className="flex gap-2 items-center text-xl font-bold">
            <Users className="h-6 w-6" />
            <Link href="/" className="hover:opacity-80 transition-opacity">
              <span>Customer 360</span>
            </Link>
          </div>
          <div className="flex flex-1 items-center justify-end space-x-4">
            <nav className="flex items-center space-x-2">
              <Button variant="ghost" asChild>
                <Link href="/dashboard">
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  Dashboard
                </Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/use-cases">
                  <FileText className="h-4 w-4 mr-2" />
                  Use Cases
                </Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/data-products">
                  <Database className="h-4 w-4 mr-2" />
                  Data Products
                </Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/data-products/ai-designer">
                  <Sparkles className="h-4 w-4 mr-2" />
                  AI Designer
                </Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/certification">
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  Certification
                </Link>
              </Button>
            </nav>
          </div>
        </div>
      </header>
      <main className="flex-1 py-6">{children}</main>
      <footer className="w-full border-t py-4">
        <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            © 2025 Customer 360 Data Product Solution. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
