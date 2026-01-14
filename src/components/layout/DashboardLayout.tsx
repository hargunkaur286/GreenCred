import { ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export function DashboardLayout({ children, title, subtitle }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-16">
        {/* Page Header */}
        <div className="bg-primary/5 border-b border-border">
          <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
            <h1 className="font-heading text-3xl font-bold text-foreground">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-2 text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}
