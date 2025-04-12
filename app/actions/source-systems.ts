"use server"

import { revalidatePath } from "next/cache"
import { supabase, type SourceSystem } from "@/lib/supabase"

export async function getSourceSystems(): Promise<SourceSystem[]> {
  const { data, error } = await supabase.from("source_systems").select("*").order("name")

  if (error) {
    console.error("Error fetching source systems:", error)
    return []
  }

  return data || []
}

export async function createSourceSystem(
  sourceSystem: Omit<SourceSystem, "id" | "created_at" | "updated_at">,
): Promise<{ success: boolean; id?: string; error?: string }> {
  const { data, error } = await supabase.from("source_systems").insert([sourceSystem]).select()

  if (error) {
    console.error("Error creating source system:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/source-systems")

  return { success: true, id: data[0].id }
}
