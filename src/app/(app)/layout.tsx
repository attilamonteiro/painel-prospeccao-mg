import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/shared/components/Sidebar';
import { ChatWidget } from '@/features/chat/components/ChatWidget';
import { createClient } from '@/shared/lib/supabase/server';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar />
      <main className="flex-1 overflow-x-hidden p-4 md:p-6">{children}</main>
      <ChatWidget />
    </div>
  );
}
