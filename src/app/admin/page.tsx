import type { Metadata } from "next";
import { AdminDashboard } from "@/components/admin/admin-dashboard";

export const metadata: Metadata = { title: "Administración" };

export default function AdminPage() {
  return <AdminDashboard />;
}
