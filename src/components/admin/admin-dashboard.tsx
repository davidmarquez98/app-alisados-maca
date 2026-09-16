"use client";

import { useMemo, useState } from "react";
import { Check, Sparkle } from "@/components/icons";
import {
  appointmentStatusConfig,
  cancellationDepositConfig,
  cancellationReasonConfig,
  depositStatusConfig,
  initialAdminAppointments,
} from "@/config/admin";
import { bookingConfig } from "@/config/booking";
import { getService, services } from "@/config/services";
import { formatBookingDate, getTodayInputValue } from "@/lib/format";
import type { ServiceSlug } from "@/types";
import type {
  AdminAppointment,
  AppointmentStatus,
  CancellationDepositAction,
  CancellationReason,
  DepositStatus,
} from "@/types/admin";

type DialogName = "create" | "edit" | "reschedule" | "cancel" | null;

export function AdminDashboard() {
  const [appointments, setAppointments] = useState(initialAdminAppointments);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogName>(null);
  const [formError, setFormError] = useState("");
  const today = useMemo(() => getTodayInputValue(), []);
  const selectedAppointment = appointments.find(({ id }) => id === selectedId) ?? null;
  const paidDeposits = appointments.filter(({ depositStatus }) => depositStatus === "paid").length;
  const activeAppointments = appointments.filter(({ status }) => status !== "cancelled").length;

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
    const appointment: AdminAppointment = {
      id: `turno-${Date.now()}`,
      clientName: values.clientName,
      whatsapp: values.whatsapp,
      service: values.service,
      date: values.date,
      time: values.time,
      status: values.depositStatus === "paid" ? "confirmed" : "pending",
      depositStatus: values.depositStatus,
      notes: values.notes,
    };
    setAppointments((current) => [...current, appointment]);
    setSelectedId(appointment.id);
    closeDialog();
  }

  function editAppointment(values: AppointmentFields) {
    if (!selectedAppointment) return;
    setAppointments((current) => current.map((appointment) => appointment.id === selectedAppointment.id ? {
      ...appointment,
      ...values,
      status: appointment.status === "pending" && values.depositStatus === "paid" ? "confirmed" : appointment.status,
    } : appointment));
    closeDialog();
  }

  function reprogramAppointment(date: string, time: string) {
    if (!selectedAppointment) return;
    if (isSunday(date)) {
      setFormError("Los domingos no están disponibles.");
      return;
    }
    setAppointments((current) => current.map((appointment) => appointment.id === selectedAppointment.id ? {
      ...appointment,
      date,
      time,
      wasRescheduled: true,
    } : appointment));
    closeDialog();
  }

  function cancelAppointment(reason: CancellationReason, depositAction: CancellationDepositAction, note: string) {
    if (!selectedAppointment) return;
    const depositByAction: Record<CancellationDepositAction, DepositStatus> = {
      keep: selectedAppointment.depositStatus,
      forfeit: "forfeited",
      refund: "refunded",
    };
    setAppointments((current) => current.map((appointment) => appointment.id === selectedAppointment.id ? {
      ...appointment,
      status: "cancelled",
      depositStatus: depositByAction[depositAction],
      cancellation: { reason, depositAction, note: note || undefined, cancelledAt: new Date().toISOString() },
    } : appointment));
    closeDialog();
  }

  function setStatus(status: AppointmentStatus) {
    if (!selectedAppointment) return;
    setAppointments((current) => current.map((appointment) => appointment.id === selectedAppointment.id ? {
      ...appointment,
      status,
      depositStatus: status === "no_show" ? "forfeited" : appointment.depositStatus,
    } : appointment));
  }

  return (
    <section className="admin-page">
      <div className="container admin-container">
        <div className="admin-header">
          <div><p className="eyebrow">Panel de gestión · Demo</p><h1>Hola, Maca</h1><p>Gestioná la agenda local de prueba.</p></div>
          <button className="admin-new-button" type="button" onClick={() => openDialog("create")}>+ Nuevo turno</button>
        </div>

        <div className="admin-stats">
          <article><span>Turnos cargados</span><strong>{appointments.length}</strong><small>{activeAppointments} activos</small></article>
          <article><span>Señas pagadas</span><strong>{paidDeposits}</strong><small>datos mock</small></article>
          <article><span>Próximo horario</span><strong>08:00</strong><small>bloques de agenda</small></article>
        </div>

        <div className="admin-grid">
          <div className="admin-panel">
            <div className="panel-heading"><div><h2>Agenda</h2><p>Tocá un turno para ver sus acciones</p></div><button type="button" onClick={() => openDialog("create")}>+ Nuevo turno</button></div>
            <div className="appointment-list">
              {appointments.map((appointment) => (
                <AppointmentRow appointment={appointment} onSelect={() => setSelectedId(appointment.id)} key={appointment.id} />
              ))}
            </div>
          </div>
          <aside className="admin-panel admin-menu">
            <h2>Estados</h2>
            <div className="admin-status-legend">
              {(["confirmed", "completed", "cancelled", "no_show"] as AppointmentStatus[]).map((status) => <StatusBadge status={status} key={status} />)}
              <StatusBadge status="pending" depositStatus="pending" />
            </div>
            <div className="admin-notice"><Sparkle /><strong>Modo demostración</strong><p>Los cambios viven en memoria y se reinician al recargar hasta conectar el backend.</p></div>
          </aside>
        </div>
      </div>

      {selectedAppointment && !dialog && <AppointmentDetail appointment={selectedAppointment} onClose={() => setSelectedId(null)} onEdit={() => openDialog("edit")} onReschedule={() => openDialog("reschedule")} onCancel={() => openDialog("cancel")} onStatus={setStatus} />}
      {(dialog === "create" || dialog === "edit") && <AppointmentForm mode={dialog} appointment={dialog === "edit" ? selectedAppointment : null} minDate={today} error={formError} onError={setFormError} onClose={closeDialog} onSave={dialog === "create" ? createAppointment : editAppointment} />}
      {dialog === "reschedule" && selectedAppointment && <RescheduleDialog appointment={selectedAppointment} minDate={today} error={formError} onClose={closeDialog} onSave={reprogramAppointment} />}
      {dialog === "cancel" && selectedAppointment && <CancelDialog appointment={selectedAppointment} onClose={closeDialog} onConfirm={cancelAppointment} />}
    </section>
  );
}

function AppointmentRow({ appointment, onSelect }: { appointment: AdminAppointment; onSelect: () => void }) {
  const service = getService(appointment.service);
  return (
    <button className="appointment" type="button" onClick={onSelect}>
      <div className="appointment-when"><time>{appointment.time}</time><span>{shortDate(appointment.date)}</span></div>
      <div className="appointment-line" />
      <div className="appointment-client"><strong>{appointment.clientName}</strong><span>{service?.name}</span>{appointment.wasRescheduled && <em>Reprogramado</em>}</div>
      <div className="appointment-badges"><StatusBadge status={appointment.status} depositStatus={appointment.depositStatus} /><DepositBadge status={appointment.depositStatus} /></div>
    </button>
  );
}

function AppointmentDetail({ appointment, onClose, onEdit, onReschedule, onCancel, onStatus }: { appointment: AdminAppointment; onClose: () => void; onEdit: () => void; onReschedule: () => void; onCancel: () => void; onStatus: (status: AppointmentStatus) => void }) {
  const service = getService(appointment.service);
  const whatsappUrl = `https://wa.me/${sanitizePhone(appointment.whatsapp)}`;
  return (
    <Modal title="Detalle del turno" onClose={onClose} wide>
      <div className="appointment-detail-grid">
        <DetailItem label="Clienta" value={appointment.clientName} />
        <DetailItem label="WhatsApp" value={appointment.whatsapp} />
        <DetailItem label="Servicio" value={service?.name ?? "Servicio"} />
        <DetailItem label="Fecha" value={formatBookingDate(appointment.date)} />
        <DetailItem label="Hora" value={`${appointment.time} hs`} />
        <div className="detail-item"><span>Estado</span><div className="detail-badges"><StatusBadge status={appointment.status} depositStatus={appointment.depositStatus} /><DepositBadge status={appointment.depositStatus} /></div></div>
        {appointment.wasRescheduled && <DetailItem label="Historial" value="Este turno fue reprogramado" full />}
        {appointment.cancellation && <DetailItem label="Cancelación" value={`${cancellationReasonConfig.find(({ value }) => value === appointment.cancellation?.reason)?.label} · ${cancellationDepositConfig.find(({ value }) => value === appointment.cancellation?.depositAction)?.label}${appointment.cancellation.note ? ` · ${appointment.cancellation.note}` : ""}`} full />}
        <DetailItem label="Notas" value={appointment.notes || "Sin notas internas"} full />
      </div>
      <div className="admin-actions">
        <button type="button" onClick={onEdit}>Editar turno</button>
        <button type="button" onClick={onReschedule}>Reprogramar</button>
        <button type="button" onClick={onCancel} className="danger" disabled={appointment.status === "cancelled"}>Cancelar turno</button>
        <button type="button" onClick={() => onStatus("completed")} disabled={appointment.status === "completed" || appointment.status === "cancelled"}>Marcar como realizado</button>
        <button type="button" onClick={() => onStatus("no_show")} disabled={appointment.status === "no_show" || appointment.status === "cancelled"}>Marcar como no-show</button>
        <a href={whatsappUrl} target="_blank" rel="noreferrer">Contactar por WhatsApp</a>
      </div>
    </Modal>
  );
}

type AppointmentFields = {
  clientName: string;
  whatsapp: string;
  service: ServiceSlug;
  date: string;
  time: string;
  depositStatus: DepositStatus;
  notes?: string;
};

function AppointmentForm({ mode, appointment, minDate, error, onError, onClose, onSave }: { mode: "create" | "edit"; appointment: AdminAppointment | null; minDate: string; error: string; onError: (message: string) => void; onClose: () => void; onSave: (values: AppointmentFields) => void }) {
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const date = String(form.get("date"));
    if (isSunday(date)) {
      onError("Los domingos no están disponibles.");
      return;
    }
    onSave({
      clientName: String(form.get("clientName")).trim(),
      whatsapp: String(form.get("whatsapp")).trim(),
      service: String(form.get("service")) as ServiceSlug,
      date,
      time: String(form.get("time")),
      depositStatus: String(form.get("depositStatus")) as DepositStatus,
      notes: String(form.get("notes")).trim() || undefined,
    });
  }

  return (
    <Modal title={mode === "create" ? "Nuevo turno" : "Editar turno"} onClose={onClose}>
      <form className="admin-form" onSubmit={submit}>
        <label><span>Nombre de clienta</span><input name="clientName" defaultValue={appointment?.clientName} required /></label>
        <label><span>WhatsApp</span><input name="whatsapp" type="tel" defaultValue={appointment?.whatsapp} required /></label>
        <label><span>Servicio</span><select name="service" defaultValue={appointment?.service ?? services[0].slug}>{services.map((service) => <option value={service.slug} key={service.slug}>{service.name}</option>)}</select></label>
        <label><span>Fecha</span><input name="date" type="date" min={minDate} defaultValue={appointment?.date ?? minDate} required /></label>
        <label><span>Horario</span><select name="time" defaultValue={appointment?.time ?? bookingConfig.availableTimes[0]}>{bookingConfig.availableTimes.map((time) => <option value={time} key={time}>{time}</option>)}</select></label>
        <label><span>Estado de seña</span><select name="depositStatus" defaultValue={appointment?.depositStatus ?? "pending"}>{Object.entries(depositStatusConfig).map(([value, config]) => <option value={value} key={value}>{config.label}</option>)}</select></label>
        <label className="field-wide"><span>Notas internas <small>(opcional)</small></span><textarea name="notes" defaultValue={appointment?.notes} rows={3} /></label>
        {error && <p className="admin-form-error" role="alert">{error}</p>}
        <DialogActions onClose={onClose} submitLabel={mode === "create" ? "Crear turno" : "Guardar cambios"} />
      </form>
    </Modal>
  );
}

function RescheduleDialog({ appointment, minDate, error, onClose, onSave }: { appointment: AdminAppointment; minDate: string; error: string; onClose: () => void; onSave: (date: string, time: string) => void }) {
  return (
    <Modal title="Reprogramar turno" onClose={onClose}>
      <form className="admin-form" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); onSave(String(form.get("date")), String(form.get("time"))); }}>
        <p className="dialog-copy">Se conservarán la clienta, el servicio y el estado de la seña.</p>
        <label><span>Nueva fecha</span><input name="date" type="date" min={minDate} defaultValue={appointment.date} required /></label>
        <label><span>Nuevo horario</span><select name="time" defaultValue={appointment.time}>{bookingConfig.availableTimes.map((time) => <option value={time} key={time}>{time}</option>)}</select></label>
        {error && <p className="admin-form-error" role="alert">{error}</p>}
        <DialogActions onClose={onClose} submitLabel="Confirmar reprogramación" />
      </form>
    </Modal>
  );
}

function CancelDialog({ appointment, onClose, onConfirm }: { appointment: AdminAppointment; onClose: () => void; onConfirm: (reason: CancellationReason, depositAction: CancellationDepositAction, note: string) => void }) {
  return (
    <Modal title="Cancelar turno" onClose={onClose}>
      <form className="admin-form" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); onConfirm(String(form.get("reason")) as CancellationReason, String(form.get("depositAction")) as CancellationDepositAction, String(form.get("note")).trim()); }}>
        <div className="admin-warning"><strong>¿Confirmás la cancelación?</strong><p>El turno de {appointment.clientName} quedará en el historial y no se eliminará.</p></div>
        <label><span>Motivo de cancelación</span><select name="reason">{cancellationReasonConfig.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label>
        <label><span>Tratamiento de la seña</span><select name="depositAction">{cancellationDepositConfig.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label>
        <label className="field-wide"><span>Nota interna <small>(opcional)</small></span><textarea name="note" rows={3} /></label>
        <DialogActions onClose={onClose} submitLabel="Confirmar cancelación" danger />
      </form>
    </Modal>
  );
}

function Modal({ title, onClose, wide = false, children }: { title: string; onClose: () => void; wide?: boolean; children: React.ReactNode }) {
  return <div className="admin-modal-backdrop" role="presentation"><section className={`admin-modal ${wide ? "admin-modal--wide" : ""}`} role="dialog" aria-modal="true" aria-labelledby="admin-dialog-title"><div className="admin-modal-header"><h2 id="admin-dialog-title">{title}</h2><button type="button" onClick={onClose} aria-label="Cerrar">×</button></div>{children}</section></div>;
}

function DialogActions({ onClose, submitLabel, danger = false }: { onClose: () => void; submitLabel: string; danger?: boolean }) {
  return <div className="dialog-actions field-wide"><button type="button" onClick={onClose}>Volver</button><button type="submit" className={danger ? "danger" : "primary"}>{submitLabel}</button></div>;
}

function StatusBadge({ status, depositStatus }: { status: AppointmentStatus; depositStatus?: DepositStatus }) {
  const label = status === "pending" && depositStatus === "pending" ? "Pendiente de seña" : appointmentStatusConfig[status].label;
  return <span className="status-badge" data-status={status}>{status === "confirmed" && <Check />}{label}</span>;
}

function DepositBadge({ status }: { status: DepositStatus }) {
  return <span className="deposit-badge" data-deposit={status}>{depositStatusConfig[status].label}</span>;
}

function DetailItem({ label, value, full = false }: { label: string; value: string; full?: boolean }) {
  return <div className={`detail-item ${full ? "detail-item--full" : ""}`}><span>{label}</span><strong>{value}</strong></div>;
}

function sanitizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

function isSunday(date: string) {
  return new Date(`${date}T12:00:00`).getDay() === 0;
}

function shortDate(date: string) {
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
}
