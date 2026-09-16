import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, Sparkle } from "@/components/icons";
import { HairLengthIllustration } from "@/components/service/hair-length-illustration";
import { bookingConfig, hairLengths } from "@/config/booking";
import { getService, services } from "@/config/services";
import { formatCurrency } from "@/lib/format";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return services.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const service = getService((await params).slug);
  return { title: service?.name ?? "Servicio" };
}

export default async function ServicePage({ params }: Props) {
  const service = getService((await params).slug);
  if (!service) notFound();

  return (
    <>
      <section className="service-hero">
        <div className="container service-hero-grid">
          <div>
            <Link href="/#servicios" className="back-link">← Volver a tratamientos</Link>
            <p className="eyebrow"><Sparkle /> {service.eyebrow}</p>
            <h1>{service.name}</h1>
            <p className="service-lead">{service.description}</p>
            <div className="service-facts"><span><strong>Duración aproximada: {service.estimatedDurationHours} horas.</strong></span><span><strong>{formatCurrency(bookingConfig.deposit)}</strong> Seña</span></div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container narrow">
          <div className="section-heading detail-heading"><div><p className="eyebrow">Guía de precios</p><h2>Valor según el largo</h2></div><p>Una referencia para que puedas orientarte antes de tu visita.</p></div>
          <div className="price-list">
            {hairLengths.map((length) => (
              <div className="price-row" key={length.key}>
                <HairLengthIllustration length={length} />
                <div><h3>{length.label}</h3><p>{length.description}</p></div>
                <strong>{formatCurrency(service.prices[length.key])}</strong>
              </div>
            ))}
          </div>
          <div className="extra-note"><span>+</span><div><strong>Adicional por cantidad</strong><p>Si tenés mucha cantidad de cabello se suma {formatCurrency(5000)}.</p></div></div>
          <div className="important-note"><Check /><p><strong>El precio definitivo se confirma presencialmente.</strong><br />No necesitás elegir tu largo al reservar. Maca evaluará tu cabello antes de comenzar.</p></div>
        </div>
      </section>

    </>
  );
}
