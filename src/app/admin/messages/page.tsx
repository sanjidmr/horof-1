import { createSupabaseServerClient } from '@/lib/supabase/server';
import { MessagesClient } from './MessagesClient';

export default async function AdminMessagesPage() {
  const supabase = await createSupabaseServerClient();

  const { data: messages, error } = await supabase
    .from('contact_messages')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching messages:', error);
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold text-[#1a4731]">Messages</h1>
          <p className="text-slate-500 mt-2">Manage customer inquiries and contact requests.</p>
        </div>
      </div>

      <MessagesClient initialMessages={messages || []} />
    </div>
  );
}
