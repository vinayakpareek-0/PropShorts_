import Link from "next/link";

interface CreateLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  step?: number;
  totalSteps?: number;
}

export default function CreateLayout({
  children,
  title,
  subtitle,
  step,
  totalSteps,
}: CreateLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
              PS
            </div>
            <span className="text-lg font-semibold text-gray-900">PropShorts</span>
          </Link>
          {step && totalSteps && (
            <span className="text-sm text-gray-500">
              Step {step} of {totalSteps}
            </span>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
        </div>
        {children}
      </main>
    </div>
  );
}
