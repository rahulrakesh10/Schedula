"use client";

import { useEffect, useState } from "react";
import { api, Service } from "@/lib/api";
import { format } from "date-fns";

interface BookingFormState {
  serviceId: string;
  startTime: string;
  notes: string;
}

export function ServiceListForBooking() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<BookingFormState>({
    serviceId: "",
    startTime: "",
    notes: ""
  });
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await api.get("/services/public?page=1&limit=50");
        setServices(res.data.data ?? res.data.services ?? []);
      } catch (err: any) {
        setError(
          err?.response?.data?.error?.message ?? "Failed to load services"
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const selectedService = services.find((s) => s.id === form.serviceId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      await api.post("/createBooking", {
        serviceId: form.serviceId,
        startTime: form.startTime,
        notes: form.notes || undefined
      });
      setSuccess("Booking created successfully.");
      setForm({ serviceId: "", startTime: "", notes: "" });
    } catch (err: any) {
      setError(err?.response?.data?.error?.message ?? "Failed to create booking");
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-300">Loading services…</p>;
  }

  if (error) {
    return <p className="text-sm text-red-400">Error: {error}</p>;
  }

  if (!services.length) {
    return (
      <p className="text-sm text-slate-300">
        No active services found. Create some in the admin dashboard.
      </p>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-[1.3fr,1fr]">
      <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <h2 className="text-base font-semibold text-slate-50">Services</h2>
        <div className="space-y-2">
          {services.map((service) => (
            <button
              key={service.id}
              type="button"
              onClick={() =>
                setForm((f) => ({ ...f, serviceId: service.id }))
              }
              className={`w-full rounded-md border px-3 py-2 text-left text-sm ${
                form.serviceId === service.id
                  ? "border-brand-500 bg-brand-500/10"
                  : "border-slate-800 bg-slate-900/60 hover:bg-slate-800/70"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-50">
                  {service.name}
                </span>
                <span className="text-xs text-slate-400">
                  {service.durationMinutes} min · ${service.price.toFixed(2)}
                </span>
              </div>
              {service.description && (
                <p className="mt-1 text-xs text-slate-400 line-clamp-2">
                  {service.description}
                </p>
              )}
            </button>
          ))}
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm"
      >
        <h2 className="text-base font-semibold text-slate-50">
          Confirm booking
        </h2>

        {selectedService ? (
          <p className="text-xs text-slate-300">
            Booking:{" "}
            <span className="font-medium text-slate-100">
              {selectedService.name}
            </span>{" "}
            ({selectedService.durationMinutes} minutes)
          </p>
        ) : (
          <p className="text-xs text-slate-400">
            Select a service on the left to continue.
          </p>
        )}

        <div className="space-y-1">
          <label className="block text-xs text-slate-300">
            Start time (UTC)
          </label>
          <input
            type="datetime-local"
            value={form.startTime}
            onChange={(e) =>
              setForm((f) => ({ ...f, startTime: e.target.value }))
            }
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-50 outline-none ring-brand-500/60 focus:border-brand-500 focus:ring-1"
          />
          <p className="text-[11px] text-slate-500">
            Must respect backend rules (at least 1 hour ahead, within 90 days).
          </p>
        </div>

        <div className="space-y-1">
          <label className="block text-xs text-slate-300">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) =>
              setForm((f) => ({ ...f, notes: e.target.value }))
            }
            rows={3}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-50 outline-none ring-brand-500/60 focus:border-brand-500 focus:ring-1"
            placeholder="Anything else the provider should know?"
          />
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}
        {success && (
          <p className="text-xs text-emerald-400">
            {success} {format(new Date(), "HH:mm:ss")}
          </p>
        )}

        <button
          type="submit"
          disabled={!form.serviceId || !form.startTime}
          className="mt-1 inline-flex w-full items-center justify-center rounded-md bg-brand-600 px-3 py-2 text-xs font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-700"
        >
          Create booking
        </button>
      </form>
    </div>
  );
}


