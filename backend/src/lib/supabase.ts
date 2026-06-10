import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://ernwvzifnfjpkpazfumb.supabase.co";
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvaXZuamJ1aHhvd3VjZ2NwcnhjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTEwNTkyOSwiZXhwIjoyMDk2NjgxOTI5fQ.Ptnwd3yAYkToRCkOuiGwQ7QHvoHDB-rhaR_Q2zWmZxg";

export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
