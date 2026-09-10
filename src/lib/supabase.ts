import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createClient(url, key, { auth: { persistSession: true } })
export const supabaseAdmin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY || '', { auth: { persistSession: false } })

export async function query(table: string, opts?: { select?: string; filter?: Record<string, any>; limit?: number; order?: string; ascending?: boolean }) {
  let q = supabase.from(table).select(opts?.select || '*')
  if (opts?.filter) Object.entries(opts.filter).forEach(([k, v]) => { q = q.eq(k, v) })
  if (opts?.order) q = q.order(opts.order, { ascending: opts.ascending ?? false })
  if (opts?.limit) q = q.limit(opts.limit)
  const { data, error } = await q
  if (error) throw error
  return data
}

export async function insertRow(table: string, record: Record<string, any>) {
  const { data, error } = await supabase.from(table).insert(record).select().single()
  if (error) throw error
  return data
}

export async function updateRow(table: string, id: string, updates: Record<string, any>) {
  const { data, error } = await supabase.from(table).update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteRow(table: string, id: string) {
  const { error } = await supabase.from(table).delete().eq('id', id)
  if (error) throw error
}
