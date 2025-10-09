import { redirect } from 'next/navigation';

interface ViewUserPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ViewUserPage({ params }: ViewUserPageProps) {
  const resolvedParams = await params;
  console.log('Redirecting from user view:', resolvedParams.id);
  redirect(`/admin/users`);
}
