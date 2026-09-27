import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/components/AppContext";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "DG Flops — Play for the moment",
  description: "Your little escape. Five card games, fun-play chips, and good company in the DG Flops social casino.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: `try{var p=localStorage.getItem('dg-appearance');document.documentElement.dataset.theme=p==='dark'||p==='light'?p:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}catch{}` }} /></head><body><AppProvider><AppShell>{children}</AppShell></AppProvider></body></html>;
}
