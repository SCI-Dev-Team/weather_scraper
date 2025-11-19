/**
 * Database configuration and client initialization
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export const validateDatabaseConnection = async () => {
  try {
    const { error } = await supabase.from('areas').select('count').limit(1);
    if (error) throw error;
    return { success: true, message: 'Database connection successful' };
  } catch (error) {
    return { success: false, message: `Database connection failed: ${error.message}` };
  }
};
