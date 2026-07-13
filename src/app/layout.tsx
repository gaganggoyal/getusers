import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { getSessionUser } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ),
  title: "GetUsers",
  description: "Complete partner tasks, earn entries, win giveaways.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getSessionUser();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col text-slate-800">
        <header className="border-b border-slate-200 bg-white/80 sticky top-0 z-10 backdrop-blur">
          <nav className="mx-auto max-w-5xl px-4 py-3 flex items-center gap-5">
            <Link href="/" className="font-bold text-lg text-slate-900">
              🎁 <span className="text-violet-600">GetUsers</span>
            </Link>
            <Link href="/" className="text-sm text-slate-600 hover:text-violet-700">
              Giveaways
            </Link>
            {user && (
              <Link
                href="/dashboard"
                className="text-sm text-slate-600 hover:text-violet-700"
              >
                My entries
              </Link>
            )}
            {user && (user.role === "ADVERTISER" || user.role === "ADMIN") && (
              <Link
                href="/advertiser"
                className="text-sm text-slate-600 hover:text-violet-700"
              >
                Advertiser
              </Link>
            )}
            {!user && (
              <Link
                href="/#advertisers"
                className="hidden sm:inline text-sm text-slate-600 hover:text-violet-700"
              >
                For advertisers
              </Link>
            )}
            {user?.role === "ADMIN" && (
              <Link
                href="/admin"
                className="text-sm text-slate-600 hover:text-violet-700"
              >
                Admin
              </Link>
            )}
            <div className="ml-auto flex items-center gap-4">
              {user ? (
                <>
                  <span className="hidden sm:inline text-sm text-slate-500">{user.name}</span>
                  <LogoutButton />
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-sm text-slate-600 hover:text-violet-700"
                  >
                    Log in
                  </Link>
                  <Link href="/register" className="btn btn-sm">
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </nav>
        </header>
        <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-8">
          {children}
        </main>
        <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500">
          GetUsers — complete partner offers, earn entries, win prizes.
        </footer>
      </body>
    </html>
  );
}
