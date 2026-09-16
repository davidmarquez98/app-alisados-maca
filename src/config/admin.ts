import type {
  AdminAppointment,
  AppointmentStatus,
  CancellationDepositAction,
  CancellationReason,
  DepositStatus,
} from "@/types/admin";

export const appointmentStatusConfig: Record<AppointmentStatus, { label: string }> = {
  pending: { label: "Pendiente" },
  confirmed: { label: "Confirmado" },
  completed: { label: "Realizado" },
  cancelled: { label: "Cancelado" },
  no_show: { label: "No se presentó" },
};

export const depositStatusConfig: Record<DepositStatus, { label: string }> = {
  pending: { label: "Seña pendiente" },
  paid: { label: "Seña pagada" },
  forfeited: { label: "Seña perdida" },
  refunded: { label: "Seña devuelta" },
};

export const cancellationReasonConfig: Array<{ value: CancellationReason; label: string }> = [
  { value: "client", label: "Canceló la clienta" },
  { value: "business", label: "Canceló el negocio" },
  { value: "late", label: "Llegó tarde" },
  { value: "other", label: "Otro" },
];

export const cancellationDepositConfig: Array<{ value: CancellationDepositAction; label: string }> = [
  { value: "keep", label: "Conserva la seña" },
  { value: "forfeit", label: "Pierde la seña" },
  { value: "refund", label: "Devolución excepcional" },
];

export const initialAdminAppointments: AdminAppointment[] = [
  {
    id: "turno-camila",
    clientName: "Camila Rodríguez",
    whatsapp: "11 2456-7812",
    service: "biotina",
    date: "2026-09-15",
    time: "08:00",
    status: "confirmed",
    depositStatus: "paid",
    notes: "Prefiere poco volumen en las puntas.",
  },
  {
    id: "turno-julieta",
    clientName: "Julieta López",
    whatsapp: "(11) 6123-4409",
    service: "botox-multivitaminico",
    date: "2026-09-15",
    time: "12:00",
    status: "pending",
    depositStatus: "pending",
  },
  {
    id: "turno-sofia",
    clientName: "Sofía Acosta",
    whatsapp: "+54 9 11 3344-8890",
    service: "shock-keratina",
    date: "2026-09-15",
    time: "16:00",
    status: "confirmed",
    depositStatus: "paid",
  },
  {
    id: "turno-valentina",
    clientName: "Valentina Díaz",
    whatsapp: "11 4088 2190",
    service: "alisado",
    date: "2026-09-16",
    time: "08:00",
    status: "confirmed",
    depositStatus: "paid",
    wasRescheduled: true,
  },
];
