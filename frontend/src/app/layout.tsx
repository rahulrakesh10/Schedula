import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Schedula",
  description: "Serverless booking & scheduling frontend for Schedula"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-50">
        <div className="min-h-screen flex flex-col">
          <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur">
            <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
              <span className="text-lg font-semibold tracking-tight">
                Schedula
              </span>
              <span className="text-xs text-slate-400">
                Serverless Booking Backend on Azure
              </span>
            </div>
          </header>
          <main className="mx-auto flex w-full max-w-5xl flex-1 px-4 py-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}


