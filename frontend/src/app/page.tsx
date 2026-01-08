import Link from "next/link";
import { ServiceListForBooking } from "./services-for-booking";

export default function HomePage() {
  return (
    <div className="grid w-full gap-8 md:grid-cols-[1.4fr,1fr]">
      <section className="space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight">
          Book an appointment
        </h1>
        <p className="max-w-xl text-sm text-slate-300">
          Choose a service, pick a time, and confirm your booking. This UI
          talks directly to your Schedula Azure Functions backend.
        </p>
        <ServiceListForBooking />
      </section>
      <aside className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-300">
        <h2 className="text-base font-semibold text-slate-50">
          Admin & Client Portal
        </h2>
        <p>
          Use the dashboard to manage services and view bookings. Authentication
          is powered by your backend&apos;s JWT endpoints.
        </p>
        <div className="flex gap-2">
          <Link
            href="/login"
            className="inline-flex flex-1 items-center justify-center rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="inline-flex flex-1 items-center justify-center rounded-md border border-slate-700 px-3 py-2 text-sm font-medium text-slate-100 hover:bg-slate-800"
          >
            Register
          </Link>
        </div>
      </aside>
    </div>
  );
}


