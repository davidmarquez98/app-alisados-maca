import Link from "next/link";
import { businessConfig } from "@/config/business";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div>
          <p className="footer-brand">{businessConfig.name}</p>
          <p className="muted">Belleza y cuidado, a tu manera.</p>
        </div>
        <div className="footer-links">
          <Link href="/reservar">Reservar</Link>
          <a href={businessConfig.instagramUrl} target="_blank" rel="noreferrer">{businessConfig.instagram}</a>
          <Link href="/admin">Admin</Link>
        </div>
      </div>
    </footer>
  );
}
