import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://grhsttrbgrbzywcyglkx.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyaHN0dHJiZ3Jienl3Y3lnbGt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3NTEzNjMsImV4cCI6MjEwNjMyNzM2M30.oPCTm5EDgj6Iw29NmZUtxO_ds8uMJZw-LDVqeRtULXE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

