import "server-only";
import { isPaymentProviderReady } from "@/server/payments";
import type { Quote } from "@/types/catalog";

/** Nabízíme jen to, co jde reálně použít: Zásilkovna bez API klíče a nenastavené platební brány se skryjí. */
export function checkoutQuote(quote: Quote): Quote {
  const packetaReady = Boolean(process.env.NEXT_PUBLIC_PACKETA_API_KEY);
  return {
    ...quote,
    shipping_methods: quote.shipping_methods.filter((m) => m.type !== "pickup_point" || (m.carrier === "packeta" && packetaReady)),
    payment_methods: quote.payment_methods.filter((m) => !m.is_online || isPaymentProviderReady(m.provider)),
  };
}
