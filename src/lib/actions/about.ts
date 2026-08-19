'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// ============================================================
// ABOUT PAGE (single row)
// ============================================================

export async function getAboutPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data } = await supabase.from('about_page').select('*').limit(1).single();
  return data;
}

export async function upsertAboutPage(payload: Record<string, any>) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: 'Supabase not configured' };

  const { requirePermission } = await import('./security');
  try {
    await requirePermission('display_pages.edit');
  } catch {
    return { error: 'Permission denied' };
  }

  const { data: existing } = await supabase.from('about_page').select('id').limit(1).single();

  if (existing) {
    const { error } = await supabase.from('about_page').update(payload).eq('id', existing.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from('about_page').insert(payload);
    if (error) return { error: error.message };
  }

  revalidatePath('/about');
  revalidatePath('/admin/marketing/about');
  return { error: null };
}

// ============================================================
// TEAM MEMBERS
// ============================================================

export async function getAboutTeamMembers(admin = false) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  let query = supabase.from('about_team_members').select('*');
  if (!admin) query = query.eq('is_active', true);
  const { data } = await query.order('display_order', { ascending: true });
  return data || [];
}

export async function createTeamMember(data: { name: string; position: string; bio?: string; email?: string; phone?: string; image_url?: string; social_links?: any; display_order?: number; is_active?: boolean }) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: 'Supabase not configured' };
  const { requirePermission } = await import('./security');
  try {
    await requirePermission('display_pages.edit');
  } catch {
    return { error: 'Permission denied' };
  }
  const { error } = await supabase.from('about_team_members').insert(data);
  if (error) return { error: error.message };
  revalidatePath('/about');
  revalidatePath('/admin/marketing/about');
  return { error: null };
}

export async function updateTeamMember(id: string, data: Record<string, any>) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: 'Supabase not configured' };
  const { requirePermission } = await import('./security');
  try {
    await requirePermission('display_pages.edit');
  } catch {
    return { error: 'Permission denied' };
  }
  const { error } = await supabase.from('about_team_members').update(data).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/about');
  revalidatePath('/admin/marketing/about');
  return { error: null };
}

export async function deleteTeamMember(id: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: 'Supabase not configured' };
  const { requirePermission } = await import('./security');
  try {
    await requirePermission('display_pages.delete');
  } catch {
    return { error: 'Permission denied' };
  }
  const { error } = await supabase.from('about_team_members').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/about');
  revalidatePath('/admin/marketing/about');
  return { error: null };
}

// ============================================================
// VALUES
// ============================================================

export async function getAboutValues(admin = false) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  let query = supabase.from('about_values').select('*');
  if (!admin) query = query.eq('is_active', true);
  const { data } = await query.order('display_order', { ascending: true });
  return data || [];
}

export async function createValue(data: { title: string; description?: string; icon?: string; color?: string; display_order?: number; is_active?: boolean }) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: 'Supabase not configured' };
  const { requirePermission } = await import('./security');
  try {
    await requirePermission('display_pages.edit');
  } catch {
    return { error: 'Permission denied' };
  }
  const { error } = await supabase.from('about_values').insert(data);
  if (error) return { error: error.message };
  revalidatePath('/about');
  revalidatePath('/admin/marketing/about');
  return { error: null };
}

export async function updateValue(id: string, data: Record<string, any>) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: 'Supabase not configured' };
  const { requirePermission } = await import('./security');
  try {
    await requirePermission('display_pages.edit');
  } catch {
    return { error: 'Permission denied' };
  }
  const { error } = await supabase.from('about_values').update(data).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/about');
  revalidatePath('/admin/marketing/about');
  return { error: null };
}

export async function deleteValue(id: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: 'Supabase not configured' };
  const { requirePermission } = await import('./security');
  try {
    await requirePermission('display_pages.delete');
  } catch {
    return { error: 'Permission denied' };
  }
  const { error } = await supabase.from('about_values').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/about');
  revalidatePath('/admin/marketing/about');
  return { error: null };
}

// ============================================================
// WHY CHOOSE US
// ============================================================

export async function getAboutWhyChooseUs(admin = false) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  let query = supabase.from('about_why_choose_us').select('*');
  if (!admin) query = query.eq('is_active', true);
  const { data } = await query.order('display_order', { ascending: true });
  return data || [];
}

export async function createWhyChooseUs(data: { title: string; description?: string; icon?: string; display_order?: number; is_active?: boolean }) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: 'Supabase not configured' };
  const { requirePermission } = await import('./security');
  try {
    await requirePermission('display_pages.edit');
  } catch {
    return { error: 'Permission denied' };
  }
  const { error } = await supabase.from('about_why_choose_us').insert(data);
  if (error) return { error: error.message };
  revalidatePath('/about');
  revalidatePath('/admin/marketing/about');
  return { error: null };
}

export async function updateWhyChooseUs(id: string, data: Record<string, any>) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: 'Supabase not configured' };
  const { requirePermission } = await import('./security');
  try {
    await requirePermission('display_pages.edit');
  } catch {
    return { error: 'Permission denied' };
  }
  const { error } = await supabase.from('about_why_choose_us').update(data).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/about');
  revalidatePath('/admin/marketing/about');
  return { error: null };
}

export async function deleteWhyChooseUs(id: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: 'Supabase not configured' };
  const { requirePermission } = await import('./security');
  try {
    await requirePermission('display_pages.delete');
  } catch {
    return { error: 'Permission denied' };
  }
  const { error } = await supabase.from('about_why_choose_us').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/about');
  revalidatePath('/admin/marketing/about');
  return { error: null };
}

// ============================================================
// SEED DEFAULT DATA
// ============================================================

export async function seedAboutPageDefaults() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: 'Supabase not configured' };

  const { requirePermission } = await import('./security');
  try {
    await requirePermission('display_pages.edit');
  } catch {
    return { error: 'Permission denied' };
  }

  const { data: existing } = await supabase.from('about_page').select('id').limit(1).single();
  if (existing) return { error: 'About page already exists' };

  const { error } = await supabase.from('about_page').insert({
    hero_title: 'Origin of Horof',
    hero_subtitle: 'Our Eternal Chronicle',
    hero_description: "We don't just build furniture; we curate the silent whispers of the forest into heirlooms that define your spaces.",
    hero_badge: 'Our Eternal Chronicle',
    hero_button_text: 'Explore Collection',
    hero_button_link: '/products',
    story_title: 'Our Story',
    story_subtitle: 'A legacy of craftsmanship',
    story_content: "Founded in a small workshop in Chittagong with just three artisans and a dream to preserve Bengali woodcraft. Over 25 years, we've grown into Bangladesh's most celebrated artisan furniture house.",
    founder_title: 'Meet Our Founder',
    founder_name: 'Abdul Karim Horof',
    founder_designation: 'Founder & Master Artisan',
    founder_bio: "Born in the heart of Chittagong, Abdul Karim Horof grew up watching his grandfather breathe life into raw timber. At 17, he picked up his first chisel — and never put it down. With a philosophy rooted in 'Slow Craft' and ecological responsibility, he turned a humble garage workshop into Bangladesh's most celebrated artisan furniture house.",
    founder_quote: "A piece of furniture is not complete until it carries a memory — the memory of the tree, the artisan, and the home it will grace.",
    mission_title: 'Our Mission',
    mission_description: 'To preserve and celebrate the ancient art of Bengali woodcraft while creating timeless furniture that bridges tradition and modern living.',
    mission_icon: 'Target',
    vision_title: 'Our Vision',
    vision_description: 'To be the global standard for sustainable artisan furniture, where every piece tells a story of heritage, craftsmanship, and ecological responsibility.',
    vision_icon: 'Eye',
    cta_title: 'Start Your Own Legacy',
    cta_description: "Our pieces aren't just bought — they're inherited. Connect with our artisans or explore the collection that will define your space for generations.",
    cta_button_text: 'Shop Collections',
    cta_button_link: '/products',
    cta_secondary_button_text: 'Contact Us',
    cta_secondary_button_link: '/contact',
  });

  if (error) return { error: error.message };

  // Seed default values
  await supabase.from('about_values').insert([
    { title: 'Eco-Conscious', description: 'Timber sourced only from naturally fallen trees or verified ethical plantations.', icon: 'Leaf', color: 'bg-emerald-50 text-emerald-700 border-emerald-100', display_order: 0 },
    { title: 'Ancestral Mastery', description: 'Seven generations of woodcraft wisdom encoded in every chisel stroke.', icon: 'Sparkles', color: 'bg-amber-50 text-amber-700 border-amber-100', display_order: 1 },
    { title: '12-Point Inspection', description: 'Every piece passes our rigorous structural and spiritual quality seal.', icon: 'ShieldCheck', color: 'bg-blue-50 text-blue-700 border-blue-100', display_order: 2 },
    { title: 'Modern Innovation', description: 'Timeless techniques fused with contemporary ergonomic design thinking.', icon: 'Zap', color: 'bg-purple-50 text-purple-700 border-purple-100', display_order: 3 },
  ]);

  // Seed default why choose us
  await supabase.from('about_why_choose_us').insert([
    { title: 'Handcrafted Excellence', description: 'Every piece is meticulously handcrafted by master artisans with decades of experience.', icon: 'Award', display_order: 0 },
    { title: 'Sustainable Materials', description: 'We use only ethically sourced, sustainable hardwoods from verified plantations.', icon: 'Leaf', display_order: 1 },
    { title: 'Lifetime Warranty', description: 'Our furniture comes with a lifetime structural warranty — built to last generations.', icon: 'ShieldCheck', display_order: 2 },
    { title: 'Custom Design', description: 'Work directly with our artisans to create bespoke pieces tailored to your vision.', icon: 'Sparkles', display_order: 3 },
    { title: 'Free Delivery', description: 'Complimentary white-glove delivery and installation across Bangladesh.', icon: 'Truck', display_order: 4 },
    { title: 'Heritage Craft', description: 'Each piece carries 25+ years of traditional Bengali woodcraft heritage.', icon: 'TreePine', display_order: 5 },
  ]);

  revalidatePath('/about');
  revalidatePath('/admin/marketing/about');
  return { error: null };
}
