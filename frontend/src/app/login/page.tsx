"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";

export default function LoginPage() {
  const router = useRouter();
  const { login, loading, error } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await login(email, password);
    if (!useAuthStore.getState().error) {
      router.push("/dashboard");
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-5 text-sm">
      <h1 className="text-lg font-semibold text-slate-50">Login</h1>
      <p className="text-xs text-slate-300">
        Authenticate against the Schedula backend. You&apos;ll get a JWT from{" "}
        <code className="rounded bg-slate-800 px-1 py-0.5 text-[10px]">
          /api/login
        </code>{" "}
        and it will be stored in <code>localStorage</code>.
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1">
          <label className="block text-xs text-slate-300">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-50 outline-none ring-brand-500/60 focus:border-brand-500 focus:ring-1"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs text-slate-300">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-50 outline-none ring-brand-500/60 focus:border-brand-500 focus:ring-1"
          />
          <p className="text-[11px] text-slate-500">
            Must satisfy backend password rules (uppercase, lowercase, number,
            special character).
          </p>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-full items-center justify-center rounded-md bg-brand-600 px-3 py-2 text-xs font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-700"
        >
          {loading ? "Logging in…" : "Login"}
        </button>
      </form>

      <p className="text-[11px] text-slate-400">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-medium text-brand-400 hover:text-brand-300"
        >
          Register
        </Link>
      </p>
    </div>
  );
}


