import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div className="flex flex-col gap-1 text-center">
          <h1 className="text-2xl font-semibold">Scoutbase</h1>
          <p className="text-sm text-[var(--foreground-muted)]">
            Sign in to your allow-listed account.
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
