import { createClient } from "@supabase/supabase-js";

const supabaseUrl = ((import.meta as any).env.VITE_SUPABASE_URL as string) || "https://qbxhiotajolnmqttspgu.supabase.co";
const supabaseAnonKey = ((import.meta as any).env.VITE_SUPABASE_ANON_KEY as string) || "sb_publishable_jWQZ5eq_oPKfq4NCANCKZg_F0odmFMa";

export const isSupabaseConfigured = !!(supabaseUrl && supabaseUrl.trim() !== "" && supabaseAnonKey && supabaseAnonKey.trim() !== "");

let supabaseClient: any = null;

export function getSupabase() {
  if (!isSupabaseConfigured) return null;
  if (!supabaseClient) {
    try {
      supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false
        }
      });
    } catch (e) {
      console.error("Failed to initialize Supabase client:", e);
      return null;
    }
  }
  return supabaseClient;
}
