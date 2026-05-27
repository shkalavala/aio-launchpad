import type { Metadata } from "next";
import "./globals.css";
import { TopNav } from "@/components/shell/TopNav";
import { FleetRepoBanner } from "@/components/shell/FleetRepoBanner";

export const metadata: Metadata = {
  title: "AIO Launchpad",
  description: "Fleet-aware Azure IoT Operations deployment, powered by Scale Kit.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="h-screen overflow-hidden">
        <div className="flex h-screen flex-col">
          <TopNav />
          <FleetRepoBanner />
          <main className="flex-1 overflow-hidden">{children}</main>
        </div>
      </body>
    </html>
  );
}
