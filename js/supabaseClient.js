// js/supabaseClient.js

// On importe la fonction 'createClient' depuis la bibliothèque Supabase
// que nous avons ajoutée dans index.html.
// Note: Le '@supabase/supabase-js' est un nom spécial reconnu par le script.
const { createClient } = supabase;

// =================== VOS CLÉS SONT À METTRE ICI ===================

// 1. Collez votre URL de projet (ex: "https://abcd.supabase.co")
const SUPABASE_URL = "https://kuwyphkgiruyasegpheb.supabase.co";

// 2. Collez votre clé API 'anon' (ex: "eyJ...")
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1d3lwaGtnaXJ1eWFzZWdwaGViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3ODEwNTYsImV4cCI6MjA3NzM1NzA1Nn0.3KdQv8kTseM0m2uPrcTbGRefi_oEWBqWCqvZfvmSg1M";

// ==================================================================

// On crée et on exporte le client Supabase
// C'est cet objet 'supabaseClient' que nos autres fichiers (comme db.js)
// vont utiliser pour parler à la base de données.
export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);