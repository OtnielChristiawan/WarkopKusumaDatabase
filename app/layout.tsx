import "./globals.css";
import type { Metadata } from "next";
export const metadata: Metadata={title:"Warkop Kusuma Analytics",description:"Dashboard analitik Warkop Kusuma"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="id"><body>{children}</body></html>}
