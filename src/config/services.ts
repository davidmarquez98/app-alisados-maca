import type { Service } from "@/types";

export const services: Service[] = [
  {
    slug: "alisado",
    name: "Alisado Forte",
    eyebrow: "Liso & brillo",
    shortDescription: "Suavidad, brillo y control para simplificar tu rutina diaria.",
    description:
      "Un tratamiento pensado para reducir el frizz, aportar brillo y dejar el cabello más dócil. Evaluamos tu pelo en persona para adaptar el trabajo a lo que realmente necesita.",
    priceFrom: 40000,
    prices: { short: 40000, medium: 45000, long: 50000, "extra-long": 55000 },
    estimatedDurationHours: 3,
    accent: "rose",
  },
  {
    slug: "biotina",
    name: "Biotina",
    eyebrow: "Fortaleza & vitalidad",
    shortDescription: "Un tratamiento de cuidado para devolverle vitalidad y suavidad a tu pelo.",
    description:
      "Un tratamiento capilar pensado para acompañar cabellos que necesitan cuidado, suavidad y un aspecto más saludable. El procedimiento se adapta al estado actual de tu pelo.",
    priceFrom: 30000,
    prices: { short: 30000, medium: 35000, long: 40000, "extra-long": 45000 },
    estimatedDurationHours: 3,
    accent: "lilac",
  },
  {
    slug: "botox-multivitaminico",
    name: "Botox Multivitamínico",
    eyebrow: "Suavidad & reparación",
    shortDescription: "Cuidado intensivo para un cabello más suave, luminoso y manejable.",
    description:
      "Un tratamiento multivitamínico de cuidado profundo que ayuda a mejorar la apariencia, suavidad y manejabilidad del cabello. Se personaliza según sus necesidades.",
    priceFrom: 30000,
    prices: { short: 30000, medium: 35000, long: 40000, "extra-long": 45000 },
    estimatedDurationHours: 3,
    accent: "rose",
  },
  {
    slug: "shock-keratina",
    name: "Shock de Keratina",
    eyebrow: "Brillo & nutrición",
    shortDescription: "Un shock de cuidado para recuperar brillo, suavidad y movimiento.",
    description:
      "Un tratamiento con keratina orientado a cabellos que buscan recuperar una apariencia más suave y luminosa. Maca evalúa el cabello para adaptar cada aplicación.",
    priceFrom: 30000,
    prices: { short: 30000, medium: 35000, long: 40000, "extra-long": 45000 },
    estimatedDurationHours: 3,
    accent: "lilac",
  },
];

export function getService(slug: string) {
  return services.find((service) => service.slug === slug);
}
