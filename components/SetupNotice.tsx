export default function SetupNotice({ db, ai }: { db: boolean; ai: boolean }) {
  if (db && ai) return null;
  return (
    <div className="card mt-3 border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
      <p className="font-semibold">Setup not finished</p>
      <ul className="mt-1 list-disc pl-5">
        {!db && <li>Database not connected (DATABASE_URL). Nothing can be saved yet.</li>}
        {!ai && <li>AI key not set (ANTHROPIC_API_KEY). Drafts use the plain templates and quick quote is off.</li>}
      </ul>
    </div>
  );
}
