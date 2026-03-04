// services/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vcsdfuasanofcwqrwsuf.supabase.co';
export const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjc2RmdWFzYW5vZmN3cXJ3c3VmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NTQ1MTksImV4cCI6MjA4MDQzMDUxOX0.2Sdg2iFOU-I5HaA1F0Wm3FIFwHkl1EjYRV1a7XeaW68';

// Client public (anon key) - pour les opérations normales
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storage: {
      getItem: (key) => {
        try { return localStorage.getItem(key); } catch { return null; }
      },
      setItem: (key, value) => {
        try { localStorage.setItem(key, value); } catch { /* ignore */ }
      },
      removeItem: (key) => {
        try { localStorage.removeItem(key); } catch { /* ignore */ }
      },
    },
  },
});

// Client admin (service_role key) - pour créer des utilisateurs sans rate-limit
// ⚠️ Ne communique jamais cette clé à des tiers - usage interne uniquement
const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

export const supabaseAdmin = serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
  : null;

// Test de connexion
supabase.auth.getSession().then(({ data, error }) => {
  if (error) {
    console.error('❌ Supabase connection error:', error);
  } else {
    console.log('✅ Supabase client initialized successfully');
    if (!serviceRoleKey) {
      console.warn('⚠️ VITE_SUPABASE_SERVICE_ROLE_KEY non définie - la création d\'utilisateurs utilisera un fallback');
    }
  }
});
