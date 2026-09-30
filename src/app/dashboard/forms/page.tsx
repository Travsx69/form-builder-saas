import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { FormsListClient } from './FormsListClient';

async function getForms(userId: string) {
  return prisma.form.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      description: true,
      slug: true,
      isPublished: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { responses: true } },
    },
  });
}

export default async function FormsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  const forms = await getForms(session.user.id);

  return <FormsListClient initialForms={forms} />;
}