"use client";

import { useMemo, useState } from "react";
import { Check, Sparkle } from "@/components/icons";
import { agendaBlockReasons, appointmentStatusConfig, cancellationDepositConfig, cancellationReasonConfig, depositStatusConfig } from "@/config/admin";
import { bookingConfig } from "@/config/booking";
import { getService, services } from "@/config/services";
import { useMockBookingStore } from "@/hooks/use-mock-booking-store";
import { getAvailableTimes, isPastDate, isSunday, sortAppointmentsChronologically, validateSchedule } from "@/lib/booking-availability";
import { formatBookingDate, getTodayInputValue } from "@/lib/format";
import { createAgendaBlock, createBooking, deleteAgendaBlock, updateBooking } from "@/lib/mock-booking-repository";
import { isValidArgentineWhatsApp, isValidPersonName, normalizeArgentineWhatsApp } from "@/lib/validation";
import type { ServiceSlug } from "@/types";
import type { AdminAppointment, AgendaBlock, AgendaBlockType, AppointmentStatus, CancellationDepositAction, CancellationReason, DepositStatus } from "@/types/admin";

type DialogName = "create" | "edit" | "reschedule" | "cancel" | "block" | "blockDetail" | null;
type AppointmentFields = Pick<AdminAppointment, "clientName" | "whatsapp" | "service" | "date" | "time" | "depositStatus" | "notes">;
type BlockFields = Pick<AgendaBlock, "type" | "date" | "endDate" | "time" | "reason" | "note">;

export function AdminDashboard() {
  const { bookings, blocks } = useMockBookingStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogName>(null);
  const [formError, setFormError] = useState("");
  const today = useMemo(() => getTodayInputValue(), []);
  const appointments = sortAppointmentsChronologically(bookings);
  const sortedBlocks = [...blocks].sort((first, second) => `${first.date}T${first.time ?? ""}`.localeCompare(`${second.date}T${second.time ?? ""}`));
  const selectedAppointment = bookings.find(({ id }) => id === selectedId) ?? null;
  const selectedBlock = blocks.find(({ id }) => id === selectedBlockId) ?? null;
  const paidDeposits = bookings.filter(({ depositStatus }) => depositStatus === "paid").length;
  const activeAppointments = bookings.filter(({ status }) => status !== "cancelled").length;
  const nextAppointment = appointments.find((appointment) => appointment.status !== "cancelled" && `${appointment.date}T${appointment.time}` > `${today}T00:00`);

  function openDialog(name: Exclude<DialogName, null>, appointmentId?: string) {
    if (appointmentId) setSelectedId(appointmentId);
    setFormError("");
    setDialog(name);
  }

  function closeDialog() {
    setDialog(null);
    setFormError("");
  }

  function createAppointment(values: AppointmentFields) {
    try {
      const appointment: AdminAppointment = {
        id: `turno-${Date.now()}`,
        ...values,
        status: values.depositStatus === "paid" ? "confirmed" : "pending",
        source: "admin",
        createdAt: new Date().toISOString(),
      };
      createBooking(appointment);
      setSelectedId(appointment.id);
      closeDialog();
    } catch {
      setFormError("Ese horario ya no está disponible.");
    }
  }

  function editAppointment(values: AppointmentFields) {
    if (!selectedAppointment || selectedAppointment.status === "cancelled") return;
    try {
      updateBooking(selectedAppointment.id, {
        ...values,
        status: selectedAppointment.status === "pending" && values.depositStatus === "paid" ? "confirmed" : selectedAppointment.status,
      });
      closeDialog();
    } catch {
      setFormError("Ese horario ya no está disponible.");
    }
  }

  function reprogramAppointment(date: string, time: string) {
    if (!selectedAppointment || selectedAppointment.status === "cancelled") return;
    const error = validateSchedule({ date, time, bookings, blocks, excludeId: selectedAppointment.id });
    if (error) return setFormError(error);
    try {
      updateBooking(selectedAppointment.id, { date, time, wasRescheduled: true });
      closeDialog();
    } catch {
      setFormError("Ese horario ya no está disponible.");
    }
  }

  function cancelAppointment(reason: CancellationReason, depositAction: CancellationDepositAction, note: string) {
    if (!selectedAppointment || selectedAppointment.status === "cancelled") return;
    const depositByAction: Record<CancellationDepositAction, DepositStatus> = {
      keep: selectedAppointment.depositStatus,
      forfeit: "forfeited",
      refund: "refunded",
    };
    updateBooking(selectedAppointment.id, {
      status: "cancelled",
      depositStatus: depositByAction[depositAction],
      cancellation: { reason, depositAction, note: note || undefined, cancelledAt: new Date().toISOString() },
    });
    closeDialog();
  }

  function setStatus(status: AppointmentStatus) {
    if (!selectedAppointment || selectedAppointment.status === "cancelled") return;
    updateBooking(selectedAppointment.id, { status, depositStatus: status === "no_show" ? "forfeited" : selectedAppointment.depositStatus });
  }

  function reactivateAppointment() {
    if (!selectedAppointment || selectedAppointment.status !== "cancelled") return;
    try {
      updateBooking(selectedAppointment.id, { status: selectedAppointment.depositStatus === "paid" ? "confirmed" : "pending" });
      setFormError("");
    } catch {
      setFormError("No se puede reactivar: ese horario ya no está disponible.");
    }
  }

  function saveBlock(values: BlockFields) {
    if (!values.date) return setFormError("Elegí una fecha.");
    if (isPastDate(values.date)) return setFormError("No podés bloquear una fecha anterior a hoy.");
    if (values.type === "range") {
      if (!values.endDate) return setFormError("Elegí la fecha hasta.");
      if (values.endDate < values.date) return setFormError("La fecha hasta no puede ser anterior a la fecha desde.");
    } else if (isSunday(values.date)) {
      return setFormError("Los domingos ya están cerrados.");
    }
    if (values.type === "slot" && !values.time) return setFormError("Elegí un horario.");
    if (blocks.some((block) => sameBlock(block, values))) return setFormError("Ese bloqueo ya existe.");
    createAgendaBlock({
      id: `bloqueo-${Date.now()}`,
      ...values,
      endDate: values.type === "range" ? values.endDate : undefined,
      time: values.type === "slot" ? values.time : undefined,
      reason: values.reason || undefined,
      note: values.note || undefined,
      createdAt: new Date().toISOString(),
    });
    closeDialog();
  }

  function viewBlock(id: string) {
    setSelectedBlockId(id);
    setDialog("blockDetail");
  }

  function removeBlock(id: string) {
    deleteAgendaBlock(id);
    if (selectedBlockId === id) setSelectedBlockId(null);
    closeDialog();
  }

  return (
    <section className="admin-page">
      <div className="container admin-container">
        <div className="admin-header">
          <div><p className="eyebrow">Panel de gestión · Demo</p><h1>Hola, Maca</h1><p>Gestioná la agenda local de prueba.</p></div>
          <div className="admin-header-actions"><button type="button" className="admin-block-button" onClick={() => openDialog("block")}>Bloquear agenda</button><button className="admin-new-button" type="button" onClick={() => openDialog("create")}>+ Nuevo turno</button></div>
        </div>

        <div className="admin-stats">
          <article><span>Turnos cargados</span><strong>{bookings.length}</strong><small>{activeAppointments} activos</small></article>
          <article><span>Señas pagadas</span><strong>{paidDeposits}</strong><small>datos locales</small></article>
          <article><span>Próximo turno</span><strong>{nextAppointment?.time ?? "—"}</strong><small>{nextAppointment ? `${shortDate(nextAppointment.date)} · ${nextAppointment.clientName}` : "sin turnos próximos"}</small></article>
        </div>

        <div className="admin-grid">
          <div className="admin-panel">
            <div className="panel-heading"><div><h2>Agenda</h2><p>Ordenada por fecha y horario</p></div><button type="button" onClick={() => openDialog("create")}>+ Nuevo turno</button></div>
            <div className="appointment-list">{appointments.map((appointment) => <AppointmentRow appointment={appointment} onSelect={() => setSelectedId(appointment.id)} key={appointment.id} />)}</div>
          </div>
          <aside className="admin-panel admin-menu">
            <div className="admin-side-heading"><h2>Bloqueos</h2><button type="button" onClick={() => openDialog("block")}>+ Agregar</button></div>
            <div className="block-list">{sortedBlocks.length === 0 ? <p>La agenda no tiene bloqueos.</p> : sortedBlocks.map((block) => <div className="block-item" key={block.id}><div><strong>{blockDateLabel(block)}</strong><span>{blockDescription(block)}</span></div><div className="block-actions"><button type="button" onClick={() => viewBlock(block.id)}>Ver detalle</button><button type="button" onClick={() => removeBlock(block.id)} aria-label={`Eliminar bloqueo del ${block.date}`}>Eliminar</button></div></div>)}</div>
            <h2 className="status-title">Estados</h2>
            <div className="admin-status-legend">{(["confirmed", "completed", "cancelled", "no_show"] as AppointmentStatus[]).map((status) => <StatusBadge status={status} key={status} />)}<StatusBadge status="pending" depositStatus="pending" /></div>
            <div className="admin-notice"><Sparkle /><strong>Persistencia local</strong><p>Turnos y bloqueos sobreviven al refresh en este navegador hasta conectar el backend.</p></div>
          </aside>
        </div>
      </div>

      {selectedAppointment && !dialog && <AppointmentDetail appointment={selectedAppointment} actionError={formError} onClose={() => { setSelectedId(null); setFormError(""); }} onEdit={() => openDialog("edit")} onReschedule={() => openDialog("reschedule")} onCancel={() => openDialog("cancel")} onStatus={setStatus} onReactivate={reactivateAppointment} />}
      {(dialog === "create" || dialog === "edit") && <AppointmentForm mode={dialog} appointment={dialog === "edit" ? selectedAppointment : null} bookings={bookings} blocks={blocks} minDate={today} externalError={formError} onError={setFormError} onClose={closeDialog} onSave={dialog === "create" ? createAppointment : editAppointment} />}
      {dialog === "reschedule" && selectedAppointment && <RescheduleDialog appointment={selectedAppointment} bookings={bookings} blocks={blocks} minDate={today} error={formError} onClose={closeDialog} onSave={reprogramAppointment} />}
      {dialog === "cancel" && selectedAppointment && <CancelDialog appointment={selectedAppointment} onClose={closeDialog} onConfirm={cancelAppointment} />}
      {dialog === "block" && <BlockDialog minDate={today} error={formError} onClose={closeDialog} onSave={saveBlock} />}
      {dialog === "blockDetail" && selectedBlock && <BlockDetail block={selectedBlock} onClose={closeDialog} onDelete={() => removeBlock(selectedBlock.id)} />}
    </section>
  );
}

function AppointmentRow({ appointment, onSelect }: { appointment: AdminAppointment; onSelect: () => void }) {
  const service = getService(appointment.service);
  return <button className="appointment" type="button" onClick={onSelect}><div className="appointment-when"><time>{appointment.time}</time><span>{shortDate(appointment.date)}</span></div><div className="appointment-line" /><div className="appointment-client"><strong>{appointment.clientName}</strong><span>{service?.name}</span>{appointment.wasRescheduled && <em>Reprogramado</em>}</div><div className="appointment-badges"><StatusBadge status={appointment.status} depositStatus={appointment.depositStatus} /><DepositBadge status={appointment.depositStatus} /></div></button>;
}

function AppointmentDetail({ appointment, actionError, onClose, onEdit, onReschedule, onCancel, onStatus, onReactivate }: { appointment: AdminAppointment; actionError: string; onClose: () => void; onEdit: () => void; onReschedule: () => void; onCancel: () => void; onStatus: (status: AppointmentStatus) => void; onReactivate: () => void }) {
  const service = getService(appointment.service);
  const normalizedPhone = normalizeArgentineWhatsApp(appointment.whatsapp);
  const isCancelled = appointment.status === "cancelled";
  return (
    <Modal title="Detalle del turno" onClose={onClose} wide>
      <div className="appointment-detail-grid">
        <DetailItem label="Clienta" value={appointment.clientName} /><DetailItem label="WhatsApp" value={appointment.whatsapp} /><DetailItem label="Servicio" value={service?.name ?? "Servicio"} /><DetailItem label="Fecha" value={formatBookingDate(appointment.date)} /><DetailItem label="Hora" value={`${appointment.time} hs`} />
        <div className="detail-item"><span>Estado</span><div className="detail-badges"><StatusBadge status={appointment.status} depositStatus={appointment.depositStatus} /><DepositBadge status={appointment.depositStatus} /></div></div>
        {appointment.wasRescheduled && <DetailItem label="Historial" value="Este turno fue reprogramado" full />}
        {appointment.cancellation && <DetailItem label="Cancelación" value={`${cancellationReasonConfig.find(({ value }) => value === appointment.cancellation?.reason)?.label} · ${cancellationDepositConfig.find(({ value }) => value === appointment.cancellation?.depositAction)?.label}${appointment.cancellation.note ? ` · ${appointment.cancellation.note}` : ""}`} full />}
        <DetailItem label="Notas" value={appointment.notes || "Sin notas internas"} full />
      </div>
      <div className="admin-actions">
        {isCancelled ? <button type="button" className="primary" onClick={onReactivate}>Reactivar turno</button> : <><button type="button" onClick={onEdit}>Editar turno</button><button type="button" onClick={onReschedule}>Reprogramar</button><button type="button" onClick={onCancel} className="danger">Cancelar turno</button><button type="button" onClick={() => onStatus("completed")} disabled={appointment.status === "completed"}>Marcar como realizado</button><button type="button" onClick={() => onStatus("no_show")} disabled={appointment.status === "no_show"}>Marcar como no-show</button></>}
        {normalizedPhone && <a href={`https://wa.me/${normalizedPhone}`} target="_blank" rel="noreferrer">Contactar por WhatsApp</a>}
      </div>
      {actionError && <p className="admin-form-error" role="alert">{actionError}</p>}
    </Modal>
  );
}

function AppointmentForm({ mode, appointment, bookings, blocks, minDate, externalError, onError, onClose, onSave }: { mode: "create" | "edit"; appointment: AdminAppointment | null; bookings: AdminAppointment[]; blocks: AgendaBlock[]; minDate: string; externalError: string; onError: (message: string) => void; onClose: () => void; onSave: (values: AppointmentFields) => void }) {
  const [date, setDate] = useState(appointment?.date ?? minDate);
  const [time, setTime] = useState(appointment?.time ?? "");
  const availableTimes = getAvailableTimes({ date, bookings, blocks, excludeId: appointment?.id });

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const clientName = String(form.get("clientName")).trim().replace(/\s+/g, " ");
    const whatsapp = String(form.get("whatsapp")).trim();
    if (!isValidPersonName(clientName)) return onError("Ingresá un nombre válido.");
    if (!isValidArgentineWhatsApp(whatsapp)) return onError("Ingresá un número de WhatsApp válido.");
    const scheduleError = validateSchedule({ date, time, bookings, blocks, excludeId: appointment?.id });
    if (scheduleError) return onError(scheduleError);
    onSave({ clientName, whatsapp, service: String(form.get("service")) as ServiceSlug, date, time, depositStatus: String(form.get("depositStatus")) as DepositStatus, notes: String(form.get("notes")).trim() || undefined });
  }

  return (
    <Modal title={mode === "create" ? "Nuevo turno" : "Editar turno"} onClose={onClose}>
      <form className="admin-form" onSubmit={submit}>
        <label><span>Nombre de clienta</span><input name="clientName" defaultValue={appointment?.clientName} required /></label>
        <label><span>WhatsApp</span><input name="whatsapp" type="tel" defaultValue={appointment?.whatsapp} required /></label>
        <label><span>Servicio</span><select name="service" defaultValue={appointment?.service ?? services[0].slug}>{services.map((service) => <option value={service.slug} key={service.slug}>{service.name}</option>)}</select></label>
        <label><span>Fecha</span><input name="date" type="date" min={minDate} value={date} onChange={(event) => { setDate(event.target.value); setTime(""); onError(""); }} required /></label>
        <label><span>Horario</span><select name="time" value={time} onChange={(event) => { setTime(event.target.value); onError(""); }} required><option value="">Elegí un horario</option>{availableTimes.map((slot) => <option value={slot} key={slot}>{slot}</option>)}</select>{date && availableTimes.length === 0 && <small>No hay horarios disponibles.</small>}</label>
        <label><span>Estado de seña</span><select name="depositStatus" defaultValue={appointment?.depositStatus ?? "pending"}>{Object.entries(depositStatusConfig).map(([value, config]) => <option value={value} key={value}>{config.label}</option>)}</select></label>
        <label className="field-wide"><span>Notas internas <small>(opcional)</small></span><textarea name="notes" defaultValue={appointment?.notes} rows={3} /></label>
        {externalError && <p className="admin-form-error" role="alert">{externalError}</p>}<DialogActions onClose={onClose} submitLabel={mode === "create" ? "Crear turno" : "Guardar cambios"} />
      </form>
    </Modal>
  );
}

function RescheduleDialog({ appointment, bookings, blocks, minDate, error, onClose, onSave }: { appointment: AdminAppointment; bookings: AdminAppointment[]; blocks: AgendaBlock[]; minDate: string; error: string; onClose: () => void; onSave: (date: string, time: string) => void }) {
  const [date, setDate] = useState(appointment.date >= minDate ? appointment.date : minDate);
  const [time, setTime] = useState("");
  const availableTimes = getAvailableTimes({ date, bookings, blocks, excludeId: appointment.id });
  return <Modal title="Reprogramar turno" onClose={onClose}><form className="admin-form" onSubmit={(event) => { event.preventDefault(); onSave(date, time); }}><p className="dialog-copy">Se conservarán la clienta, el servicio, la seña y el historial.</p><label><span>Nueva fecha</span><input name="date" type="date" min={minDate} value={date} onChange={(event) => { setDate(event.target.value); setTime(""); }} required /></label><label><span>Nuevo horario</span><select name="time" value={time} onChange={(event) => setTime(event.target.value)} required><option value="">Elegí un horario</option>{availableTimes.map((slot) => <option value={slot} key={slot}>{slot}</option>)}</select>{date && availableTimes.length === 0 && <small>No hay horarios disponibles.</small>}</label>{error && <p className="admin-form-error" role="alert">{error}</p>}<DialogActions onClose={onClose} submitLabel="Confirmar reprogramación" /></form></Modal>;
}

function CancelDialog({ appointment, onClose, onConfirm }: { appointment: AdminAppointment; onClose: () => void; onConfirm: (reason: CancellationReason, depositAction: CancellationDepositAction, note: string) => void }) {
  return <Modal title="Cancelar turno" onClose={onClose}><form className="admin-form" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); onConfirm(String(form.get("reason")) as CancellationReason, String(form.get("depositAction")) as CancellationDepositAction, String(form.get("note")).trim()); }}><div className="admin-warning"><strong>¿Confirmás la cancelación?</strong><p>El turno de {appointment.clientName} quedará en el historial.</p></div><label><span>Motivo de cancelación</span><select name="reason">{cancellationReasonConfig.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label><label><span>Tratamiento de la seña</span><select name="depositAction">{cancellationDepositConfig.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label><label className="field-wide"><span>Nota interna <small>(opcional)</small></span><textarea name="note" rows={3} /></label><DialogActions onClose={onClose} submitLabel="Confirmar cancelación" danger /></form></Modal>;
}

function BlockDialog({ minDate, error, onClose, onSave }: { minDate: string; error: string; onClose: () => void; onSave: (values: BlockFields) => void }) {
  const [type, setType] = useState<AgendaBlockType>("slot");
  const [date, setDate] = useState(minDate);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onSave({
      type,
      date,
      endDate: String(form.get("endDate") || "") || undefined,
      time: String(form.get("time") || "") || undefined,
      reason: String(form.get("reason") || "") || undefined,
      note: String(form.get("note") || "").trim() || undefined,
    });
  }

  return (
    <Modal title="Bloquear agenda" onClose={onClose}>
      <form className="admin-form" onSubmit={submit}>
        <p className="dialog-copy">Elegí si querés bloquear un horario, un día completo o un rango inclusivo de fechas.</p>
        <label className="field-wide"><span>Tipo de bloqueo</span><select name="type" value={type} onChange={(event) => setType(event.target.value as AgendaBlockType)}><option value="slot">Horario específico</option><option value="day">Día completo</option><option value="range">Rango de fechas</option></select></label>
        <label><span>{type === "range" ? "Fecha desde" : "Fecha"}</span><input name="date" type="date" min={minDate} value={date} onChange={(event) => setDate(event.target.value)} required /></label>
        {type === "range" && <label><span>Fecha hasta</span><input name="endDate" type="date" min={date || minDate} required /></label>}
        {type === "slot" && <label><span>Horario</span><select name="time" defaultValue="" required><option value="">Elegí un horario</option>{bookingConfig.availableTimes.map((time) => <option value={time} key={time}>{time}</option>)}</select></label>}
        <label className="field-wide"><span>Motivo interno <small>(opcional)</small></span><select name="reason" defaultValue=""><option value="">Sin motivo</option>{agendaBlockReasons.map((reason) => <option value={reason} key={reason}>{reason}</option>)}</select></label>
        <label className="field-wide"><span>Nota interna <small>(opcional)</small></span><textarea name="note" rows={3} placeholder="Detalle visible solo en el admin" /></label>
        {error && <p className="admin-form-error" role="alert">{error}</p>}
        <DialogActions onClose={onClose} submitLabel="Guardar bloqueo" />
      </form>
    </Modal>
  );
}

function BlockDetail({ block, onClose, onDelete }: { block: AgendaBlock; onClose: () => void; onDelete: () => void }) {
  return (
    <Modal title="Detalle del bloqueo" onClose={onClose}>
      <div className="appointment-detail-grid">
        <DetailItem label="Tipo" value={blockTypeLabel(block.type)} />
        <DetailItem label={block.type === "range" ? "Fecha desde" : "Fecha"} value={formatNumericDate(block.date)} />
        {block.type === "range" && <DetailItem label="Fecha hasta" value={formatNumericDate(block.endDate ?? block.date)} />}
        {block.type === "slot" && <DetailItem label="Horario" value={`${block.time} hs`} />}
        <DetailItem label="Motivo" value={block.reason || "Sin motivo"} full />
        <DetailItem label="Nota interna" value={block.note || "Sin nota interna"} full />
      </div>
      <div className="admin-actions block-detail-actions"><button type="button" onClick={onClose}>Volver</button><button type="button" className="danger" onClick={onDelete}>Eliminar bloqueo</button></div>
    </Modal>
  );
}

function Modal({ title, onClose, wide = false, children }: { title: string; onClose: () => void; wide?: boolean; children: React.ReactNode }) { return <div className="admin-modal-backdrop" role="presentation"><section className={`admin-modal ${wide ? "admin-modal--wide" : ""}`} role="dialog" aria-modal="true" aria-labelledby="admin-dialog-title"><div className="admin-modal-header"><h2 id="admin-dialog-title">{title}</h2><button type="button" onClick={onClose} aria-label="Cerrar">×</button></div>{children}</section></div>; }
function DialogActions({ onClose, submitLabel, danger = false }: { onClose: () => void; submitLabel: string; danger?: boolean }) { return <div className="dialog-actions field-wide"><button type="button" onClick={onClose}>Volver</button><button type="submit" className={danger ? "danger" : "primary"}>{submitLabel}</button></div>; }
function StatusBadge({ status, depositStatus }: { status: AppointmentStatus; depositStatus?: DepositStatus }) { const label = status === "pending" && depositStatus === "pending" ? "Pendiente de seña" : appointmentStatusConfig[status].label; return <span className="status-badge" data-status={status}>{status === "confirmed" && <Check />}{label}</span>; }
function DepositBadge({ status }: { status: DepositStatus }) { return <span className="deposit-badge" data-deposit={status}>{depositStatusConfig[status].label}</span>; }
function DetailItem({ label, value, full = false }: { label: string; value: string; full?: boolean }) { return <div className={`detail-item ${full ? "detail-item--full" : ""}`}><span>{label}</span><strong>{value}</strong></div>; }
function shortDate(date: string) { return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`)); }
function formatNumericDate(date: string) { return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`)); }
function blockTypeLabel(type: AgendaBlockType) { return type === "slot" ? "Horario específico" : type === "day" ? "Día completo" : "Rango de fechas"; }
function blockDateLabel(block: AgendaBlock) { return block.type === "range" ? `${formatNumericDate(block.date)} - ${formatNumericDate(block.endDate ?? block.date)}` : block.type === "slot" ? `${formatNumericDate(block.date)} - ${block.time}` : formatNumericDate(block.date); }
function blockDescription(block: AgendaBlock) { const description = block.type === "slot" ? "Horario bloqueado" : block.type === "day" ? "Día completo" : "Rango bloqueado"; return `${description}${block.reason ? ` · ${block.reason}` : ""}`; }
function sameBlock(block: AgendaBlock, values: BlockFields) { return block.type === values.type && block.date === values.date && (block.endDate ?? "") === (values.endDate ?? "") && (block.time ?? "") === (values.time ?? ""); }
