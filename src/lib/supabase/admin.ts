import { createClient as createSupabaseClient } from '@supabase/supabase-js'

import { requireServiceRoleKey, serverEnv } from '@/config/env.server'

export function createAdminClient() {
  return createSupabaseClient(
    serverEnv.NEXT_PUBLIC_SUPABASE_URL,
    requireServiceRoleKey()
  )
}
