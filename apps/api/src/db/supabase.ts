import { createClient } from '@supabase/supabase-js';
import type { Database } from './types.js';
import { mockSupabase } from './mock.js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

// Use mock database if Supabase is not configured
const useMock = !supabaseUrl || supabaseUrl === 'http://localhost:54321' || !supabaseKey || supabaseKey === 'your-service-key-here';

if (useMock) {
  console.log('⚠️  Using mock database (in-memory storage)');
  console.log('   Set SUPABASE_URL and SUPABASE_SERVICE_KEY for production');
}

export const supabase = useMock
  ? mockSupabase as any
  : createClient<Database>(supabaseUrl!, supabaseKey!);

export const isMockMode = useMock;
