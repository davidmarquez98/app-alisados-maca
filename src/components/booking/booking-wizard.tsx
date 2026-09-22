"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Arrow, Check, Sparkle } from "@/components/icons";
import { bookingConfig } from "@/config/booking";
import { formatBookingDate, formatCurrency } from "@/lib/format";
import { isValidArgentineWhatsApp, isValidPersonName } from "@/lib/validation";
import type { BookingFormData, ConfirmedBooking, Service, ServiceSlug } from "@/types";

const stepLabels = ["Servicio", "Turno", "Tus datos", "Confirmar"];
type AvailabilityResponse = { date: string; availableTimes: string[]; error?: string };

function todayInArgentina() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

export function BookingWizard({ services, catalogError }: { services: Service[]; catalogError: boolean }) {
  const params = useSearchParams();
  const router = useRouter();
  const initialService = services.find(({ slug }) => slug === params.get("servicio"))?.slug ?? "";
  const [step, setStep] = useState(1);
  const [data, setData] = useState<BookingFormData>({
    service: initialService, date: "", time: "", firstName: "", lastName: "",
    whatsapp: "", email: "", acceptedPolicy: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [availabilityRefresh, setAvailabilityRefresh] = useState(0);
  const selectedService = services.find(({ slug }) => slug === data.service);
  const today = todayInArgentina();
  const availableTimes = availability?.date === data.date ? availability.availableTimes : [];

  useEffect(() => {
    if (!data.date) return;
    const controller = new AbortController();
    fetch(`/api/availability?date=${encodeURIComponent(data.date)}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const result = await response.json() as AvailabilityResponse;
        if (!response.ok) throw new Error(result.error ?? "No pudimos consultar los horarios.");
        setAvailability(result);
        setErrors((current) => ({ ...current, availability: "" }));
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setAvailability(null);
        setErrors((current) => ({ ...current, availability: error instanceof Error ? error.message : "No pudimos consultar los horarios." }));
      })
      .finally(() => { if (!controller.signal.aborted) setLoadingTimes(false); });
    return () => controller.abort();
  }, [data.date, availabilityRefresh]);

  function update<K extends keyof BookingFormData>(key: K, value: BookingFormData[K]) {
    setData((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "", submit: "" }));
  }

  function selectService(service: ServiceSlug) { update("service", service); }

  function validateCurrent() {
    const nextErrors: Record<string, string> = {};
    if (step === 1 && !selectedService) nextErrors.service = catalogError ? "No pudimos cargar los tratamientos. Intentá nuevamente en unos minutos." : "Seleccioná un servicio para continuar.";
    if (step === 2) {
      if (!data.date) nextErrors.date = "Elegí una fecha.";
      else if (data.date < today) nextErrors.date = "No podés seleccionar una fecha anterior a hoy.";
      else if (!data.time || !availableTimes.includes(data.time)) nextErrors.time = "Elegí un horario disponible.";
    }
    if (step === 3) {
      if (!isValidPersonName(data.firstName)) nextErrors.firstName = "Ingresá un nombre válido.";
      if (!isValidPersonName(data.lastName)) nextErrors.lastName = "Ingresá un apellido válido.";
      if (!isValidArgentineWhatsApp(data.whatsapp)) nextErrors.whatsapp = "Ingresá un número de WhatsApp válido.";
      if (data.email && !/^\S+@\S+\.\S+$/.test(data.email)) nextErrors.email = "Ingresá un email válido.";
    }
    if (step === 4 && !data.acceptedPolicy) nextErrors.acceptedPolicy = "Necesitamos que aceptes la política para continuar.";
    setErrors((current) => ({ ...current, ...nextErrors }));
    return Object.keys(nextErrors).length === 0;
  }

  function next() { if (validateCurrent()) setStep((current) => Math.min(4, current + 1)); }
  function back() { setErrors({}); setStep((current) => Math.max(1, current - 1)); }

  function handleDate(value: string) {
    setData((current) => ({ ...current, date: value, time: "" }));
    setAvailability(null);
    setLoadingTimes(Boolean(value));
    setErrors((current) => ({ ...current, date: "", time: "", availability: "", submit: "" }));
  }

  async function confirm() {
    if (!validateCurrent() || submitting) return;
    setSubmitting(true);
    setErrors((current) => ({ ...current, submit: "" }));
    try {
      const response = await fetch("/api/bookings", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceSlug: data.service, date: data.date, time: data.time,
          firstName: data.firstName, lastName: data.lastName,
          phone: data.whatsapp, email: data.email || null,
        }),
      });
      const result = await response.json() as { bookingId?: string; serviceName?: string; depositAmount?: number; error?: string };
      if (!response.ok || !result.bookingId || !result.serviceName) {
        if (response.status === 409) {
          setStep(2);
          setData((current) => ({ ...current, time: "" }));
          setAvailability(null);
          setLoadingTimes(true);
          setAvailabilityRefresh((current) => current + 1);
          setErrors({ time: result.error ?? "Ese horario acaba de ser reservado. Elegí otro disponible." });
          return;
        }
        throw new Error(result.error ?? "No pudimos crear la reserva. Intentá nuevamente.");
      }
      const booking: ConfirmedBooking = {
        ...data, id: result.bookingId, serviceName: result.serviceName,
        depositAmount: result.depositAmount ?? bookingConfig.deposit,
      };
      window.sessionStorage.setItem("alisados-maca-booking", JSON.stringify(booking));
      router.push("/reserva/confirmada");
    } catch (error) {
      setErrors((current) => ({ ...current, submit: error instanceof Error ? error.message : "No pudimos crear la reserva. Intentá nuevamente." }));
    } finally { setSubmitting(false); }
  }

  return (
    <div className="booking-shell">
      <div className="booking-progress">{stepLabels.map((label, index) => <div className={`progress-item ${step >= index + 1 ? "active" : ""}`} key={label}><span>{step > index + 1 ? <Check /> : index + 1}</span><small>{label}</small></div>)}</div>
      <div className="booking-card">
        {step === 1 && <div className="booking-step"><StepTitle number="01" title="¿Qué tratamiento querés?" subtitle="Elegí una opción para comenzar." />{catalogError && <p className="catalog-notice" role="alert">No pudimos cargar los tratamientos en este momento. Intentá nuevamente en unos minutos.</p>}{!catalogError && services.length === 0 && <p className="catalog-notice">Todavía no hay tratamientos disponibles.</p>}<div className="booking-options" role="radiogroup" aria-label="Servicios disponibles" aria-describedby={errors.service ? "service-error" : undefined}>{services.map((service) => { const isSelected = data.service === service.slug; return <label className={`select-card ${isSelected ? "selected" : ""}`} data-selected={isSelected} htmlFor={`service-${service.slug}`} key={service.slug}><input className="select-card-input" id={`service-${service.slug}`} type="radio" name="service" value={service.slug} checked={isSelected} onChange={() => selectService(service.slug)} /><span className="select-check" aria-hidden="true"><Check /></span><Sparkle /><span><strong>{service.name}</strong><small>{service.shortDescription}</small></span><b>Desde {formatCurrency(service.priceFrom)}</b></label>; })}</div>{errors.service && <p className="field-error field-error--prominent" id="service-error" role="alert">{errors.service}</p>}</div>}
        {step === 2 && <div className="booking-step"><StepTitle number="02" title="Elegí día y horario" subtitle={`Duración aproximada: ${selectedService?.estimatedDurationHours ?? 3} horas.`} /><label className="field"><span>Fecha</span><input type="date" value={data.date} min={today} onChange={(event) => handleDate(event.target.value)} /></label>{errors.date && <ErrorText>{errors.date}</ErrorText>}<fieldset className="time-field"><legend>Horarios disponibles</legend>{loadingTimes && <p className="empty-times" role="status">Consultando horarios…</p>}<div className="time-options">{availableTimes.map((time) => <button type="button" className={data.time === time ? "selected" : ""} onClick={() => update("time", time)} key={time}>{time}</button>)}</div>{data.date && !loadingTimes && !errors.availability && availableTimes.length === 0 && <p className="empty-times" role="status">No hay horarios disponibles para este día.</p>}</fieldset>{errors.availability && <ErrorText>{errors.availability}</ErrorText>}{errors.time && <ErrorText>{errors.time}</ErrorText>}<p className="availability-note">Horarios consultados en la agenda real. Se comprueban nuevamente al confirmar.</p></div>}
        {step === 3 && <div className="booking-step"><StepTitle number="03" title="Contanos sobre vos" subtitle="Usaremos estos datos para gestionar tu reserva." /><div className="form-grid"><label className="field"><span>Nombre *</span><input autoComplete="given-name" placeholder="Ej. Camila" value={data.firstName} onChange={(event) => update("firstName", event.target.value)} />{errors.firstName && <ErrorText>{errors.firstName}</ErrorText>}</label><label className="field"><span>Apellido *</span><input autoComplete="family-name" placeholder="Ej. Rodríguez" value={data.lastName} onChange={(event) => update("lastName", event.target.value)} />{errors.lastName && <ErrorText>{errors.lastName}</ErrorText>}</label><label className="field"><span>WhatsApp *</span><input type="tel" autoComplete="tel" placeholder="11 2345 6789" value={data.whatsapp} onChange={(event) => update("whatsapp", event.target.value)} />{errors.whatsapp && <ErrorText>{errors.whatsapp}</ErrorText>}</label><label className="field"><span>Email <small>(opcional)</small></span><input type="email" autoComplete="email" placeholder="tu@email.com" value={data.email} onChange={(event) => update("email", event.target.value)} />{errors.email && <ErrorText>{errors.email}</ErrorText>}</label></div><div className="privacy-inline">Tus datos solo se usarán para gestionar este turno.</div></div>}
        {step === 4 && <div className="booking-step"><StepTitle number="04" title="Revisá y confirmá" subtitle="Ya casi está. Verificá que todo sea correcto." /><div className="summary-card"><SummaryRow label="Tratamiento" value={selectedService?.name ?? ""} /><SummaryRow label="Fecha" value={formatBookingDate(data.date)} /><SummaryRow label="Horario" value={`${data.time} hs`} /><SummaryRow label="A nombre de" value={`${data.firstName} ${data.lastName}`} /><SummaryRow label="Estado" value="Pendiente de seña" /><SummaryRow label="Seña pendiente" value={formatCurrency(bookingConfig.deposit)} strong /></div><div className="policy-box"><h3>Política de reservas</h3><ul>{bookingConfig.policies.map((policy) => <li key={policy}><Check />{policy}</li>)}</ul></div><label className="check-field"><input type="checkbox" checked={data.acceptedPolicy} onChange={(event) => update("acceptedPolicy", event.target.checked)} /><span>Acepto la política de reservas y cancelación.</span></label>{errors.acceptedPolicy && <ErrorText>{errors.acceptedPolicy}</ErrorText>}<div className="mock-payment"><span>Sin pago online por ahora</span> La seña queda pendiente. No se realizará ningún cobro en este paso.</div>{errors.submit && <ErrorText>{errors.submit}</ErrorText>}</div>}
        <div className="booking-actions">{step > 1 ? <button type="button" className="button button--ghost" onClick={back}>← Atrás</button> : <span />}{step < 4 ? <button type="button" className="button button--primary" onClick={next}>Continuar <Arrow /></button> : <button type="button" className="button button--primary" disabled={submitting} onClick={confirm}>{submitting ? "Creando reserva…" : "Confirmar reserva"} {!submitting && <Arrow />}</button>}</div>
      </div>
    </div>
  );
}

function StepTitle({ number, title, subtitle }: { number: string; title: string; subtitle: string }) { return <div className="step-title"><span>{number}</span><div><h2>{title}</h2><p>{subtitle}</p></div></div>; }
function ErrorText({ children }: { children: React.ReactNode }) { return <p className="field-error" role="alert">{children}</p>; }
function SummaryRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) { return <div><span>{label}</span><b className={strong ? "summary-strong" : ""}>{value}</b></div>; }
