"use server"

import { revalidatePath } from "next/cache"
import { supabase, type DataProduct } from "@/lib/supabase"

export async function getDataProducts(): Promise<DataProduct[]> {
  const { data, error } = await supabase.from("data_products").select("*").order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching data products:", error)
    return []
  }

  return data || []
}

export async function getDataProduct(id: string): Promise<DataProduct | null> {
  const { data, error } = await supabase.from("data_products").select("*").eq("id", id).single()

  if (error) {
    console.error(`Error fetching data product with id ${id}:`, error)
    return null
  }

  return data
}

export async function createDataProduct(
  dataProduct: Omit<DataProduct, "id" | "created_at" | "updated_at">,
): Promise<{ success: boolean; id?: string; error?: string }> {
  const { data, error } = await supabase.from("data_products").insert([dataProduct]).select()

  if (error) {
    console.error("Error creating data product:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/data-products")
  revalidatePath("/dashboard")

  return { success: true, id: data[0].id }
}

export async function updateDataProduct(
  id: string,
  dataProduct: Partial<DataProduct>,
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from("data_products")
    .update({ ...dataProduct, updated_at: new Date().toISOString() })
    .eq("id", id)

  if (error) {
    console.error(`Error updating data product with id ${id}:`, error)
    return { success: false, error: error.message }
  }

  revalidatePath("/data-products")
  revalidatePath(`/data-products/${id}`)
  revalidatePath("/dashboard")

  return { success: true }
}

export async function deleteDataProduct(id: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from("data_products").delete().eq("id", id)

  if (error) {
    console.error(`Error deleting data product with id ${id}:`, error)
    return { success: false, error: error.message }
  }

  revalidatePath("/data-products")
  revalidatePath("/dashboard")

  return { success: true }
}

export async function getDataProductAttributes(dataProductId: string) {
  const { data, error } = await supabase
    .from("data_product_attributes")
    .select("*")
    .eq("data_product_id", dataProductId)
    .order("category")

  if (error) {
    console.error(`Error fetching attributes for data product ${dataProductId}:`, error)
    return []
  }

  return data || []
}

export async function getDataProductSourceMappings(dataProductId: string) {
  const { data, error } = await supabase
    .from("source_mappings")
    .select(`
      *,
      source_systems(id, name),
      data_product_attributes(id, name, display_name, category)
    `)
    .eq("data_product_id", dataProductId)

  if (error) {
    console.error(`Error fetching source mappings for data product ${dataProductId}:`, error)
    return []
  }

  return data || []
}
