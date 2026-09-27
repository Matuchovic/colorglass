import "server-only";
import QRCode from "qrcode";

// QR Platba (Short Payment Descriptor, standard ČBA) pro bankovní převod v CZK.
function spdEscape(value: string): string {
  return value.replace(/\*/g, "%2A").normalize("NFD").replace(/[\u0300-\u036f]/g, "").slice(0, 60);
}

export function spdString(opts: { iban: string; amountMinor: number; currency: "CZK" | "EUR"; vs: string; message: string }): string {
  const iban = opts.iban.replace(/\s/g, "").toUpperCase();
  const amount = (opts.amountMinor / 100).toFixed(2);
  return ["SPD*1.0", `ACC:${iban}`, `AM:${amount}`, `CC:${opts.currency}`, `X-VS:${opts.vs}`, `MSG:${spdEscape(opts.message)}`].join("*");
}

/** Vrátí SVG QR kódu (generuje se na serveru – žádná data nejdou třetí straně). */
export async function qrSvg(content: string): Promise<string> {
  return QRCode.toString(content, { type: "svg", errorCorrectionLevel: "M", margin: 1, color: { dark: "#0b1533", light: "#ffffff" } });
}

/** IBAN z čísla účtu ve formátu „předčíslí-číslo/kód banky“ (CZ). */
export function czAccountToIban(account: string): string | null {
  const m = account.replace(/\s/g, "").match(/^(?:(\d{1,6})-)?(\d{2,10})\/(\d{4})$/);
  if (!m) return null;
  const bban = `${m[3]}${(m[1] ?? "").padStart(6, "0")}${m[2]!.padStart(10, "0")}`;
  const numeric = `${bban}123500`; // „CZ00“ → C=12, Z=35
  let remainder = 0;
  for (const ch of numeric) remainder = (remainder * 10 + Number(ch)) % 97;
  const check = String(98 - remainder).padStart(2, "0");
  return `CZ${check}${bban}`;
}
