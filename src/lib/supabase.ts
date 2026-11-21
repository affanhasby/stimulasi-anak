import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

/** False on a build made before the Supabase project exists (e.g. the first GitHub Pages deploy). */
export const SERVER_READY = !!(url && key)

// The publishable key is meant to be public; row level security protects the data.
// PKCE returns ?code= in the query, so email links never collide with the app's #hash routes.
export const supabase = createClient(url || 'http://localhost:54321', key || 'not-configured', { auth: { flowType: 'pkce' } })
