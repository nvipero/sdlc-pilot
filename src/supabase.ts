import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) as
  | string
  | undefined;

/**
 * The Supabase client for accounts and notes, or null when the app is built without the
 * Supabase address and key. The board does not depend on it and works either way.
 */
export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null;
