import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

console.log("DEBUG: VITE_SUPABASE_URL =", supabaseUrl);
console.log("DEBUG: VITE_SUPABASE_ANON_KEY =", supabaseAnonKey);

let supabaseClient = null;

if (supabaseUrl && supabaseAnonKey) {
  try {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    console.log("Supabase Connection: Active (Synced with Cloud DB)");
  } catch (e) {
    console.error("Failed to initialize Supabase client:", e);
  }
} else {
  console.log("Supabase Connection: Inactive (Running in LocalStorage fallback mode)");
}

export const supabase = supabaseClient;
