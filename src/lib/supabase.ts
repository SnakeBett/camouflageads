import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://tthvqqjjjqifzskzioyb.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0aHZxcWpqanFpZnpza3ppb3liIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MTc4MzEsImV4cCI6MjA4OTk5MzgzMX0.FALMPeDb9gYw6TJfBXXNdBZ_PgZzrQEUFx1a180JFJQ";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
