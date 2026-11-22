import { Suspense } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { signIn } from "@/app/actions";

async function SignInError({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const { error } = await searchParams;
  return error ? <p role="alert" className="text-sm text-destructive">Sign-in failed. Please try again.</p> : null;
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-6 rounded-xl border bg-card p-8 text-center">
        <Image src="/logo.svg" alt="TAB Global" width={160} height={53} priority />
        <div>
          <h1 className="text-lg font-semibold">HR Dashboard</h1>
          <p className="text-sm text-muted-foreground">Sign in with your TAB Global Microsoft account.</p>
        </div>
        <Suspense><SignInError searchParams={searchParams} /></Suspense>
        <form action={signIn} className="w-full">
          <Button type="submit" size="lg" className="w-full">Sign in with Microsoft</Button>
        </form>
      </div>
    </main>
  );
}
