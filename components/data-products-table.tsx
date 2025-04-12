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
import { getDataProducts } from "@/app/actions/data-products"
import { formatDistanceToNow } from "date-fns"

export async function DataProductsTable() {
  const dataProducts = await getDataProducts()

  return (
    <div className="rounded-md border">
      <div className="flex items-center justify-between p-4">
        <div className="flex flex-1 items-center space-x-2">
          <h2 className="text-xl font-semibold">Data Products</h2>
          <Badge className="ml-2">{dataProducts.length}</Badge>
        </div>
        <Button size="sm" asChild>
          <Link href="/data-products/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Data Product
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
            <TableHead>Certified</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Last Updated</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {dataProducts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center">
                No data products found. Create your first data product to get started.
              </TableCell>
            </TableRow>
          ) : (
            dataProducts.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-medium">
                  <Link href={`/data-products/${product.id}`} className="hover:underline">
                    {product.name}
                  </Link>
                </TableCell>
                <TableCell>{product.department || "—"}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      product.status === "Active"
                        ? "default"
                        : product.status === "In Progress"
                          ? "outline"
                          : "secondary"
                    }
                  >
                    {product.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {product.certified ? (
                    <Badge variant="success" className="bg-green-600">
                      Yes
                    </Badge>
                  ) : (
                    <Badge variant="outline">No</Badge>
                  )}
                </TableCell>
                <TableCell>{product.owner || "—"}</TableCell>
                <TableCell>{formatDistanceToNow(new Date(product.updated_at), { addSuffix: true })}</TableCell>
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
                        <Link href={`/data-products/${product.id}`}>View details</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/data-products/${product.id}/edit`}>Edit</Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>Export schema</DropdownMenuItem>
                      <DropdownMenuItem>View lineage</DropdownMenuItem>
                      {!product.certified && <DropdownMenuItem>Start certification</DropdownMenuItem>}
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
