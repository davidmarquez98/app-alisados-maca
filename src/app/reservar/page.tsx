import type { Metadata } from "next";
import { Suspense } from "react";
import { BookingWizard } from "@/components/booking/booking-wizard";
import { getPublicServices } from "@/services/service-service";
import type { PublicService } from "@/types";

export const metadata: Metadata = { title: "Reservar turno" };

export default async function BookingPage() {
  let services: PublicService[] = [];
  let catalogError = false;
  try {
    services = await getPublicServices();
  } catch {
    catalogError = true;
  }

  return (
    <section className="booking-page">
      <div className="container booking-container">
        <div className="booking-intro"><p className="eyebrow">Reserva online</p><h1>Tu próximo momento de cuidado</h1><p>Completá estos pasos para solicitar tu turno. La seña queda pendiente.</p></div>
        <Suspense fallback={<div className="booking-card">Cargando agenda…</div>}><BookingWizard services={services} catalogError={catalogError} /></Suspense>
      </div>
    </section>
  );
}
