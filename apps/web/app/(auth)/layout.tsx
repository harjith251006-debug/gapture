export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-xl font-semibold text-center">Gapture</h1>
        {children}
      </div>
    </div>
  );
}
