import { createClient } from "@supabase/supabase-js"

// Types for our database tables
export type UseCase = {
  id: string
  name: string
  description: string | null
  department: string | null
  status: string
  priority: string | null
  created_at: string
  updated_at: string
}

export type DataProduct = {
  id: string
  name: string
  description: string | null
  department: string | null
  status: string
  certified: boolean
  owner: string | null
  version: string
  created_at: string
  updated_at: string
}

export type DataProductAttribute = {
  id: string
  data_product_id: string
  name: string
  display_name: string
  description: string | null
  data_type: string
  category: string | null
  required: boolean
  pii: boolean
  created_at: string
  updated_at: string
}

export type SourceSystem = {
  id: string
  name: string
  description: string | null
  system_type: string | null
  created_at: string
  updated_at: string
}

export type SourceMapping = {
  id: string
  data_product_id: string
  attribute_id: string
  source_system_id: string
  source_attribute: string
  transformation_type: string
  transformation: string | null
  created_at: string
  updated_at: string
}

export type Certification = {
  id: string
  data_product_id: string
  certified_by: string | null
  certification_date: string
  expiration_date: string | null
  status: string
  notes: string | null
  created_at: string
  updated_at: string
}

export type CertificationItem = {
  id: string
  certification_id: string
  category: string
  name: string
  description: string | null
  status: string
  checked_date: string | null
  created_at: string
  updated_at: string
}

// Create a single supabase client for server-side usage
const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

// Create a singleton client for client-side usage
let clientInstance: ReturnType<typeof createClient> | null = null

export const createClientComponentClient = () => {
  if (clientInstance) return clientInstance

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  clientInstance = createClient(supabaseUrl, supabaseKey)
  return clientInstance
}
