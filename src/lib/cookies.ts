// Názvy cookies na jednom místě (dokumentováno i v zásadách cookies)
export const CART_COOKIE = "color_cart";
export const CONSENT_COOKIE = "color_consent";
export const CONSENT_VERSION = 1;
export const CART_COOKIE_MAX_AGE = 60 * 60 * 24 * 90;

export type ConsentState = { v: number; analytics: boolean; marketing: boolean; at: string };
