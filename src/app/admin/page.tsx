import type { Metadata } from "next";
import { AdminDashboard } from "@/components/admin/admin-dashboard";

export const metadata: Metadata = { title: "Administración" };

export default function AdminPage() {
  if (process.env.NODE_ENV !== "development") {
    return <section className="admin-page"><div className="container admin-container"><div className="admin-panel"><h1>Panel no disponible</h1><p>La administración real requiere Auth antes de habilitarse fuera del entorno de desarrollo.</p></div></div></section>;
  }
  return <AdminDashboard />;
}
