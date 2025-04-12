import Link from "next/link"
import { ArrowUpDown, MoreHorizontal, PlusCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { getUseCases } from "@/app/actions/use-cases"
import { formatDistanceToNow } from "date-fns"

export async function UseCasesTable() {
  const useCases = await getUseCases()

  return (
    <div className="rounded-md border">
      <div className="flex items-center justify-between p-4">
        <div className="flex flex-1 items-center space-x-2">
          <h2 className="text-xl font-semibold">Use Cases</h2>
          <Badge className="ml-2">{useCases.length}</Badge>
        </div>
        <Button size="sm" asChild>
          <Link href="/use-cases/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Use Case
          </Link>
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[300px]">
              <div className="flex items-center space-x-2">
                <span>Name</span>
                <ArrowUpDown className="h-4 w-4" />
              </div>
            </TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {useCases.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                No use cases found. Create your first use case to get started.
              </TableCell>
            </TableRow>
          ) : (
            useCases.map((useCase) => (
              <TableRow key={useCase.id}>
                <TableCell className="font-medium">
                  <Link href={`/use-cases/${useCase.id}`} className="hover:underline">
                    {useCase.name}
                  </Link>
                </TableCell>
                <TableCell>{useCase.department || "—"}</TableCell>
                <TableCell>
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
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      useCase.priority === "High"
                        ? "destructive"
                        : useCase.priority === "Medium"
                          ? "default"
                          : "outline"
                    }
                    className={useCase.priority === "High" ? "bg-orange-600" : ""}
                  >
                    {useCase.priority || "Low"}
                  </Badge>
                </TableCell>
                <TableCell>{formatDistanceToNow(new Date(useCase.created_at), { addSuffix: true })}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem asChild>
                        <Link href={`/use-cases/${useCase.id}`}>View details</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/use-cases/${useCase.id}/edit`}>Edit</Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>View data products</DropdownMenuItem>
                      <DropdownMenuItem>Generate report</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
