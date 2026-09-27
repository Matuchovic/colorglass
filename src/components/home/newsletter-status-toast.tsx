"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useShop } from "@/components/providers/shop-provider";

/** Zobrazí výsledek potvrzení odběru (?newsletter=confirmed|invalid) a parametr z URL odstraní. */
export function NewsletterStatusToast() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { toast, labels } = useShop();
  const status = params.get("newsletter");

  useEffect(() => {
    if (status !== "confirmed" && status !== "invalid") return;
    toast(status === "confirmed" ? labels.newsletter.confirmed : labels.newsletter.invalid, status === "confirmed" ? "success" : "error");
    router.replace(pathname, { scroll: false });
  }, [status, toast, labels, router, pathname]);

  return null;
}
