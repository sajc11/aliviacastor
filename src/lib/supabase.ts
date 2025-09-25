// src/lib/supabase.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.PUBLIC_SUPABASE_URL;
const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

function makeStub(): SupabaseClient<any, any, any> {
  // Minimal surface we use in the app; everything returns harmless results.
  const ok = async () => ({ data: [], error: null });
  const noop = async () => ({ data: null, error: null });
  const stub: any = {
    from: (_t: string) => ({
      select: ok, insert: noop, update: noop, upsert: noop, delete: noop,
      order: () => ({ select: ok }), eq: () => ({ select: ok }), in: () => ({ select: ok }),
      range: () => ({ select: ok }),
    }),
    auth: { getUser: async () => ({ data: { user: null }, error: null }) },
    storage: {
      from: (_b: string) => ({
        upload: noop,
        createSignedUrl: async () => ({ data: { signedUrl: '' }, error: null }),
        list: ok,
      }),
    },
  };
  return stub as SupabaseClient;
}

export const supabase: SupabaseClient =
  url && key
    ? createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          storageKey: 'aliviacastor-site-auth',
        },
      })
    : makeStub();
    
if (typeof window !== 'undefined') {
  (window as any).__ENV = {
    PUBLIC_SUPABASE_URL: import.meta.env.PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_ANON_KEY: import.meta.env.PUBLIC_SUPABASE_ANON_KEY?.slice(0, 8) + '…'
  };
  (window as any).__supabase = supabase; // handy for live queries in console
  if (import.meta.env.DEV) {
    console.log('[env]', (window as any).__ENV);
  }
}
