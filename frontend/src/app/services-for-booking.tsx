"use client";

import { useEffect, useState } from "react";
import { api, Service } from "@/lib/api";
import { format, parseISO } from "date-fns";
import { CalendarView } from "@/components/CalendarView";

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
        const res = await api.get("/public-services?page=1&limit=50");
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
    <div className="space-y-6">
      {/* Service Selection */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <h2 className="mb-3 text-base font-semibold text-slate-50">Select a Service</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <button
              key={service.id}
              type="button"
              onClick={() =>
                setForm((f) => ({ ...f, serviceId: service.id, startTime: "" }))
              }
              className={`group relative overflow-hidden rounded-lg border p-4 text-left transition-all ${
                form.serviceId === service.id
                  ? "border-brand-500 bg-brand-500/10 shadow-lg shadow-brand-500/20"
                  : "border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-800/70 hover:shadow-md"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-50 group-hover:text-brand-300">
                    {service.name}
                  </h3>
                  {service.description && (
                    <p className="mt-1 text-xs text-slate-400 line-clamp-2">
                      {service.description}
                    </p>
                  )}
                </div>
                <div className="ml-3 flex flex-col items-end">
                  <span className="text-sm font-bold text-brand-400">
                    ${service.price.toFixed(2)}
                  </span>
                  <span className="text-xs text-slate-500">
                    {service.durationMinutes} min
                  </span>
                </div>
              </div>
              {form.serviceId === service.id && (
                <div className="mt-2 flex items-center gap-1 text-xs text-brand-400">
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Selected
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar and Booking Form */}
      {selectedService ? (
        <div className="grid gap-6 lg:grid-cols-[1.5fr,1fr]">
          {/* Visual Calendar */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <h2 className="mb-4 text-base font-semibold text-slate-50">
              Choose Date & Time
            </h2>
            <CalendarView
              serviceId={selectedService.id}
              durationMinutes={selectedService.durationMinutes}
              onTimeSelect={(time) => setForm((f) => ({ ...f, startTime: time }))}
              selectedTime={form.startTime}
            />
          </div>

          {/* Booking Form */}
          <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4"
          >
            <div>
              <h2 className="text-base font-semibold text-slate-50">
                Confirm Booking
              </h2>
              <div className="mt-2 space-y-1 rounded-lg bg-slate-900/40 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Service</span>
                  <span className="text-sm font-medium text-slate-200">
                    {selectedService.name}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Duration</span>
                  <span className="text-sm text-slate-300">
                    {selectedService.durationMinutes} minutes
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Price</span>
                  <span className="text-sm font-semibold text-brand-400">
                    ${selectedService.price.toFixed(2)}
                  </span>
                </div>
                {form.startTime && (
                  <div className="mt-2 border-t border-slate-800 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">Selected Time</span>
                      <span className="text-sm font-medium text-emerald-400">
                        {format(parseISO(form.startTime), "MMM d, h:mm a")}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-300">
                Special Requests (Optional)
              </label>
              <textarea
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                rows={3}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-50 outline-none ring-brand-500/60 focus:border-brand-500 focus:ring-1"
                placeholder="Any special requirements or notes..."
              />
            </div>

            {error && (
              <div className="rounded-md bg-red-500/10 border border-red-500/20 p-2">
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}
            {success && (
              <div className="rounded-md bg-emerald-500/10 border border-emerald-500/20 p-2">
                <p className="text-xs text-emerald-400">
                  {success} {format(new Date(), "HH:mm:ss")}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={!form.serviceId || !form.startTime}
              className="w-full rounded-md bg-gradient-to-r from-brand-600 to-brand-700 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/20 transition-all hover:from-brand-700 hover:to-brand-800 hover:shadow-xl hover:shadow-brand-500/30 disabled:cursor-not-allowed disabled:from-slate-700 disabled:to-slate-700 disabled:opacity-50"
            >
              {form.startTime ? "Confirm Booking" : "Select a Time First"}
            </button>
          </form>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-8 text-center">
          <p className="text-sm text-slate-400">
            👆 Select a service above to view available times
          </p>
        </div>
      )}
    </div>
  );
}


