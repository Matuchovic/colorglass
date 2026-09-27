"use client";

import Link from "next/link";
import { CartIcon, HeartIcon } from "@/components/icons";
import { AccountMenu, type AccountMenuLabels } from "./account-menu";
import { useShop } from "@/components/providers/shop-provider";
import { fmt } from "@/i18n";
import { storePath } from "@/lib/store";
import type { ReactNode } from "react";

function Action({ href, label, icon, badge, ariaLabel }: { href: string; label: string; icon: ReactNode; badge?: number; ariaLabel?: string }) {
  return (
    <Link href={href} aria-label={ariaLabel ?? label}
      className="group flex flex-col items-center gap-1 rounded-btn px-1.5 py-1 text-ink-800 transition-colors hover:text-brand-700 sm:px-2">
      <span className="relative">
        {icon}
        {badge !== undefined && (
          <span className="absolute -right-2.5 -top-2 grid h-[19px] min-w-[19px] place-items-center rounded-full bg-brand-600 px-1 text-[11px] font-bold leading-none text-white ring-2 ring-white tabular-nums">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </span>
      <span className="hidden text-[13px] font-medium md:block">{label}</span>
    </Link>
  );
}

export function HeaderActions({ labels, accountLabels, google }: {
  labels: { wishlist: string; cart: string; cartCount: string; wishlistCount: string };
  accountLabels: AccountMenuLabels;
  google: boolean;
}) {
  const { store, cartCount, wishlist } = useShop();
  return (
    <div className="flex items-center gap-1 sm:gap-3 lg:gap-5">
      <AccountMenu labels={accountLabels} google={google} />
      <Action href={storePath(store, "/oblibene")} label={labels.wishlist} icon={<HeartIcon size={26} />}
        badge={wishlist.length} ariaLabel={fmt(labels.wishlistCount, { count: wishlist.length })} />
      <Action href={storePath(store, "/kosik")} label={labels.cart} icon={<CartIcon size={26} />}
        badge={cartCount} ariaLabel={fmt(labels.cartCount, { count: cartCount })} />
    </div>
  );
}
