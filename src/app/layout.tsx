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
      <body className="min-h-full flex flex-col">
        <header className="border-b border-slate-800 bg-slate-950/80 sticky top-0 z-10 backdrop-blur">
          <nav className="mx-auto max-w-5xl px-4 py-3 flex items-center gap-6">
            <Link href="/" className="font-bold text-lg text-white">
              🎁 GetUsers
            </Link>
            <Link href="/" className="text-sm text-slate-300 hover:text-white">
              Giveaways
            </Link>
            {user && (
              <Link
                href="/dashboard"
                className="text-sm text-slate-300 hover:text-white"
              >
                My entries
              </Link>
            )}
            {user && (user.role === "ADVERTISER" || user.role === "ADMIN") && (
              <Link
                href="/advertiser"
                className="text-sm text-slate-300 hover:text-white"
              >
                Advertiser
              </Link>
            )}
            {!user && (
              <Link
                href="/#advertisers"
                className="text-sm text-slate-300 hover:text-white"
              >
                For advertisers
              </Link>
            )}
            {user?.role === "ADMIN" && (
              <Link
                href="/admin"
                className="text-sm text-slate-300 hover:text-white"
              >
                Admin
              </Link>
            )}
            <div className="ml-auto flex items-center gap-4">
              {user ? (
                <>
                  <span className="text-sm text-slate-400">{user.name}</span>
                  <LogoutButton />
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-sm text-slate-300 hover:text-white"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/register"
                    className="text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-md"
                  >
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
        <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
          GetUsers — complete partner offers, earn entries, win prizes.
        </footer>
      </body>
    </html>
  );
}
