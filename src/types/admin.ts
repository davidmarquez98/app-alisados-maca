import type { ServiceSlug } from "@/types";

export type AppointmentStatus = "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
export type DepositStatus = "pending" | "paid" | "forfeited" | "refunded";
export type CancellationReason = "client" | "business" | "late" | "other";
export type CancellationDepositAction = "keep" | "forfeit" | "refund";

export type AppointmentCancellation = {
  reason: CancellationReason;
  depositAction: CancellationDepositAction;
  note?: string;
  cancelledAt: string;
};

export type AdminAppointment = {
  id: string;
  clientName: string;
  whatsapp: string;
  service: ServiceSlug;
  date: string;
  time: string;
  status: AppointmentStatus;
  depositStatus: DepositStatus;
  notes?: string;
  wasRescheduled?: boolean;
  cancellation?: AppointmentCancellation;
};
