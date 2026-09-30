import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://grhsttrbgrbzywcyglkx.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyaHN0dHJiZ3Jienl3Y3lnbGt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3NTEzNjMsImV4cCI6MjEwNjMyNzM2M30.oPCTm5EDgj6Iw29NmZUtxO_ds8uMJZw-LDVqeRtULXE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
