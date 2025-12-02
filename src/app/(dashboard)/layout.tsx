import { Sidebar } from '@/components/layout';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AlertBanner } from '@/components/alerts';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AlertBanner />
        <main className="flex-1 overflow-hidden">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
