import { Linking, Platform } from "react-native";

export function rupiah(n?: number | null): string {
  const v = Math.round(n || 0);
  return "Rp" + v.toLocaleString("id-ID");
}

export function fmtDate(iso?: string | null): string {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "-";
  }
}

export function fmtTime(iso?: string | null): string {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    const t = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
    return `${t} WIB`;
  } catch {
    return "-";
  }
}

export function fmtDateTime(iso?: string | null): string {
  if (!iso) return "-";
  return `${fmtDate(iso)} · ${fmtTime(iso)}`;
}

export function initials(name?: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] || "") + (parts[1]?.[0] || "");
}

export type StatusKind = "success" | "warning" | "error" | "info" | "muted";

export function tripStatusKind(status?: string): StatusKind {
  switch (status) {
    case "COMPLETED":
      return "success";
    case "CANCELLED":
      return "error";
    case "UNASSIGNED":
      return "muted";
    case "ASSIGNED":
      return "info";
    default:
      return "warning";
  }
}

export function tripStatusLabel(status?: string): string {
  const map: Record<string, string> = {
    UNASSIGNED: "Unassigned",
    ASSIGNED: "Assigned",
    ACCEPTED: "Accepted",
    ON_THE_WAY: "On the way",
    ARRIVED: "Arrived",
    IN_PROGRESS: "In progress",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
  };
  return map[status || ""] || status || "-";
}

export function userStatusKind(status?: string): StatusKind {
  if (status === "ACTIVE") return "success";
  if (status === "SUSPENDED") return "error";
  return "muted";
}

export function invoiceStatusKind(status?: string): StatusKind {
  if (status === "PAID") return "success";
  if (status === "PARTIAL") return "warning";
  return "error";
}

export async function openWhatsApp(phoneDigits: string, message: string) {
  const text = encodeURIComponent(message);
  const url = `https://wa.me/${phoneDigits}?text=${text}`;
  await Linking.openURL(url);
}

export async function openDialer(phone: string) {
  await Linking.openURL(`tel:${phone}`);
}

export async function openNavigation(destination: string) {
  const q = encodeURIComponent(destination);
  const url =
    Platform.OS === "ios"
      ? `https://www.google.com/maps/dir/?api=1&destination=${q}`
      : `https://www.google.com/maps/dir/?api=1&destination=${q}`;
  await Linking.openURL(url);
}
