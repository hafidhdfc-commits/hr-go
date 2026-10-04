import { MoreMenu } from "@/src/components/more-menu";

export default function OwnerMore() {
  return (
    <MoreMenu
      title="More"
      subtitle="Management & system controls"
      sections={[
        {
          heading: "Fleet & Billing",
          items: [
            { label: "Customers", to: "/customers" },
            { label: "Vehicles", to: "/vehicles" },
            { label: "Routes & Pricing", to: "/routes" },
            { label: "Invoices", to: "/invoices-list" },
            { label: "Reports", to: "/reports" },
          ],
        },
        {
          heading: "System",
          items: [
            { label: "System Settings", to: "/settings" },
            { label: "WhatsApp Templates", to: "/whatsapp-templates" },
            { label: "Audit Logs", to: "/audit" },
            { label: "Change Password", to: "/change-password" },
          ],
        },
      ]}
    />
  );
}
