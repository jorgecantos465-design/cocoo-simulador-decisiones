import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Simulador de Decisiones Financieras",
  description: "Evaluá el impacto estimado de una decisión financiera en tu caja."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
