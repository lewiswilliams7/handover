export default function PortalNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#080D14] px-4">
      <div className="w-full max-w-lg rounded-[var(--radius-lg)] border border-[var(--border)] bg-[#0f172a] p-8 text-center">
        <h1 className="text-2xl font-semibold text-white">Portal not found</h1>
        <p className="mt-2 text-[14px] text-[var(--text-secondary)]">
          Portal not found
        </p>
      </div>
    </div>
  );
}
