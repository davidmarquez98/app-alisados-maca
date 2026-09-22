"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { Check, Sparkle } from "@/components/icons";
import { ButtonLink } from "@/components/ui/button-link";
import { businessConfig } from "@/config/business";
import { formatBookingDate, formatCurrency } from "@/lib/format";
import type { ConfirmedBooking } from "@/types";

export default function ConfirmedPage() {
  const hydrated = useSyncExternalStore(() => () => undefined, () => true, () => false);
  const stored = useSyncExternalStore(
    () => () => undefined,
    () => window.sessionStorage.getItem("alisados-maca-booking"),
    () => null,
  );
  const booking = stored ? JSON.parse(stored) as ConfirmedBooking : null;

  if (!hydrated) return <section className="confirmation-page"><div className="confirmation-card">Cargando confirmación…</div></section>;
  if (!booking?.id || !booking.firstName) return <section className="confirmation-page"><div className="confirmation-card"><h1>No encontramos una reserva reciente</h1><p>Podés iniciar una nueva reserva cuando quieras.</p><ButtonLink href="/reservar">Reservar turno</ButtonLink></div></section>;

  return (
    <section className="confirmation-page"><div className="confirmation-card">
      <div className="success-icon"><Check /></div><Sparkle className="confirmation-sparkle" />
      <p className="eyebrow">Reserva recibida</p><h1>¡Listo, {booking.firstName}!</h1>
      <p>Tu turno fue registrado y está pendiente de seña. Todavía no se realizó ningún cobro.</p>
      <div className="confirmation-summary">
        <div><span>Tratamiento</span><strong>{booking.serviceName}</strong></div>
        <div><span>Día</span><strong>{formatBookingDate(booking.date)}</strong></div>
        <div><span>Horario</span><strong>{booking.time} hs</strong></div>
        <div><span>A nombre de</span><strong>{booking.firstName} {booking.lastName}</strong></div>
        <div><span>Estado</span><strong>Pendiente de seña</strong></div>
        <div><span>Seña pendiente</span><strong>{formatCurrency(booking.depositAmount)}</strong></div>
        <div><span>Código</span><strong>{booking.id}</strong></div>
      </div>
      <div className="address-message"><strong>La ubicación exacta es privada</strong><span>Se compartirá cuando corresponda. Zona: {businessConfig.location}.</span></div>
      <div className="confirmation-actions"><ButtonLink href="/">Volver al inicio</ButtonLink><Link href="/reservar" className="text-link">Hacer otra reserva</Link></div>
    </div></section>
  );
}
