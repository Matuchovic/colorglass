// „Let do košíku“: kopie fotky produktu přeletí obloukem do ikony košíku, ta se zhoupne (a telefon jemně cvrnkne).

function visibleCart(): HTMLElement | null {
  const all = [...document.querySelectorAll<HTMLElement>("[data-cart-target]")].filter((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden";
  });
  return all.find((el) => { const r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= window.innerHeight; }) ?? all[0] ?? null;
}

function bump(target: HTMLElement | null) {
  target?.animate(
    [{ transform: "scale(1)" }, { transform: "scale(1.35) rotate(-10deg)" }, { transform: "scale(0.9) rotate(4deg)" }, { transform: "scale(1)" }],
    { duration: 560, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
  );
  try { navigator.vibrate?.(12); } catch { /* nepodporováno */ }
}

export function flyToCart(source: Element | null | undefined) {
  if (typeof window === "undefined") return;
  const target = visibleCart();
  const img = source instanceof HTMLImageElement ? source : source?.querySelector("img");
  if (!target || !img || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { bump(target); return; }
  const s = img.getBoundingClientRect();
  const t = target.getBoundingClientRect();
  if (s.width === 0 || s.bottom < 0 || s.top > window.innerHeight) { bump(target); return; }
  const clone = img.cloneNode(true) as HTMLImageElement;
  clone.removeAttribute("id");
  clone.alt = "";
  Object.assign(clone.style, {
    position: "fixed", left: `${s.left}px`, top: `${s.top}px`, width: `${s.width}px`, height: `${s.height}px`, margin: "0", inset: "auto",
    zIndex: "95", pointerEvents: "none", objectFit: "contain", willChange: "transform, opacity", filter: "drop-shadow(0 16px 24px rgb(12 30 80 / 0.3))",
  });
  document.body.appendChild(clone);
  const dx = t.left + t.width / 2 - (s.left + s.width / 2);
  const dy = t.top + t.height / 2 - (s.top + s.height / 2);
  const end = Math.max(0.06, Math.min(0.3, 30 / s.width));
  const anim = clone.animate(
    [
      { transform: "translate(0, 0) scale(1) rotate(0deg)", opacity: 1 },
      { transform: `translate(${dx * 0.35}px, ${dy * 0.35 - 140}px) scale(0.62) rotate(-14deg)`, opacity: 1, offset: 0.42 },
      { transform: `translate(${dx}px, ${dy}px) scale(${end}) rotate(-28deg)`, opacity: 0.35 },
    ],
    { duration: 860, easing: "cubic-bezier(0.45, 0.05, 0.3, 1)" },
  );
  const done = () => { clone.remove(); bump(target); };
  anim.onfinish = done;
  anim.oncancel = () => clone.remove();
}
