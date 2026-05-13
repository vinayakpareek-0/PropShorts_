interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-lg font-bold text-white">
            PS
          </div>
          <h1 className="text-2xl font-bold text-gray-900">PropShorts</h1>
          <p className="mt-1 text-sm text-gray-500">AI-powered property recommendations</p>
        </div>
        {children}
      </div>
    </div>
  );
}
