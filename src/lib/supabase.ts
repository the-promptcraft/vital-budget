import { createClient, SupabaseClient } from "@supabase/supabase-js";

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  enabled: boolean;
}

export function getSupabaseClient(config?: SupabaseConfig): SupabaseClient | null {
  const url =
    config?.url ||
    (typeof window !== "undefined"
      ? localStorage.getItem("vitalbudget_supabase_url") || ""
      : "") ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "";

  const anonKey =
    config?.anonKey ||
    (typeof window !== "undefined"
      ? localStorage.getItem("vitalbudget_supabase_key") || ""
      : "") ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";

  if (!url || !anonKey || !url.startsWith("http")) {
    return null;
  }

  try {
    return createClient(url, anonKey);
  } catch {
    return null;
  }
}
