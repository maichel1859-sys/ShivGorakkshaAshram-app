import { redirect } from 'next/navigation';

interface EditUserPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditUserPage({ params }: EditUserPageProps) {
  const resolvedParams = await params;
  console.log('Redirecting from user edit:', resolvedParams.id);
  redirect(`/admin/users`);
}
