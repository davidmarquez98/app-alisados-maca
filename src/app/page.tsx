import Link from "next/link";
import { Arrow, Sparkle } from "@/components/icons";
import { ButtonLink } from "@/components/ui/button-link";
import { businessConfig } from "@/config/business";
import { formatCurrency } from "@/lib/format";
import { getPublicServices } from "@/services/service-service";
import type { PublicService } from "@/types";

export default async function HomePage() {
  let services: PublicService[] = [];
  let catalogError = false;
  try {
    services = await getPublicServices();
  } catch {
    catalogError = true;
  }

  return (
    <>
      <section className="hero">
        <div className="hero-orb hero-orb--one" />
        <div className="hero-orb hero-orb--two" />
        <div className="container hero-grid">
          <div className="hero-copy">
            <h1>Tu pelo también merece su <em>momento.</em></h1>
            <p className="hero-description">{businessConfig.description}</p>
            <div className="hero-actions">
              <ButtonLink href="/reservar">Reservar turno <Arrow /></ButtonLink>
              <a href="#servicios" className="text-link">Ver tratamientos</a>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="servicios">
        <div className="container">
          <div className="section-heading">
            <div><p className="eyebrow">Nuestros tratamientos</p><h2>Elegí cómo querés sentir tu pelo</h2></div>
            <p>Cada tratamiento se adapta a tu tipo de cabello y a lo que necesitás.</p>
          </div>
          <div className="service-grid">
            {services.map((service, index) => (
              <Link href={`/servicios/${service.slug}`} className={`service-card service-card--${service.accent}`} key={service.slug}>
                <div className="service-number">0{index + 1}</div>
                <div className="service-icon"><Sparkle /></div>
                <p className="eyebrow">{service.eyebrow}</p>
                <h3>{service.name}</h3>
                <p>{service.shortDescription}</p>
                <div className="service-meta"><span>Desde {formatCurrency(service.priceFrom)}</span><span className="circle-arrow"><Arrow /></span></div>
              </Link>
            ))}
          </div>
          {catalogError && <p className="catalog-notice" role="alert">No pudimos cargar los tratamientos en este momento. Intentá nuevamente en unos minutos.</p>}
          {!catalogError && services.length === 0 && <p className="catalog-notice">Todavía no hay tratamientos disponibles.</p>}
          <p className="price-disclaimer">Los precios son orientativos. El valor final se confirma presencialmente según largo y cantidad de cabello.</p>
        </div>
      </section>

      <section className="section section--tinted">
        <div className="container">
          <div className="center-heading"><p className="eyebrow">Simple y rápido</p><h2>Tu turno en tres pasos</h2></div>
          <div className="steps">
            {["Elegí tu tratamiento", "Elegí día y horario", "Confirmá tu turno"].map((step, index) => (
              <div className="step" key={step}><span>0{index + 1}</span><div className="step-line" /><h3>{step}</h3><p>{["Conocé las opciones y elegí la ideal para vos.", "Consultá los turnos disponibles en la agenda.", "Completá tus datos y simulá el pago de la seña."][index]}</p></div>
            ))}
          </div>
          <div className="center-action"><ButtonLink href="/reservar" variant="secondary">Empezar reserva <Arrow /></ButtonLink></div>
        </div>
      </section>

      <section className="section">
        <div className="container visit-card">
          <div className="visit-copy">
            <p className="eyebrow">Tu momento de cuidado</p>
            <h2>Te esperamos en Lanús Oeste</h2>
            <p>Trabajamos en un espacio privado, tranquilo y preparado para que disfrutes la experiencia.</p>
            <div className="privacy-note"><strong>Ubicación privada</strong><span>{businessConfig.privateAddressNotice}</span></div>
            <a className="instagram-link" href={businessConfig.instagramUrl} target="_blank" rel="noreferrer">Seguinos en Instagram · {businessConfig.instagram} <Arrow /></a>
          </div>
        </div>
      </section>
    </>
  );
}
