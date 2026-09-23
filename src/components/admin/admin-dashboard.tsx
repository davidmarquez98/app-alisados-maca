"use client";

import { useEffect, useState } from "react";
import { NativeDateField } from "@/components/forms/native-date-field";
import { Check, Sparkle } from "@/components/icons";
import { agendaBlockReasons, appointmentStatusConfig, cancellationDepositConfig, cancellationReasonConfig, depositStatusConfig } from "@/config/admin";
import { bookingConfig } from "@/config/booking";
import { formatBookingDate } from "@/lib/format";
import type { AdminAppointment, AgendaBlock, AgendaBlockType, AppointmentStatus, CancellationDepositAction, CancellationReason, DepositStatus } from "@/types/admin";

type DialogName = "reschedule" | "cancel" | "block" | "blockDetail" | null;
type BlockFields = Pick<AgendaBlock, "type" | "date" | "endDate" | "time" | "reason" | "note">;
const adminRequestTimeoutMs = 15_000;

function argentinaToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), adminRequestTimeoutMs);
  try {
    const response = await fetch(url, { ...init, cache: "no-store", signal: controller.signal });
    let result: T & { error?: string };
    try {
      result = await response.json() as T & { error?: string };
    } catch {
      throw new Error("La agenda devolvió una respuesta inválida. Reintentá.");
    }
    if (!response.ok) throw new Error(result.error ?? "No pudimos completar la operación.");
    return result;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("La agenda tardó demasiado en responder. Reintentá.");
    }
    if (error instanceof TypeError) {
      throw new Error("No pudimos conectar con la agenda. Reintentá.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export function AdminDashboard() {
  const [bookings, setBookings] = useState<AdminAppointment[]>([]);
  const [blocks, setBlocks] = useState<AgendaBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [formError, setFormError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogName>(null);
  const [today] = useState(() => argentinaToday());

  async function reload() {
    const [bookingResult, blockResult] = await Promise.all([
      api<{ bookings: AdminAppointment[] }>("/api/admin/bookings"),
      api<{ blocks: AgendaBlock[] }>("/api/admin/schedule-blocks"),
    ]);
    setBookings(bookingResult.bookings);
    setBlocks(blockResult.blocks);
    setLoadError("");
  }

  useEffect(() => {
    let active = true;
    Promise.all([
      api<{ bookings: AdminAppointment[] }>("/api/admin/bookings"),
      api<{ blocks: AgendaBlock[] }>("/api/admin/schedule-blocks"),
    ]).then(([bookingResult, blockResult]) => {
      if (!active) return;
      setBookings(bookingResult.bookings);
      setBlocks(blockResult.blocks);
    }).catch((error: unknown) => {
      if (active) setLoadError(error instanceof Error ? error.message : "No pudimos cargar la agenda.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const appointments = [...bookings].sort((first, second) => `${first.date}T${first.time}`.localeCompare(`${second.date}T${second.time}`));
  const sortedBlocks = [...blocks].sort((first, second) => `${first.date}T${first.time ?? ""}`.localeCompare(`${second.date}T${second.time ?? ""}`));
  const selectedAppointment = bookings.find(({ id }) => id === selectedId) ?? null;
  const selectedBlock = blocks.find(({ id }) => id === selectedBlockId) ?? null;
  const paidDeposits = bookings.filter(({ depositStatus }) => depositStatus === "paid").length;
  const activeAppointments = bookings.filter(({ status }) => status === "pending" || status === "confirmed").length;
  const nextAppointment = appointments.find((appointment) =>
    (appointment.status === "pending" || appointment.status === "confirmed") &&
    `${appointment.date}T${appointment.time}` > `${today}T00:00`,
  );

  function openDialog(name: Exclude<DialogName, null>, appointmentId?: string) {
    if (appointmentId) setSelectedId(appointmentId);
    setFormError("");
    setDialog(name);
  }
  function closeDialog() { setDialog(null); setFormError(""); }

  async function mutateBooking(action: "reschedule" | "cancel" | "complete" | "no_show" | "reactivate", fields: Record<string, unknown> = {}) {
    if (!selectedAppointment || busy) return;
    setBusy(true);
    setFormError("");
    try {
      await api(`/api/admin/bookings/${selectedAppointment.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...fields }),
      });
      await reload();
      closeDialog();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "No pudimos actualizar el turno.");
    } finally { setBusy(false); }
  }

  async function saveBlock(values: BlockFields) {
    if (busy) return;
    setBusy(true);
    setFormError("");
    const type = values.type === "slot" ? "time_slot" : values.type === "day" ? "full_day" : "date_range";
    try {
      await api("/api/admin/schedule-blocks", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, date: values.date, endDate: values.endDate,
          time: values.time, reason: values.reason, note: values.note }),
      });
      await reload();
      closeDialog();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "No pudimos crear el bloqueo.");
    } finally { setBusy(false); }
  }

  async function removeBlock(id: string) {
    if (busy) return;
    setBusy(true);
    setFormError("");
    try {
      await api(`/api/admin/schedule-blocks/${id}`, { method: "DELETE" });
      await reload();
      if (selectedBlockId === id) setSelectedBlockId(null);
      closeDialog();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "No pudimos eliminar el bloqueo.");
    } finally { setBusy(false); }
  }

  return <section className="admin-page"><div className="container admin-container">
    <div className="admin-header"><div><p className="eyebrow">Panel de gestión · Desarrollo</p><h1>Hola, Maca</h1><p>Agenda real de Supabase. Sin Auth: solo para uso local.</p></div><div className="admin-header-actions"><button type="button" className="admin-block-button" onClick={() => openDialog("block")}>Bloquear agenda</button></div></div>
    {formError && !dialog && <p className="admin-form-error" role="alert">{formError}</p>}
    {loading && <div className="admin-panel" role="status">Cargando agenda real…</div>}
    {loadError && <div className="admin-panel" role="alert"><p>{loadError}</p><button type="button" onClick={() => { setLoading(true); void reload().catch((error: unknown) => setLoadError(error instanceof Error ? error.message : "No pudimos cargar la agenda.")).finally(() => setLoading(false)); }}>Reintentar</button></div>}
    {!loading && !loadError && <>
      <div className="admin-stats"><article><span>Turnos cargados</span><strong>{bookings.length}</strong><small>{activeAppointments} activos</small></article><article><span>Señas pagadas</span><strong>{paidDeposits}</strong><small>datos reales</small></article><article><span>Próximo turno</span><strong>{nextAppointment?.time ?? "—"}</strong><small>{nextAppointment ? `${shortDate(nextAppointment.date)} · ${nextAppointment.clientName}` : "sin turnos próximos"}</small></article></div>
      <div className="admin-grid"><div className="admin-panel"><div className="panel-heading"><div><h2>Agenda</h2><p>Ordenada por fecha y horario</p></div></div><div className="appointment-list">{appointments.length === 0 ? <p className="empty-times">Todavía no hay turnos reales.</p> : appointments.map((appointment) => <AppointmentRow appointment={appointment} onSelect={() => setSelectedId(appointment.id)} key={appointment.id} />)}</div></div>
      <aside className="admin-panel admin-menu"><div className="admin-side-heading"><h2>Bloqueos</h2><button type="button" onClick={() => openDialog("block")}>+ Agregar</button></div><div className="block-list">{sortedBlocks.length === 0 ? <p>La agenda no tiene bloqueos.</p> : sortedBlocks.map((block) => <div className="block-item" key={block.id}><div><strong>{blockDateLabel(block)}</strong><span>{blockDescription(block)}</span></div><div className="block-actions"><button type="button" onClick={() => { setSelectedBlockId(block.id); openDialog("blockDetail"); }}>Ver detalle</button><button type="button" disabled={busy} onClick={() => void removeBlock(block.id)} aria-label={`Eliminar bloqueo del ${block.date}`}>Eliminar</button></div></div>)}</div><h2 className="status-title">Estados</h2><div className="admin-status-legend">{(["confirmed", "completed", "cancelled", "no_show"] as AppointmentStatus[]).map((status) => <StatusBadge status={status} key={status} />)}<StatusBadge status="pending" depositStatus="pending" /></div><div className="admin-notice"><Sparkle /><strong>Supabase real</strong><p>Reservas públicas y bloqueos ya comparten agenda. Este panel no está listo para producción sin Auth.</p></div></aside></div>
    </>}
  </div>
  {selectedAppointment && !dialog && <AppointmentDetail appointment={selectedAppointment} actionError={formError} busy={busy} onClose={() => { setSelectedId(null); setFormError(""); }} onReschedule={() => openDialog("reschedule")} onCancel={() => openDialog("cancel")} onStatus={(action) => void mutateBooking(action)} onReactivate={() => void mutateBooking("reactivate")} />}
  {dialog === "reschedule" && selectedAppointment && <RescheduleDialog appointment={selectedAppointment} minDate={today} error={formError} busy={busy} onClose={closeDialog} onSave={(date, time) => void mutateBooking("reschedule", { date, time })} />}
  {dialog === "cancel" && selectedAppointment && <CancelDialog appointment={selectedAppointment} error={formError} busy={busy} onClose={closeDialog} onConfirm={(reason, depositTreatment, note) => void mutateBooking("cancel", { reason, depositTreatment, note })} />}
  {dialog === "block" && <BlockDialog minDate={today} error={formError} busy={busy} onClose={closeDialog} onSave={(values) => void saveBlock(values)} />}
  {dialog === "blockDetail" && selectedBlock && <BlockDetail block={selectedBlock} error={formError} busy={busy} onClose={closeDialog} onDelete={() => void removeBlock(selectedBlock.id)} />}
  </section>;
}

function AppointmentRow({ appointment, onSelect }: { appointment: AdminAppointment; onSelect: () => void }) {
  return <button className="appointment" type="button" onClick={onSelect}><div className="appointment-when"><time>{appointment.time}</time><span>{shortDate(appointment.date)}</span></div><div className="appointment-line" /><div className="appointment-client"><strong>{appointment.clientName}</strong><span>{appointment.serviceName}</span>{appointment.wasRescheduled && <em>Reprogramado</em>}</div><div className="appointment-badges"><StatusBadge status={appointment.status} depositStatus={appointment.depositStatus} /><DepositBadge status={appointment.depositStatus} /></div></button>;
}

function AppointmentDetail({ appointment, actionError, busy, onClose, onReschedule, onCancel, onStatus, onReactivate }: {
  appointment: AdminAppointment; actionError: string; busy: boolean; onClose: () => void; onReschedule: () => void; onCancel: () => void;
  onStatus: (action: "complete" | "no_show") => void; onReactivate: () => void;
}) {
  const actionable = appointment.status === "pending" || appointment.status === "confirmed";
  return <Modal title="Detalle del turno" onClose={onClose} wide><div className="appointment-detail-grid">
    <DetailItem label="Clienta" value={appointment.clientName} /><DetailItem label="WhatsApp" value={appointment.whatsapp} /><DetailItem label="Servicio" value={appointment.serviceName ?? "Servicio"} /><DetailItem label="Profesional" value={appointment.professionalName ?? "Maca"} /><DetailItem label="Fecha" value={formatBookingDate(appointment.date)} /><DetailItem label="Hora" value={`${appointment.time} hs`} />
    <div className="detail-item"><span>Estado</span><div className="detail-badges"><StatusBadge status={appointment.status} depositStatus={appointment.depositStatus} /><DepositBadge status={appointment.depositStatus} /></div></div>
    {appointment.cancellation && <DetailItem label="Cancelación" value={`${cancellationReasonConfig.find(({ value }) => value === appointment.cancellation?.reason)?.label ?? "Otro"} · ${cancellationDepositConfig.find(({ value }) => value === appointment.cancellation?.depositAction)?.label ?? "Conserva la seña"}${appointment.cancellation.note ? ` · ${appointment.cancellation.note}` : ""}`} full />}
    <DetailItem label="Notas" value={appointment.notes || "Sin notas internas"} full />
    <div className="detail-item detail-item--full"><span>Historial</span><strong>{appointment.events?.length ? appointment.events.map((event) => `${eventLabel(event.type)} (${new Date(event.createdAt).toLocaleDateString("es-AR")})`).join(" · ") : "Sin eventos disponibles"}</strong></div>
  </div><div className="admin-actions">
    {appointment.status === "cancelled" && <><button type="button" className="primary" disabled={busy} onClick={onReactivate}>Reactivar turno</button><button type="button" disabled={busy} onClick={onReschedule}>Reprogramar antes de reactivar</button></>}
    {actionable && <><button type="button" disabled={busy} onClick={onReschedule}>Reprogramar</button><button type="button" disabled={busy} onClick={onCancel} className="danger">Cancelar turno</button><button type="button" disabled={busy} onClick={() => onStatus("complete")}>Marcar como realizado</button><button type="button" disabled={busy} onClick={() => onStatus("no_show")}>Marcar como no-show</button></>}
    {appointment.whatsapp && <a href={`https://wa.me/${appointment.whatsapp}`} target="_blank" rel="noreferrer">Contactar por WhatsApp</a>}
  </div>{actionError && <p className="admin-form-error" role="alert">{actionError}</p>}</Modal>;
}

function RescheduleDialog({ appointment, minDate, error, busy, onClose, onSave }: { appointment: AdminAppointment; minDate: string; error: string; busy: boolean; onClose: () => void; onSave: (date: string, time: string) => void }) {
  const [date, setDate] = useState(appointment.date >= minDate ? appointment.date : minDate);
  const [time, setTime] = useState("");
  const [times, setTimes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [availabilityError, setAvailabilityError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/availability?date=${encodeURIComponent(date)}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => { const result = await response.json() as { availableTimes?: string[]; error?: string }; if (!response.ok) throw new Error(result.error); return result.availableTimes ?? []; })
      .then((available) => { if (!controller.signal.aborted) { setTimes(available); setAvailabilityError(""); setLoading(false); } })
      .catch((cause: unknown) => { if (!controller.signal.aborted) { setTimes([]); setAvailabilityError(cause instanceof Error ? cause.message : "No pudimos consultar horarios."); setLoading(false); } });
    return () => controller.abort();
  }, [date]);
  return <Modal title="Reprogramar turno" onClose={onClose}><form className="admin-form" onSubmit={(event) => { event.preventDefault(); onSave(date, time); }}><p className="dialog-copy">Se conservarán la clienta, el servicio, la seña y el historial.</p><NativeDateField label="Nueva fecha" name="date" min={minDate} value={date} onChange={(value) => { setDate(value); setTime(""); setTimes([]); setLoading(true); }} required /><label><span>Nuevo horario</span><select name="time" value={time} onChange={(event) => setTime(event.target.value)} required><option value="">Elegí un horario</option>{times.map((slot) => <option value={slot} key={slot}>{slot}</option>)}</select>{loading && <small>Consultando horarios…</small>}{!loading && date && times.length === 0 && <small>No hay horarios disponibles.</small>}</label>{availabilityError && <p className="admin-form-error" role="alert">{availabilityError}</p>}{error && <p className="admin-form-error" role="alert">{error}</p>}<DialogActions onClose={onClose} submitLabel="Confirmar reprogramación" busy={busy || loading || Boolean(availabilityError)} /></form></Modal>;
}

function CancelDialog({ appointment, error, busy, onClose, onConfirm }: { appointment: AdminAppointment; error: string; busy: boolean; onClose: () => void; onConfirm: (reason: CancellationReason, depositAction: CancellationDepositAction, note: string) => void }) {
  return <Modal title="Cancelar turno" onClose={onClose}><form className="admin-form" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); onConfirm(String(form.get("reason")) as CancellationReason, String(form.get("depositAction")) as CancellationDepositAction, String(form.get("note")).trim()); }}><div className="admin-warning"><strong>¿Confirmás la cancelación?</strong><p>El turno de {appointment.clientName} quedará en el historial.</p></div><label><span>Motivo de cancelación</span><select name="reason">{cancellationReasonConfig.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label><label><span>Tratamiento de la seña</span><select name="depositAction">{cancellationDepositConfig.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label><label className="field-wide"><span>Nota interna <small>(opcional)</small></span><textarea name="note" rows={3} /></label>{error && <p className="admin-form-error" role="alert">{error}</p>}<DialogActions onClose={onClose} submitLabel="Confirmar cancelación" danger busy={busy} /></form></Modal>;
}

function BlockDialog({ minDate, error, busy, onClose, onSave }: { minDate: string; error: string; busy: boolean; onClose: () => void; onSave: (values: BlockFields) => void }) {
  const [type, setType] = useState<AgendaBlockType>("slot");
  const [date, setDate] = useState(minDate);
  const [endDate, setEndDate] = useState("");
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onSave({ type, date, endDate: String(form.get("endDate") || "") || undefined, time: String(form.get("time") || "") || undefined, reason: String(form.get("reason") || "") || undefined, note: String(form.get("note") || "").trim() || undefined });
  }
  return <Modal title="Bloquear agenda" onClose={onClose}><form className="admin-form" onSubmit={submit}><p className="dialog-copy">Elegí si querés bloquear un horario, un día completo o un rango inclusivo de fechas.</p><label className="field-wide"><span>Tipo de bloqueo</span><select name="type" value={type} onChange={(event) => setType(event.target.value as AgendaBlockType)}><option value="slot">Horario específico</option><option value="day">Día completo</option><option value="range">Rango de fechas</option></select></label><NativeDateField label={type === "range" ? "Fecha desde" : "Fecha"} name="date" min={minDate} value={date} onChange={setDate} required />{type === "range" && <NativeDateField label="Fecha hasta" name="endDate" min={date || minDate} value={endDate} onChange={setEndDate} required />}{type === "slot" && <label><span>Horario</span><select name="time" defaultValue="" required><option value="">Elegí un horario</option>{bookingConfig.availableTimes.map((time) => <option value={time} key={time}>{time}</option>)}</select></label>}<label className="field-wide"><span>Motivo interno <small>(opcional)</small></span><select name="reason" defaultValue=""><option value="">Sin motivo</option>{agendaBlockReasons.map((reason) => <option value={reason} key={reason}>{reason}</option>)}</select></label><label className="field-wide"><span>Nota interna <small>(opcional)</small></span><textarea name="note" rows={3} placeholder="Detalle visible solo en el admin" /></label>{error && <p className="admin-form-error" role="alert">{error}</p>}<DialogActions onClose={onClose} submitLabel="Guardar bloqueo" busy={busy} /></form></Modal>;
}

function BlockDetail({ block, error, busy, onClose, onDelete }: { block: AgendaBlock; error: string; busy: boolean; onClose: () => void; onDelete: () => void }) {
  return <Modal title="Detalle del bloqueo" onClose={onClose}><div className="appointment-detail-grid"><DetailItem label="Tipo" value={blockTypeLabel(block.type)} /><DetailItem label={block.type === "range" ? "Fecha desde" : "Fecha"} value={formatNumericDate(block.date)} />{block.type === "range" && <DetailItem label="Fecha hasta" value={formatNumericDate(block.endDate ?? block.date)} />}{block.type === "slot" && <DetailItem label="Horario" value={`${block.time} hs`} />}<DetailItem label="Motivo" value={block.reason || "Sin motivo"} full /><DetailItem label="Nota interna" value={block.note || "Sin nota interna"} full /></div>{error && <p className="admin-form-error" role="alert">{error}</p>}<div className="admin-actions block-detail-actions"><button type="button" onClick={onClose}>Volver</button><button type="button" className="danger" disabled={busy} onClick={onDelete}>Eliminar bloqueo</button></div></Modal>;
}

function Modal({ title, onClose, wide = false, children }: { title: string; onClose: () => void; wide?: boolean; children: React.ReactNode }) { return <div className="admin-modal-backdrop" role="presentation"><section className={`admin-modal ${wide ? "admin-modal--wide" : ""}`} role="dialog" aria-modal="true" aria-labelledby="admin-dialog-title"><div className="admin-modal-header"><h2 id="admin-dialog-title">{title}</h2><button type="button" onClick={onClose} aria-label="Cerrar">×</button></div>{children}</section></div>; }
function DialogActions({ onClose, submitLabel, danger = false, busy = false }: { onClose: () => void; submitLabel: string; danger?: boolean; busy?: boolean }) { return <div className="dialog-actions field-wide"><button type="button" onClick={onClose}>Volver</button><button type="submit" className={danger ? "danger" : "primary"} disabled={busy}>{busy ? "Procesando…" : submitLabel}</button></div>; }
function StatusBadge({ status, depositStatus }: { status: AppointmentStatus; depositStatus?: DepositStatus }) { const label = status === "pending" && depositStatus === "pending" ? "Pendiente de seña" : appointmentStatusConfig[status].label; return <span className="status-badge" data-status={status}>{status === "confirmed" && <Check />}{label}</span>; }
function DepositBadge({ status }: { status: DepositStatus }) { return <span className="deposit-badge" data-deposit={status}>{depositStatusConfig[status].label}</span>; }
function DetailItem({ label, value, full = false }: { label: string; value: string; full?: boolean }) { return <div className={`detail-item ${full ? "detail-item--full" : ""}`}><span>{label}</span><strong>{value}</strong></div>; }
function shortDate(date: string) { return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`)); }
function formatNumericDate(date: string) { return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`)); }
function blockTypeLabel(type: AgendaBlockType) { return type === "slot" ? "Horario específico" : type === "day" ? "Día completo" : "Rango de fechas"; }
function blockDateLabel(block: AgendaBlock) { return block.type === "range" ? `${formatNumericDate(block.date)} - ${formatNumericDate(block.endDate ?? block.date)}` : block.type === "slot" ? `${formatNumericDate(block.date)} - ${block.time}` : formatNumericDate(block.date); }
function blockDescription(block: AgendaBlock) { const description = block.type === "slot" ? "Horario bloqueado" : block.type === "day" ? "Día completo" : "Rango bloqueado"; return `${description}${block.reason ? ` · ${block.reason}` : ""}`; }
function eventLabel(type: string) { return ({ created: "Creado", rescheduled: "Reprogramado", cancelled: "Cancelado", reactivated: "Reactivado", completed: "Realizado", no_show: "No-show" } as Record<string, string>)[type] ?? type; }
