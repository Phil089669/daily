import type { SupabaseClient } from '@supabase/supabase-js'
import type { SyncedTable } from './db.ts'
import { RemoteError, type Remote } from './sync.ts'

const tableNames: Record<SyncedTable, string> = {
  categories: 'categories',
  habits: 'habits',
  habitEvents: 'habit_events',
  settings: 'settings',
}

/** The sync tables through PostgREST; row level security limits everything to the signed-in user. */
export function supabaseRemote(client: SupabaseClient): Remote {
  return {
    async push(table, rows) {
      const { error } = await client.from(tableNames[table]).upsert(rows, { onConflict: 'user_id,id' })
      if (error) throw new RemoteError(error.message, error.code)
    },
    async pull(table, since, limit) {
      let query = client.from(tableNames[table]).select('*').order('synced_at', { ascending: true }).limit(limit)
      if (since) query = query.gt('synced_at', since)
      const { data, error } = await query
      if (error) throw new RemoteError(error.message, error.code)
      return data ?? []
    },
  }
}
