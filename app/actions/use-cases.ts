"use server"

import { revalidatePath } from "next/cache"
import { supabase, type UseCase } from "@/lib/supabase"

export async function getUseCases(): Promise<UseCase[]> {
  const { data, error } = await supabase.from("use_cases").select("*").order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching use cases:", error)
    return []
  }

  return data || []
}

export async function getUseCase(id: string): Promise<UseCase | null> {
  const { data, error } = await supabase.from("use_cases").select("*").eq("id", id).single()

  if (error) {
    console.error(`Error fetching use case with id ${id}:`, error)
    return null
  }

  return data
}

export async function createUseCase(
  useCase: Omit<UseCase, "id" | "created_at" | "updated_at">,
): Promise<{ success: boolean; id?: string; error?: string }> {
  const { data, error } = await supabase.from("use_cases").insert([useCase]).select()

  if (error) {
    console.error("Error creating use case:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/use-cases")
  revalidatePath("/dashboard")

  return { success: true, id: data[0].id }
}

export async function updateUseCase(
  id: string,
  useCase: Partial<UseCase>,
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from("use_cases")
    .update({ ...useCase, updated_at: new Date().toISOString() })
    .eq("id", id)

  if (error) {
    console.error(`Error updating use case with id ${id}:`, error)
    return { success: false, error: error.message }
  }

  revalidatePath("/use-cases")
  revalidatePath(`/use-cases/${id}`)
  revalidatePath("/dashboard")

  return { success: true }
}

export async function deleteUseCase(id: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from("use_cases").delete().eq("id", id)

  if (error) {
    console.error(`Error deleting use case with id ${id}:`, error)
    return { success: false, error: error.message }
  }

  revalidatePath("/use-cases")
  revalidatePath("/dashboard")

  return { success: true }
}
