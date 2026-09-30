import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { SettingsContent } from './SettingsContent';

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  return <SettingsContent user={session.user} />;
}