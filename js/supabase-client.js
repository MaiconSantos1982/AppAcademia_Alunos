// js/supabase-client.js
const supabaseUrl = 'https://ncprqzwpuhnbcdjmgrzy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jcHJxendwdWhuYmNkam1ncnp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxMDQ0ODMsImV4cCI6MjA2ODY4MDQ4M30.IZF2_rIrOaipFsGQfpHrykRpbN95Cr8hy6T-h_S_7QE';
const supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);

// Exporta para usar em outros arquivos (ou apenas mantenha como global no navegador)
window.supabase = supabase;
