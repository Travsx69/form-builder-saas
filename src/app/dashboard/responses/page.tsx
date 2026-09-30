import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ResponsesList } from './ResponsesList';

export default async function ResponsesPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  return <ResponsesList userId={session.user.id} />;
}