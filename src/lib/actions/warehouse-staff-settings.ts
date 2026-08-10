'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// ─── Get own profile ─────────────────────────────────────────────────────────

export async function getWarehouseStaffProfile() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error('Database connection not available');

  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) throw new Error('Unauthorized');

  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id, email, full_name, phone, avatar_url, assigned_warehouse_id, is_warehouse_staff, role, user_type, created_at')
    .eq('id', user.id)
    .single();

  if (profileErr || !profile) throw new Error('Profile not found');

  // Fetch assigned warehouse name
  let warehouseName: string | null = null;
  if (profile.assigned_warehouse_id) {
    const { data: wh } = await supabase
      .from('warehouses')
      .select('name')
      .eq('id', profile.assigned_warehouse_id)
      .single();
    warehouseName = wh?.name ?? null;
  }

  return { profile: { ...profile, warehouse_name: warehouseName } };
}

// ─── Update own profile (name, phone, avatar) ────────────────────────────────

export async function updateWarehouseStaffProfile(data: {
  full_name?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
}) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error('Database connection not available');

  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) throw new Error('Unauthorized');

  // Validate phone uniqueness against other internal users if changing
  // (customer phones may collide harmlessly - staff log in by email, not phone)
  if (data.phone !== undefined && data.phone !== null && data.phone.trim() !== '') {
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('phone', data.phone.trim())
      .eq('user_type', 'internal')
      .neq('id', user.id)
      .maybeSingle();
    if (existing) throw new Error('This phone number is already in use by another internal user');
  }

  const updates: Record<string, any> = {};
  if (data.full_name !== undefined) updates.full_name = data.full_name?.trim() || null;
  if (data.phone !== undefined) updates.phone = data.phone?.trim() || null;
  if (data.avatar_url !== undefined) updates.avatar_url = data.avatar_url || null;

  if (Object.keys(updates).length === 0) return { ok: true };

  const { error: updateErr } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id);

  if (updateErr) throw new Error(updateErr.message);

  // Sync to auth metadata for consistency
  const authUpdates: Record<string, any> = {};
  if (updates.full_name !== undefined) authUpdates.full_name = updates.full_name;
  if (updates.avatar_url !== undefined) authUpdates.avatar_url = updates.avatar_url;
  if (Object.keys(authUpdates).length > 0) {
    await supabase.auth.updateUser({ data: authUpdates });
  }

  revalidatePath('/admin/warehouse/settings');
  return { ok: true };
}

// ─── Change own password ─────────────────────────────────────────────────────

export async function changeWarehouseStaffPassword(data: {
  currentPassword: string;
  newPassword: string;
}) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error('Database connection not available');

  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) throw new Error('Unauthorized');

  if (!user.email) throw new Error('No email associated with this account');

  // Verify current password by re-authenticating
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: data.currentPassword,
  });
  if (signInErr) throw new Error('Current password is incorrect');

  // Validate new password strength
  if (data.newPassword.length < 8) throw new Error('New password must be at least 8 characters');
  if (data.newPassword === data.currentPassword) throw new Error('New password must be different from current');

  // Update password
  const { error: updateErr } = await supabase.auth.updateUser({
    password: data.newPassword,
  });
  if (updateErr) throw new Error(updateErr.message);

  return { ok: true };
}
