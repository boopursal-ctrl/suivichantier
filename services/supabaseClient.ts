// services/supabaseClient.ts - VERSION CORRECTE
import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = 'https://vcsdfuasanofcwqrwsuf.supabase.co';
export const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjc2RmdWFzYW5vZmN3cXJ3c3VmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NTQ1MTksImV4cCI6MjA4MDQzMDUxOX0.2Sdg2iFOU-I5HaA1F0Wm3FIFwHkl1EjYRV1a7XeaW68';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storage: {
      getItem: (key) => {
        try {
          return localStorage.getItem(key);
        } catch {
          return null;
        }
      },
      setItem: (key, value) => {
        try {
          localStorage.setItem(key, value);
        } catch {
          // Ignore les erreurs de localStorage
        }
      },
      removeItem: (key) => {
        try {
          localStorage.removeItem(key);
        } catch {
          // Ignore les erreurs de localStorage
        }
      },
    },
  },
});

// Test de connexion (optionnel)
supabase.auth.getSession().then(({ data, error }) => {
  if (error) {
    console.error('❌ Supabase connection error:', error);
  } else {
    console.log('✅ Supabase client initialized successfully');
  }
});
