import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "light";
  className?: string;
};

export function ButtonLink({ href, children, variant = "primary", className = "" }: Props) {
  return (
    <Link href={href} className={`button button--${variant} ${className}`}>
      {children}
    </Link>
  );
}
