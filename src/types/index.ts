export type ServiceSlug =
  | "alisado"
  | "biotina"
  | "botox-multivitaminico"
  | "shock-keratina";

export type HairLength = {
  key: "short" | "medium" | "long" | "extra-long";
  label: string;
  description: string;
};

export type Service = {
  slug: ServiceSlug;
  name: string;
  eyebrow: string;
  shortDescription: string;
  description: string;
  priceFrom: number;
  prices: Record<HairLength["key"], number>;
  estimatedDurationHours: number;
  accent: string;
};

export type BookingFormData = {
  service: ServiceSlug | "";
  date: string;
  time: string;
  firstName: string;
  lastName: string;
  whatsapp: string;
  email: string;
  acceptedPolicy: boolean;
};

export type ConfirmedBooking = BookingFormData & {
  id: string;
  serviceName: string;
  depositAmount: number;
};

export type { PublicService, PublicServicePrice } from "./catalog";

// Preserve the existing UI Service name; database rows use DbService/DbBooking.
export type {
  Business,
  Professional,
  BusinessMember,
  Service as DbService,
  ServicePrice,
  Client,
  Booking as DbBooking,
  BookingEvent,
  BookingStatus,
  DepositStatus as DbDepositStatus,
  ScheduleBlock,
  ScheduleBlockType,
  Payment,
  PaymentStatus,
} from "./database";
