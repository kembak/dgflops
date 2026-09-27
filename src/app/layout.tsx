import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/components/AppContext";

export const metadata: Metadata = {
  title: "DG Flops — Play for the moment",
  description: "A social casino concept built for fun-play chips and friends.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><AppProvider>{children}</AppProvider></body></html>;
}
