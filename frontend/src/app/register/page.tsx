"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";

export default function RegisterPage() {
  const router = useRouter();
  const { register, loading, error } = useAuthStore();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"Admin" | "Client">("Client");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await register({ fullName, email, password, role });
    if (!useAuthStore.getState().error) {
      router.push("/dashboard");
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-5 text-sm">
      <h1 className="text-lg font-semibold text-slate-50">Register</h1>
      <p className="text-xs text-slate-300">
        Create a Schedula account. Use <span className="font-mono">Admin</span>{" "}
        for back-office management, or <span className="font-mono">Client</span>{" "}
        for booking-only access.
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1">
          <label className="block text-xs text-slate-300">Full name</label>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-50 outline-none ring-brand-500/60 focus:border-brand-500 focus:ring-1"
          />
        </div>
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
            Must include upper, lower, number, and special character.
          </p>
        </div>
        <div className="space-y-1">
          <label className="block text-xs text-slate-300">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "Admin" | "Client")}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-50 outline-none ring-brand-500/60 focus:border-brand-500 focus:ring-1"
          >
            <option value="Client">Client</option>
            <option value="Admin">Admin</option>
          </select>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-full items-center justify-center rounded-md bg-brand-600 px-3 py-2 text-xs font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-700"
        >
          {loading ? "Creating account…" : "Register"}
        </button>
      </form>

      <p className="text-[11px] text-slate-400">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-brand-400 hover:text-brand-300"
        >
          Login
        </Link>
      </p>
    </div>
  );
}


