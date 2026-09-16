"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { Check, Sparkle } from "@/components/icons";
import { ButtonLink } from "@/components/ui/button-link";
import { businessConfig } from "@/config/business";
import { getService } from "@/config/services";
import { formatBookingDate } from "@/lib/format";
import type { ConfirmedBooking } from "@/types";

export default function ConfirmedPage() {
  const hydrated = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const storedBooking = useSyncExternalStore(
    () => () => undefined,
    () => window.sessionStorage.getItem("alisados-maca-booking"),
    () => null,
  );
  const booking = storedBooking ? (JSON.parse(storedBooking) as ConfirmedBooking) : null;

  if (!hydrated) return <section className="confirmation-page"><div className="confirmation-card">Cargando confirmación…</div></section>;
  if (!booking) return <section className="confirmation-page"><div className="confirmation-card"><h1>No encontramos una reserva reciente</h1><p>Podés iniciar una nueva reserva cuando quieras.</p><ButtonLink href="/reservar">Reservar turno</ButtonLink></div></section>;
  const service = getService(booking.service);

  return (
    <section className="confirmation-page">
      <div className="confirmation-card">
        <div className="success-icon"><Check /></div><Sparkle className="confirmation-sparkle" />
        <p className="eyebrow">Reserva confirmada</p><h1>¡Listo, {booking.name.split(" ")[0]}!</h1><p>Tu turno quedó agendado. En una integración futura vas a recibir la confirmación por WhatsApp.</p>
        <div className="confirmation-summary"><div><span>Tratamiento</span><strong>{service?.name}</strong></div><div><span>Día</span><strong>{formatBookingDate(booking.date)}</strong></div><div><span>Horario</span><strong>{booking.time} hs</strong></div><div><span>Código</span><strong>{booking.id}</strong></div></div>
        <div className="address-message"><strong>La ubicación exacta es privada</strong><span>En la versión conectada, se enviará junto con la confirmación del turno. Zona: {businessConfig.location}.</span></div>
        <p className="simulation-label">Esta es una reserva de demostración. No se realizó ningún cobro.</p>
        <div className="confirmation-actions"><ButtonLink href="/">Volver al inicio</ButtonLink><Link href="/reservar" className="text-link">Hacer otra reserva</Link></div>
      </div>
    </section>
  );
}
