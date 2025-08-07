import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'User Dashboard',
  description: 'User dashboard for Shivgoraksha Ashram Management System',
};

interface UserLayoutProps {
  children: React.ReactNode;
  modal: React.ReactNode;
  notifications: React.ReactNode;
}

export default function UserLayout({
  children,
  modal,
  notifications,
}: UserLayoutProps) {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your appointments and notifications
          </p>
        </div>
      </div>

      {/* Notifications */}
      {notifications}

      {/* Main Content */}
      {children}

      {/* Modal Overlay */}
      {modal}
    </div>
  );
}