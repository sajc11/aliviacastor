import { supabase } from '../lib/supabase.ts';

export default function EnvProbe() {
  // touching supabase here guarantees the module executes client-side
  if (typeof window !== 'undefined') {
    (window as any).__supabase = supabase;
    (window as any).__ENV = {
      PUBLIC_SUPABASE_URL: import.meta.env.PUBLIC_SUPABASE_URL,
      PUBLIC_SUPABASE_ANON_KEY: import.meta.env.PUBLIC_SUPABASE_ANON_KEY?.slice(0, 8) + '…',
    };
  }
  return null;
}
