// Route-level Suspense boundary: lets navigations show this instantly while the page streams.
export default function Loading() {
  return (
    <div className="grid animate-pulse gap-4" aria-busy="true" aria-label="Loading">
      <div className="h-9 w-56 rounded-lg bg-muted" />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => <div key={i} className="h-32 rounded-xl bg-muted" />)}
      </div>
      <div className="h-72 rounded-xl bg-muted" />
    </div>
  );
}
