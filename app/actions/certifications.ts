"use server"

import { revalidatePath } from "next/cache"
import { supabase, type Certification, type CertificationItem } from "@/lib/supabase"

export async function getCertification(dataProductId: string): Promise<Certification | null> {
  const { data, error } = await supabase
    .from("certifications")
    .select("*")
    .eq("data_product_id", dataProductId)
    .order("certification_date", { ascending: false })
    .limit(1)
    .single()

  if (error) {
    if (error.code === "PGRST116") {
      // No certification found
      return null
    }
    console.error(`Error fetching certification for data product ${dataProductId}:`, error)
    return null
  }

  return data
}

export async function getCertificationItems(certificationId: string): Promise<CertificationItem[]> {
  const { data, error } = await supabase
    .from("certification_items")
    .select("*")
    .eq("certification_id", certificationId)
    .order("category")

  if (error) {
    console.error(`Error fetching certification items for certification ${certificationId}:`, error)
    return []
  }

  return data || []
}

export async function createCertification(
  dataProductId: string,
  certifiedBy: string,
): Promise<{ success: boolean; id?: string; error?: string }> {
  // Create a new certification
  const { data: certData, error: certError } = await supabase
    .from("certifications")
    .insert([
      {
        data_product_id: dataProductId,
        certified_by: certifiedBy,
        status: "Certified",
        expiration_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(), // 6 months from now
      },
    ])
    .select()

  if (certError) {
    console.error("Error creating certification:", certError)
    return { success: false, error: certError.message }
  }

  // Update the data product to mark it as certified
  const { error: updateError } = await supabase
    .from("data_products")
    .update({ certified: true, updated_at: new Date().toISOString() })
    .eq("id", dataProductId)

  if (updateError) {
    console.error(`Error updating data product certification status:`, updateError)
    return { success: false, error: updateError.message }
  }

  revalidatePath(`/data-products/${dataProductId}`)
  revalidatePath("/data-products")
  revalidatePath("/dashboard")

  return { success: true, id: certData[0].id }
}
