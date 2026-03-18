import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '/utils/supabase/info';

// Singleton Supabase client instance
let supabaseInstance: ReturnType<typeof createClient> | null = null;

export function getSupabase() {
  if (!supabaseInstance) {
    const url = `https://${projectId}.supabase.co`;
    console.log('[Supabase] Creating client instance');
    console.log('[Supabase] URL:', url);
    console.log('[Supabase] Project ID:', projectId);
    
    supabaseInstance = createClient(url, publicAnonKey);
  }
  return supabaseInstance;
}