import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { VaultProvider } from "@/context/VaultContext";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { AuthProvider } from "@/context/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Password manager",
  description:
    "Most secure password manager that do not relies on any third party or personal security system.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider attribute={"class"} defaultTheme="light">
          <AuthProvider>
            <VaultProvider>
              <Toaster />
              {children}
            </VaultProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
