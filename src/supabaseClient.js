import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("VITE_SUPABASE_URL is missing in your .env file");
}

if (!supabaseKey) {
  throw new Error("VITE_SUPABASE_ANON_KEY is missing in your .env file");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
