"use client";

import Link from "next/link";
import { useTransition } from "react";
import { CartIcon, HeartIcon } from "@/components/icons";
import { useShop } from "@/components/providers/shop-provider";
import { addToCartAction } from "@/actions/shop";
import { storePath } from "@/lib/store";
import { cn } from "@/lib/utils";

export function WishlistButton({ productId, className }: { productId: string; className?: string }) {
  const { wishlist, toggleWishlist, toast, labels } = useShop();
  const active = wishlist.includes(productId);
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? labels.product.wishlistRemove : labels.product.wishlistAdd}
      onClick={() => {
        const added = toggleWishlist(productId);
        toast(added ? labels.wishlist.added : labels.wishlist.removed, added ? "success" : "info");
      }}
      className={cn("grid size-9 place-items-center rounded-full transition-colors hover:bg-ink-50", active ? "text-danger-500" : "text-ink-700", className)}
    >
      <HeartIcon size={21} filled={active} className={active ? "animate-pop" : undefined} />
    </button>
  );
}

/** Rychlé přidání do košíku z karty; produkt s více variantami vede na detail. */
export function AddToCartButton({ variantId, slug, variantCount, disabled }: { variantId: string; slug: string; variantCount: number; disabled: boolean }) {
  const { store, labels, toast, setCartCount } = useShop();
  const [pending, startTransition] = useTransition();
  const base = "grid size-11 shrink-0 place-items-center rounded-btn text-white shadow-[0_6px_16px_-6px_rgb(31_79_245/0.7)] transition";

  if (variantCount > 1) {
    return (
      <Link href={storePath(store, `/produkt/${slug}`)} aria-label={labels.product.chooseVariant} className={cn(base, "bg-brand-600 hover:bg-brand-700")}>
        <CartIcon size={21} />
      </Link>
    );
  }
  return (
    <button
      type="button"
      disabled={disabled || pending}
      aria-label={disabled ? labels.product.outOfStock : labels.product.addToCart}
      aria-busy={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await addToCartAction(store, variantId, 1);
          if (res.ok) {
            setCartCount(res.count);
            toast(res.capped ? labels.cart.maxQuantity : labels.cart.added, res.capped ? "info" : "success");
          } else if (res.error === "PREVIEW") toast(labels.preview.cart, "info");
          else if (res.error === "RATE_LIMITED") toast(labels.errors.rateLimited, "error");
          else if (res.error === "UNAVAILABLE") toast(labels.product.outOfStock, "error");
          else toast(labels.cart.error, "error");
        })
      }
      className={cn(base, "bg-brand-600 hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-ink-300 disabled:shadow-none", pending && "animate-pulse")}
    >
      <CartIcon size={21} />
    </button>
  );
}
