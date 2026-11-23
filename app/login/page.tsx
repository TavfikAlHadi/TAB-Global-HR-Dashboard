import { Suspense } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signIn } from "@/app/actions";

async function SignInError({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const { error } = await searchParams;
  return error ? <p role="alert" className="text-sm text-destructive">Wrong email or password. Please try again.</p> : null;
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-6 rounded-xl border bg-card p-8 text-center">
        <Image src="/logo.svg" alt="TAB Global" width={160} height={53} priority />
        <div>
          <h1 className="text-lg font-semibold">HR Dashboard</h1>
          <p className="text-sm text-muted-foreground">Sign in with your TAB Global email.</p>
        </div>
        <Suspense><SignInError searchParams={searchParams} /></Suspense>
        <form action={signIn} className="flex w-full flex-col gap-3 text-left">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Email
            <Input name="email" type="email" autoComplete="username" required />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Password
            <Input name="password" type="password" autoComplete="current-password" required />
          </label>
          <Button type="submit" size="lg" className="mt-1 w-full">Sign in</Button>
        </form>
      </div>
    </main>
  );
}
