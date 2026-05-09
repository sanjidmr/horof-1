import type { SupabaseClient } from '@supabase/supabase-js';
import type { DbProfileRow } from './types';

export async function fetchProfileForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<DbProfileRow | null> {
  const { data: byPk, error: e1 } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (!e1 && byPk) return byPk as DbProfileRow;

  const { data: byUserId, error: e2 } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (!e2 && byUserId) return byUserId as DbProfileRow;

  return null;
}
