import type { HairLength } from "@/types";

export const bookingConfig = {
  deposit: 10000,
  slotBlockHours: 4,
  availableTimes: ["08:00", "12:00", "16:00"],
  closedWeekdays: [0],
  policies: [
    "La seña es de $10.000 y se descuenta del total del servicio.",
    "Avisando con 48 horas o más, podés reprogramar y conservar la seña.",
    "Con menos de 48 horas de aviso o si no asistís, la seña se pierde.",
    "Hay 15 minutos de tolerancia.",
    "A partir de los 30 minutos de demora, el turno puede cancelarse y la seña será retenida.",
  ],
} as const;

export const hairLengths: HairLength[] = [
  { key: "short", label: "Corto", description: "Hasta los hombros" },
  { key: "medium", label: "Medio", description: "Hombros hasta axilas" },
  { key: "long", label: "Largo", description: "Mitad de espalda hasta cintura" },
  { key: "extra-long", label: "Extra largo", description: "Cintura o más" },
];
