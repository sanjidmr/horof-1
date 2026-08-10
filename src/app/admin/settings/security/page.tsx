import { createSupabaseServerClient } from '@/lib/supabase/server';
import { SuperAdminSecurityClient } from './SuperAdminSecurityClient';

export const metadata = { title: 'Super Admin Security | Admin' };

export default async function AdminSettingsSecurityPage() {
  const supabase = await createSupabaseServerClient();
  let email = '';
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    email = user?.email || '';
  }
  return <SuperAdminSecurityClient email={email} />;
}
