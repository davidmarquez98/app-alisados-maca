"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Arrow, Check, Sparkle } from "@/components/icons";
import { bookingConfig } from "@/config/booking";
import { getService, services } from "@/config/services";
import { useMockBookingStore } from "@/hooks/use-mock-booking-store";
import { getAvailableTimes, isPastDate, isSunday, validateSchedule } from "@/lib/booking-availability";
import { formatBookingDate, formatCurrency, getTodayInputValue } from "@/lib/format";
import { createBooking } from "@/lib/mock-booking-repository";
import { isValidArgentineWhatsApp, isValidPersonName } from "@/lib/validation";
import type { BookingFormData, ServiceSlug } from "@/types";

const stepLabels = ["Servicio", "Turno", "Tus datos", "Confirmar"];

export function BookingWizard() {
  const params = useSearchParams();
  const router = useRouter();
  const initialService = getService(params.get("servicio") ?? "")?.slug ?? "";
  const [step, setStep] = useState(1);
  const [data, setData] = useState<BookingFormData>({
    service: initialService,
    date: "", time: "", name: "", whatsapp: "", email: "", acceptedPolicy: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [paying, setPaying] = useState(false);
  const { bookings, blocks } = useMockBookingStore();
  const selectedService = data.service ? getService(data.service) : undefined;
  const today = useMemo(() => getTodayInputValue(), []);
  const availableTimes = getAvailableTimes({ date: data.date, bookings, blocks });

  function update<K extends keyof BookingFormData>(key: K, value: BookingFormData[K]) {
    setData((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  }

  function selectService(service: ServiceSlug) {
    setData((current) => ({ ...current, service }));
    setErrors((current) => ({ ...current, service: "" }));
  }

  function validateCurrent() {
    const nextErrors: Record<string, string> = {};
    if (step === 1 && !getService(data.service)) nextErrors.service = "Seleccioná un servicio para continuar.";
    if (step === 2) {
      const scheduleError = validateSchedule({ date: data.date, time: data.time, bookings, blocks });
      if (scheduleError) {
        const dateIsInvalid = !data.date || isPastDate(data.date) || isSunday(data.date);
        nextErrors[dateIsInvalid ? "date" : "time"] = scheduleError;
      }
    }
    if (step === 3) {
      if (!isValidPersonName(data.name)) nextErrors.name = "Ingresá un nombre válido.";
      if (!isValidArgentineWhatsApp(data.whatsapp)) nextErrors.whatsapp = "Ingresá un número de WhatsApp válido.";
      if (data.email && !/^\S+@\S+\.\S+$/.test(data.email)) nextErrors.email = "Ingresá un email válido.";
    }
    if (step === 4 && !data.acceptedPolicy) nextErrors.acceptedPolicy = "Necesitamos que aceptes la política para continuar.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function next() {
    if (validateCurrent()) setStep((current) => Math.min(4, current + 1));
  }

  function back() { setErrors({}); setStep((current) => Math.max(1, current - 1)); }

  function handleDate(value: string) {
    setData((current) => ({ ...current, date: value, time: "" }));
    let dateError = "";
    if (isPastDate(value)) dateError = "No podés seleccionar una fecha anterior a hoy.";
    else if (isSunday(value)) dateError = "Los domingos no están disponibles.";
    setErrors((current) => ({ ...current, date: dateError, time: "" }));
  }

  function confirm() {
    if (!validateCurrent()) return;
    setPaying(true);
    const normalizedName = data.name.trim().replace(/\s+/g, " ");
    const booking = { ...data, name: normalizedName, id: `AM-${Date.now().toString().slice(-6)}`, createdAt: new Date().toISOString() };
    try {
      createBooking({
        id: booking.id,
        clientName: normalizedName,
        whatsapp: data.whatsapp.trim(),
        service: data.service as ServiceSlug,
        date: data.date,
        time: data.time,
        status: "confirmed",
        depositStatus: "paid",
        source: "public",
        createdAt: booking.createdAt,
      });
      window.sessionStorage.setItem("alisados-maca-booking", JSON.stringify(booking));
      window.setTimeout(() => router.push("/reserva/confirmada"), 900);
    } catch {
      setPaying(false);
      setStep(2);
      setErrors({ time: "Ese horario acaba de dejar de estar disponible. Elegí otro." });
    }
  }

  return (
    <div className="booking-shell">
      <div className="booking-progress">
        {stepLabels.map((label, index) => <div className={`progress-item ${step >= index + 1 ? "active" : ""}`} key={label}><span>{step > index + 1 ? <Check /> : index + 1}</span><small>{label}</small></div>)}
      </div>
      <div className="booking-card">
        {step === 1 && <div className="booking-step"><StepTitle number="01" title="¿Qué tratamiento querés?" subtitle="Elegí una opción para comenzar." /><div className="booking-options" role="radiogroup" aria-label="Servicios disponibles" aria-describedby={errors.service ? "service-error" : undefined}>{services.map((service) => { const isSelected = data.service === service.slug; return <label className={`select-card ${isSelected ? "selected" : ""}`} data-selected={isSelected} key={service.slug}><input className="select-card-input" type="radio" name="service" value={service.slug} checked={isSelected} onChange={() => selectService(service.slug)} /><span className="select-check" aria-hidden="true"><Check /></span><Sparkle /><span><strong>{service.name}</strong><small>{service.shortDescription}</small></span><b>Desde {formatCurrency(service.priceFrom)}</b></label>; })}</div>{errors.service && <p className="field-error field-error--prominent" id="service-error" role="alert">{errors.service}</p>}</div>}

        {step === 2 && <div className="booking-step"><StepTitle number="02" title="Elegí día y horario" subtitle={`Duración aproximada: ${selectedService?.estimatedDurationHours ?? 3} horas.`} /><label className="field"><span>Fecha</span><input type="date" value={data.date} min={today} onChange={(event) => handleDate(event.target.value)} /></label>{errors.date && <ErrorText>{errors.date}</ErrorText>}<fieldset className="time-field"><legend>Horarios disponibles</legend><div className="time-options">{availableTimes.map((time) => <button type="button" className={data.time === time ? "selected" : ""} onClick={() => update("time", time)} key={time}>{time}</button>)}</div>{data.date && !errors.date && availableTimes.length === 0 && <p className="empty-times" role="status">No hay horarios disponibles para este día.</p>}</fieldset>{errors.time && <ErrorText>{errors.time}</ErrorText>}<p className="availability-note">La disponibilidad contempla reservas y bloqueos de esta agenda local.</p></div>}

        {step === 3 && <div className="booking-step"><StepTitle number="03" title="Contanos sobre vos" subtitle="Usaremos estos datos para enviarte la confirmación." /><div className="form-grid"><label className="field field--full"><span>Nombre y apellido *</span><input autoComplete="name" placeholder="Ej. Camila Rodríguez" value={data.name} onChange={(event) => update("name", event.target.value)} />{errors.name && <ErrorText>{errors.name}</ErrorText>}</label><label className="field"><span>WhatsApp *</span><input type="tel" autoComplete="tel" placeholder="11 2345 6789" value={data.whatsapp} onChange={(event) => update("whatsapp", event.target.value)} />{errors.whatsapp && <ErrorText>{errors.whatsapp}</ErrorText>}</label><label className="field"><span>Email <small>(opcional)</small></span><input type="email" autoComplete="email" placeholder="tu@email.com" value={data.email} onChange={(event) => update("email", event.target.value)} />{errors.email && <ErrorText>{errors.email}</ErrorText>}</label></div><div className="privacy-inline">Tus datos solo se usarán para gestionar este turno.</div></div>}

        {step === 4 && <div className="booking-step"><StepTitle number="04" title="Revisá y confirmá" subtitle="Ya casi está. Verificá que todo sea correcto." /><div className="summary-card"><SummaryRow label="Tratamiento" value={selectedService?.name ?? ""} /><SummaryRow label="Fecha" value={formatBookingDate(data.date)} /><SummaryRow label="Horario" value={`${data.time} hs`} /><SummaryRow label="A nombre de" value={data.name} /><SummaryRow label="Seña a pagar" value={formatCurrency(bookingConfig.deposit)} strong /></div><div className="policy-box"><h3>Política de reservas</h3><ul>{bookingConfig.policies.map((policy) => <li key={policy}><Check />{policy}</li>)}</ul></div><label className="check-field"><input type="checkbox" checked={data.acceptedPolicy} onChange={(event) => update("acceptedPolicy", event.target.checked)} /><span>Acepto la política de reservas y cancelación.</span></label>{errors.acceptedPolicy && <ErrorText>{errors.acceptedPolicy}</ErrorText>}<div className="mock-payment"><span>Modo demostración</span> El pago de la seña es simulado. No se realizará ningún cobro real.</div></div>}

        <div className="booking-actions">{step > 1 ? <button type="button" className="button button--ghost" onClick={back}>← Atrás</button> : <span />}{step < 4 ? <button type="button" className="button button--primary" onClick={next}>Continuar <Arrow /></button> : <button type="button" className="button button--primary" disabled={paying} onClick={confirm}>{paying ? "Procesando…" : `Simular pago · ${formatCurrency(bookingConfig.deposit)}`} {!paying && <Arrow />}</button>}</div>
      </div>
    </div>
  );
}

function StepTitle({ number, title, subtitle }: { number: string; title: string; subtitle: string }) { return <div className="step-title"><span>{number}</span><div><h2>{title}</h2><p>{subtitle}</p></div></div>; }
function ErrorText({ children }: { children: React.ReactNode }) { return <p className="field-error" role="alert">{children}</p>; }
function SummaryRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) { return <div><span>{label}</span><b className={strong ? "summary-strong" : ""}>{value}</b></div>; }
