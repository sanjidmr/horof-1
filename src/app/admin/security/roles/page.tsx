import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import RolesPermissionsManager from '@/components/admin/security/RolesPermissionsManager';

export const metadata: Metadata = {
  title: 'Roles & Permissions',
};

export default async function SecurityRolesPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect('/login');

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Strict server-side guard: the roles page requires security_center.view.
  // The middleware enforces the same rule, this is defense-in-depth
  // so a direct hit on the URL can never render the manager.
  try {
    const { data: allowed } = await supabase.rpc('has_permission', { p_code: 'security_center.view' });
    if (allowed !== true) redirect('/admin/forbidden');
  } catch {
    redirect('/admin/forbidden');
  }

  return <RolesPermissionsManager />;
}
