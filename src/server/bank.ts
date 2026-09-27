import "server-only";
import { czAccountToIban, qrSvg, spdString } from "@/lib/qr-payment";
import type { PublicSettings } from "./catalog";
import type { BankInfo } from "@/components/checkout/order-detail";
import type { Tables } from "@/types/database";

/** Platební údaje pro převod + QR Platba (CZK; pro SK se zobrazí IBAN a VS). */
export async function bankInfoFor(order: Tables<"orders">, settings: PublicSettings): Promise<BankInfo> {
  const cz = settings.bank.CZ;
  const account: string | null = order.market === "SK" ? null : (cz?.account ?? null);
  const iban: string | null = order.market === "SK" ? (settings.bank.SK?.iban ?? null) : (cz?.iban ?? (account ? czAccountToIban(account) : null));
  if (!account && !iban) return null;
  const qr = iban && order.currency === "CZK"
    ? await qrSvg(spdString({ iban, amountMinor: order.grand_total, currency: "CZK", vs: order.number, message: `COLOR ${order.number}` }))
    : null;
  return { account, iban, qrSvg: qr };
}
