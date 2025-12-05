
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vcsdfuasanofcwqrwsuf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjc2RmdWFzYW5vZmN3cXJ3c3VmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NTQ1MTksImV4cCI6MjA4MDQzMDUxOX0.2Sdg2iFOU-I5HaA1F0Wm3FIFwHkl1EjYRV1a7XeaW68';

export const supabase = createClient(supabaseUrl, supabaseKey);
