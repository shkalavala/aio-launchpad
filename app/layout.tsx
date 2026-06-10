import type { Metadata } from "next";
import "./globals.css";
import { ClassicChrome } from "@/components/shell/ClassicChrome";

export const metadata: Metadata = {
  title: "AIO Launchpad",
  description: "Fleet-aware Azure IoT Operations deployment, powered by Scale Kit.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="h-screen overflow-hidden">
        <div className="flex h-screen flex-col">
          <ClassicChrome />
          <main className="flex-1 overflow-hidden">{children}</main>
        </div>
      </body>
    </html>
  );
}
