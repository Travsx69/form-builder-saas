import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { BillingContent } from './BillingContent';

export default async function BillingPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  return <BillingContent />;
}