"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { api, Service, Booking } from "@/lib/api";
import { format } from "date-fns";

export default function DashboardPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [services, setServices] = useState<Service[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }

    (async () => {
      try {
        setLoading(true);
        const [servicesRes, bookingsRes] = await Promise.all([
          api.get("/listServices?isActive=true&page=1&limit=100"),
          api.get("/listBookings?page=1&limit=20")
        ]);
        setServices(servicesRes.data.data ?? servicesRes.data.services ?? []);
        setBookings(bookingsRes.data.data ?? bookingsRes.data.bookings ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, [user, router]);

  if (!user) {
    return null;
  }

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm">
        <div>
          <p className="text-xs text-slate-400">Signed in as</p>
          <p className="text-sm font-medium text-slate-50">
            {user.fullName}{" "}
            <span className="ml-1 rounded-full bg-slate-800 px-2 py-[2px] text-[10px] uppercase tracking-wide text-slate-300">
              {user.role}
            </span>
          </p>
          <p className="text-[11px] text-slate-500">{user.email}</p>
        </div>
        <button
          onClick={() => {
            logout();
            router.push("/");
          }}
          className="inline-flex items-center justify-center rounded-md border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-800"
        >
          Logout
        </button>
      </div>

      {loading ? (
        <p className="text-xs text-slate-300">Loading dashboard…</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <section className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm">
            <h2 className="text-sm font-semibold text-slate-50">
              Services ({services.length})
            </h2>
            <p className="text-[11px] text-slate-400">
              {user.role === "Admin"
                ? "Admins can manage services via the backend API; this view shows what clients can book."
                : "These are the services you can book."}
            </p>
            <div className="mt-2 space-y-2">
              {services.map((s) => (
                <div
                  key={s.id}
                  className="rounded-md border border-slate-800 bg-slate-950/60 px-3 py-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-50">
                      {s.name}
                    </span>
                    <span className="text-xs text-slate-400">
                      {s.durationMinutes} min · ${s.price.toFixed(2)}
                    </span>
                  </div>
                  {s.description && (
                    <p className="mt-1 text-[11px] text-slate-400 line-clamp-2">
                      {s.description}
                    </p>
                  )}
                </div>
              ))}
              {!services.length && (
                <p className="text-xs text-slate-400">
                  No services available yet.
                </p>
              )}
            </div>
          </section>

          <section className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm">
            <h2 className="text-sm font-semibold text-slate-50">
              Recent bookings ({bookings.length})
            </h2>
            <p className="text-[11px] text-slate-400">
              This list is filtered according to your backend&apos;s role
              rules: clients see their own bookings; admins can see more.
            </p>
            <div className="mt-2 space-y-2">
              {bookings.map((b) => (
                <div
                  key={b.id}
                  className="rounded-md border border-slate-800 bg-slate-950/60 px-3 py-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-50">
                      {format(new Date(b.startTime), "dd MMM yyyy, HH:mm")} –{" "}
                      {format(new Date(b.endTime), "HH:mm")}
                    </span>
                    <span
                      className={`rounded-full px-2 py-[1px] text-[10px] uppercase tracking-wide ${
                        b.status === "Confirmed"
                          ? "bg-emerald-500/10 text-emerald-300"
                          : b.status === "Cancelled"
                          ? "bg-red-500/10 text-red-300"
                          : "bg-sky-500/10 text-sky-300"
                      }`}
                    >
                      {b.status}
                    </span>
                  </div>
                  {b.notes && (
                    <p className="mt-1 text-[11px] text-slate-400 line-clamp-2">
                      {b.notes}
                    </p>
                  )}
                </div>
              ))}
              {!bookings.length && (
                <p className="text-xs text-slate-400">
                  No bookings found yet. Create one from the home page.
                </p>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}



