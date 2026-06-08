// supabaseClient.js
const supabaseUrl = 'https://omqhirmojwikecylmrgc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tcWhpcm1vandpa2VjeWxtcmdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MzczNzAsImV4cCI6MjA5NjQxMzM3MH0.rC_wlKXvSV02UnhPARUEQbUGobAuBJysv_QhqSe_8z4';

// Initialize the Supabase client globally
window.supabase = window.supabase.createClient(supabaseUrl, supabaseKey);