const TONE: Record<string, string> = {
  new: "bg-brand-50 text-brand-800", awaiting_payment: "bg-warning-50 text-[#9a5b00]", paid: "bg-success-50 text-success-600",
  processing: "bg-brand-50 text-brand-800", ready_to_ship: "bg-brand-50 text-brand-800", shipped: "bg-brand-50 text-brand-800",
  delivered: "bg-success-50 text-success-600", cancelled: "bg-ink-100 text-ink-600", returned: "bg-ink-100 text-ink-600", complaint: "bg-danger-50 text-danger-600",
  requested: "bg-brand-50 text-brand-800", approved: "bg-success-50 text-success-600", received: "bg-brand-50 text-brand-800",
  refunded: "bg-success-50 text-success-600", rejected: "bg-danger-50 text-danger-600", resolved: "bg-success-50 text-success-600",
};

export function StatusBadge({ status, label }: { status: string; label: string }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${TONE[status] ?? "bg-ink-100 text-ink-700"}`}>{label}</span>;
}
