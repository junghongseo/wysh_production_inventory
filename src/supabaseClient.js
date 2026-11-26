import { createClient } from '@supabase/supabase-js';
import { authStorage } from './services/authStorage';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let supabaseClient = null;

if (supabaseUrl && supabaseAnonKey) {
  try {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: authStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false
      }
    });
    console.log("Supabase Connection: Active (Synced with Cloud DB)");
  } catch (e) {
    console.error("Failed to initialize Supabase client:", e);
  }
} else {
  console.error("Supabase Connection: Inactive (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 누락)");
}

export const supabase = supabaseClient;
