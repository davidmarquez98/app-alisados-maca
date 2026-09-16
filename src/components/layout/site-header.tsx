import Link from "next/link";
import { businessConfig } from "@/config/business";
import { ButtonLink } from "@/components/ui/button-link";
import { Sparkle } from "@/components/icons";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href="/" className="brand" aria-label={`${businessConfig.name}, inicio`}>
          <Sparkle className="brand-sparkle" />
          <span>{businessConfig.name}</span>
        </Link>
        <ButtonLink href="/reservar" className="header-cta">Reservar turno</ButtonLink>
      </div>
    </header>
  );
}
