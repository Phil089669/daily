/** ISO timestamp of the build, injected by Vite. */
declare const __APP_BUILD__: string

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
}
