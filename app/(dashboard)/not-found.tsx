import Link from "next/link";

// Streams inside the dashboard shell, so the HTTP status stays 200 (loading.tsx starts the stream);
// Next adds a noindex meta tag. See node_modules/next/dist/docs/01-app/02-guides/streaming.md.
export default function NotFound() {
  return (
    <div className="mx-auto mt-24 max-w-md text-center">
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">This page doesn&apos;t exist in the HR dashboard.</p>
      <Link href="/" className="mt-4 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline">
        Back to dashboard
      </Link>
    </div>
  );
}
