import { createSupabaseServerClient } from '@/lib/supabase/server';
import { listRedirects } from '@/lib/actions/redirects';
import { RedirectsClient } from './RedirectsClient';

export default async function RedirectsPage() {
  const redirects = await listRedirects();
  return <RedirectsClient initialRedirects={redirects} />;
}
