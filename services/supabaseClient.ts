// services/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vcsdfuasanofcwqrwsuf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjc2RmdWFzYW5vZmN3cXJ3c3VmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NTQ1MTksImV4cCI6MjA4MDQzMDUxOX0.2Sdg2iFOU-I5HaA1F0Wm3FIFwHkl1EjYRV1a7XeaW68';

// Vérifiez que la clé n'est pas la clé par défaut
if (supabaseKey.includes('YOUR_') || supabaseKey.length < 30) {
  console.error('❌ CRITICAL: Supabase key is not properly configured!');
  console.error('Please update your supabaseClient.ts with the correct key from Supabase dashboard');
}

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

// Override fetch global pour détecter les requêtes directes
const originalFetch = window.fetch;
window.fetch = async function(...args) {
  const url = args[0];
  
  // Détecter les requêtes directes à Supabase sans client
  if (typeof url === 'string' && url.includes('supabase.co') && !url.includes('/auth/')) {
    console.warn('⚠️ DETECTED DIRECT SUPABASE REQUEST:', url);
    console.trace('Stack trace:');
    
    // Vous pouvez bloquer ces requêtes
    // throw new Error('Use supabase client instead of direct fetch to Supabase API');
  }
  
  return originalFetch.apply(this, args);
};

// Log pour vérifier la connexion
supabase.auth.getSession().then(({ data, error }) => {
  if (error) {
    console.error('❌ Supabase connection error:', error);
  } else {
    console.log('✅ Supabase client initialized successfully');
  }
});
