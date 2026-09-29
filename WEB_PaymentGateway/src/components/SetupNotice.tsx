interface SetupNoticeProps {
  message: string;
}

/** Shown instead of the catalogue when the database is not reachable or not configured. */
export default function SetupNotice({ message }: SetupNoticeProps) {
  return (
    <div className="my-10 rounded-2xl border border-warning/30 bg-warning-soft p-6">
      <p className="font-display text-xl">The shop can&apos;t reach its database.</p>
      <p className="mt-2 text-sm text-ink/80">{message}</p>
      <p className="mt-3 text-sm text-ink/80">
        Set <code className="rounded bg-white px-1.5 py-0.5 text-xs">MONGODB_URI</code> in{" "}
        <code className="rounded bg-white px-1.5 py-0.5 text-xs">.env.local</code> (or in the Vercel project settings) and reload.
      </p>
    </div>
  );
}
