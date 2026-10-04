import { MoreMenu } from "@/src/components/more-menu";

export default function AdminMore() {
  return (
    <MoreMenu
      title="More"
      subtitle="Operations tools"
      sections={[
        {
          heading: "Operations",
          items: [
            { label: "Customers", to: "/customers" },
            { label: "Vehicles", to: "/vehicles" },
            { label: "Routes & Pricing", to: "/routes" },
            { label: "Reports", to: "/reports" },
          ],
        },
        {
          heading: "Tools",
          items: [
            { label: "WhatsApp Templates", to: "/whatsapp-templates" },
            { label: "Audit Logs", to: "/audit" },
            { label: "Change Password", to: "/change-password" },
          ],
        },
      ]}
    />
  );
}
