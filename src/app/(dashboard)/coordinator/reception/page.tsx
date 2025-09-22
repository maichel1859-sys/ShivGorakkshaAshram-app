import { Metadata } from "next";
import { SimpleReceptionDashboard } from "@/components/coordinator/simple-reception-dashboard";

export const metadata: Metadata = {
  title: "Reception Dashboard - ShivGoraksha Ashram",
  description: "Simple reception workflow for coordinator assistance",
};

export default function ReceptionPage() {
  return <SimpleReceptionDashboard />;
}
