import type { Metadata } from "next";
import { Suspense } from "react";
import { BookingWizard } from "@/components/booking/booking-wizard";

export const metadata: Metadata = { title: "Reservar turno" };

export default function BookingPage() {
  return (
    <section className="booking-page">
      <div className="container booking-container">
        <div className="booking-intro"><p className="eyebrow">Reserva online</p><h1>Tu próximo momento de cuidado</h1><p>Completá estos pasos y dejá tu turno confirmado.</p></div>
        <Suspense fallback={<div className="booking-card">Cargando agenda…</div>}><BookingWizard /></Suspense>
      </div>
    </section>
  );
}
