import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.PUBLIC_SUPABASE_URL ?? 'https://cfpvkmybbbhycmliseia.supabase.co';

const supabasePublishableKey =
  import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmcHZrbXliYmJoeWNtbGlzZWlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMDU5OTIsImV4cCI6MjA5Mjc4MTk5Mn0.ruV1PdtdipD6eaMjPPUXCu_X4GtRjT2Vfk1fE6cd4w0';

export const supabase = createClient(supabaseUrl, supabasePublishableKey);
