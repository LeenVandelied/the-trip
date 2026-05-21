import type { Metadata } from "next";
import { Zilla_Slab, IBM_Plex_Sans, IBM_Plex_Mono, Special_Elite } from "next/font/google";
import "./globals.css";
import { TopNav } from "@/components/top-nav";
import { TopoBackdrop } from "@/components/topo-backdrop";
import { getCurrentUser } from "@/lib/current-user";
import { TRIP_NAME } from "@/lib/constants";

const zillaSlab = Zilla_Slab({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-zilla",
  display: "swap",
});
const plexSans = IBM_Plex_Sans({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-plex-sans",
  display: "swap",
});
const plexMono = IBM_Plex_Mono({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-plex-mono",
  display: "swap",
});
const specialElite = Special_Elite({
  weight: ["400"],
  subsets: ["latin"],
  variable: "--font-special-elite",
  display: "swap",
});

export const metadata: Metadata = {
  title: `${TRIP_NAME} · Carnet de route`,
  description: "Carnet de route — roadtrip moto 7 jours.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  return (
    <html
      lang="fr"
      className={`${zillaSlab.variable} ${plexSans.variable} ${plexMono.variable} ${specialElite.variable}`}
    >
      <body>
        <TopoBackdrop opacity={0.06} />
        <TopNav pseudo={user?.name ?? null} />
        <main className="app-main">{children}</main>
      </body>
    </html>
  );
}
