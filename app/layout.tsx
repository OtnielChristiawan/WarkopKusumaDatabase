import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Warkop Kusuma Analytics",
  description: "Dashboard analitik Warkop Kusuma",
  icons: {
    icon: "C:\\Users\\asus Pc\\Documents\\2.Kusuma\\LogoKusuma.png", // <-- Sesuaikan dengan nama file gambar di folder public kamu
  },
};

export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="id"><body>{children}</body></html>
}