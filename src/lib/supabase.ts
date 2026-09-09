import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hjdsqjiqgqbsangtaxgu.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: true, autoRefreshToken: true }
})

export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { persistSession: false } }
)

export async function query(table: string, options?: {
  select?: string
  filter?: Record<string, any>
  limit?: number
  order?: string
  ascending?: boolean
}) {
  let q = supabase.from(table).select(options?.select || '*')
  if (options?.filter) {
    Object.entries(options.filter).forEach(([key, value]) => {
      q = q.eq(key, value)
    })
  }
  if (options?.order) q = q.order(options.order, { ascending: options.ascending ?? false })
  if (options?.limit) q = q.limit(options.limit)
  const { data, error } = await q
  if (error) throw error
  return data
}

export async function insert(table: string, record: Record<string, any>) {
  const { data, error } = await supabase.from(table).insert(record).select()
  if (error) throw error
  return data[0]
}

export async function update(table: string, id: string, updates: Record<string, any>) {
  const { data, error } = await supabase.from(table).update(updates).eq('id', id).select()
  if (error) throw error
  return data[0]
}

export async function remove(table: string, id: string) {
  const { error } = await supabase.from(table).delete().eq('id', id)
  if (error) throw error
  return true
}