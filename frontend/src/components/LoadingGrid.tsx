export default function LoadingGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="h-56 animate-pulse rounded-2xl border border-slate-100 bg-white p-6"
        >
          <div className="h-4 w-24 rounded bg-slate-200" />
          <div className="mt-4 h-6 w-48 rounded bg-slate-200" />
          <div className="mt-2 h-4 w-32 rounded bg-slate-200" />
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="h-16 rounded bg-slate-100" />
            <div className="h-16 rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}
