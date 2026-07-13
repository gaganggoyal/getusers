"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

type Props = {
  mode: "login" | "register";
  audience?: "user" | "advertiser";
};

export default function AuthForm({ mode, audience = "user" }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isAdv = audience === "advertiser";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const form = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = Object.fromEntries(form);
    if (mode === "register" && isAdv) payload.accountType = "advertiser";
    const res = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setBusy(false);
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(data?.error ?? "Something went wrong.");
      return;
    }
    // send each role to its home
    const dest =
      data?.role === "ADMIN"
        ? "/admin"
        : data?.role === "ADVERTISER"
          ? "/advertiser"
          : (params.get("next") ?? "/dashboard");
    router.push(dest);
    router.refresh();
  }

  const input = "field";

  const heading = isAdv
    ? mode === "login"
      ? "Advertiser sign in"
      : "Create your advertiser account"
    : mode === "login"
      ? "Log in"
      : "Create your account";

  return (
    <div className="mx-auto max-w-sm mt-12 card p-6">
      {isAdv && <p className="eyebrow mb-2">For advertisers</p>}
      <h1 className="text-2xl font-bold text-slate-900 mb-2">{heading}</h1>
      {isAdv && mode === "register" && (
        <p className="mb-6 text-sm text-slate-600">
          Get your tracking key instantly and see exactly what you pay for.
        </p>
      )}
      <form onSubmit={onSubmit} className={`space-y-4 ${!isAdv || mode === "login" ? "mt-6" : ""}`}>
        {mode === "register" && isAdv && (
          <>
            <input name="company" placeholder="Company name" required className={input} />
            <input name="website" placeholder="Website (optional)" className={input} />
          </>
        )}
        {mode === "register" && (
          <input
            name="name"
            placeholder={isAdv ? "Contact person" : "Your name"}
            required
            className={input}
          />
        )}
        <input
          name="email"
          type="email"
          placeholder={isAdv ? "Work email" : "Email"}
          required
          className={input}
        />
        <input
          name="password"
          type="password"
          placeholder={mode === "register" ? "Password (8+ characters)" : "Password"}
          required
          minLength={mode === "register" ? 8 : undefined}
          className={input}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={busy} className="btn w-full">
          {busy
            ? "Please wait…"
            : mode === "login"
              ? "Sign in"
              : isAdv
                ? "Create advertiser account"
                : "Sign up"}
        </button>
      </form>

      <p className="mt-4 text-sm text-slate-600">
        {mode === "login" ? (
          <>
            No account?{" "}
            <Link
              href={isAdv ? "/advertiser/register" : "/register"}
              className="text-violet-600 hover:underline"
            >
              Sign up
            </Link>
          </>
        ) : (
          <>
            Already registered?{" "}
            <Link
              href={isAdv ? "/advertiser/login" : "/login"}
              className="text-violet-600 hover:underline"
            >
              Sign in
            </Link>
          </>
        )}
      </p>
      <p className="mt-2 text-sm text-slate-500">
        {isAdv ? (
          <>
            Want to win prizes instead?{" "}
            <Link href={mode === "login" ? "/login" : "/register"} className="text-violet-600 hover:underline">
              User {mode === "login" ? "sign in" : "sign up"}
            </Link>
          </>
        ) : (
          <>
            Are you an advertiser?{" "}
            <Link
              href={mode === "login" ? "/advertiser/login" : "/advertiser/register"}
              className="text-violet-600 hover:underline"
            >
              {mode === "login" ? "Sign in here" : "Sign up here"}
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
