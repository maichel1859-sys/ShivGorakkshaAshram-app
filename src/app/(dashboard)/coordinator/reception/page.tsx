import { Metadata } from "next";
import { ReceptionDashboard } from "@/components/coordinator/reception-dashboard";

export const metadata: Metadata = {
  title: "Reception Dashboard - ShivGoraksha Ashram",
  description: "Manage walk-in devotees, appointments, and reception workflows",
};

export default function ReceptionPage() {
  return <ReceptionDashboard />;
}