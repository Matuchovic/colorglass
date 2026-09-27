import { z } from "zod";

// Chybové kódy jsou klíče ve slovníku t.errors → překlad na klientovi (CZ/SK).
export type FieldErrorCode = "required" | "email" | "phone" | "postalCode" | "companyId" | "validation";
export type FieldErrors = Record<string, FieldErrorCode>;

const req = (max: number) => z.string().trim().min(1, { error: "required" }).max(max, { error: "validation" });
const opt = (max: number) =>
  z.string().trim().max(max, { error: "validation" }).optional().transform((v) => (v ? v : undefined));

export const emailSchema = z.string().trim().toLowerCase().max(200, { error: "email" }).pipe(z.email({ error: "email" }));
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^(\+|00)?[0-9 ]{9,17}$/, { error: "phone" })
  .transform((v) => v.replace(/\s+/g, " "));
export const postalCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{3} ?\d{2}$/, { error: "postalCode" })
  .transform((v) => `${v.replace(/\s/g, "").slice(0, 3)} ${v.replace(/\s/g, "").slice(3)}`);
export const marketSchema = z.enum(["CZ", "SK"]);

export const addressSchema = z.object({
  first_name: req(80),
  last_name: req(80),
  company: opt(160),
  street: req(160),
  city: req(80),
  postal_code: postalCodeSchema,
  country: marketSchema,
  phone: z.union([phoneSchema, z.literal("")]).optional().transform((v) => (v ? v : undefined)),
});
export type AddressInput = z.infer<typeof addressSchema>;

export const billingSchema = addressSchema.extend({
  company_id: z
    .union([z.string().trim().regex(/^\d{8}$/, { error: "companyId" }), z.literal("")])
    .optional()
    .transform((v) => (v ? v : undefined)),
  vat_id: z
    .union([z.string().trim().toUpperCase().regex(/^(CZ|SK)\d{8,10}$/, { error: "validation" }), z.literal("")])
    .optional()
    .transform((v) => (v ? v : undefined)),
});

export const pickupPointSchema = z.object({
  id: z.string().trim().min(1).max(40),
  name: z.string().trim().min(1).max(200),
  street: z.string().trim().max(200).optional(),
  city: z.string().trim().max(100).optional(),
  zip: z.string().trim().max(12).optional(),
  carrier: z.string().trim().max(40).optional(),
});

export const checkoutSchema = z
  .object({
    idempotency_key: z.string().min(16).max(100).regex(/^[A-Za-z0-9_-]+$/),
    email: emailSchema,
    phone: phoneSchema,
    shipping_method_id: z.uuid({ error: "required" }),
    shipping_type: z.enum(["address", "pickup_point", "store_pickup"]),
    payment_method_code: z.string().regex(/^[a-z0-9_]+$/, { error: "required" }),
    pickup_point: pickupPointSchema.nullable(),
    shipping_address: addressSchema.nullable(),
    billing_same: z.boolean(),
    billing: billingSchema.nullable(),
    is_business: z.boolean(),
    customer_note: z.string().trim().max(1000).optional(),
    terms: z.literal(true, { error: "required" }),
    marketing_consent: z.boolean(),
    expected_total: z.number().int().nonnegative(),
  })
  .superRefine((v, ctx) => {
    if (v.shipping_type === "address" && !v.shipping_address) {
      ctx.addIssue({ code: "custom", path: ["shipping_address", "street"], message: "required" });
    }
    if (v.shipping_type === "pickup_point" && !v.pickup_point) {
      ctx.addIssue({ code: "custom", path: ["pickup_point"], message: "required" });
    }
    if (!v.billing_same && !v.billing) ctx.addIssue({ code: "custom", path: ["billing", "street"], message: "required" });
    if (v.billing_same && !v.shipping_address && !v.billing) {
      ctx.addIssue({ code: "custom", path: ["billing", "street"], message: "required" });
    }
    if (v.is_business && !(v.billing ?? v.shipping_address)?.company) {
      ctx.addIssue({ code: "custom", path: ["billing", "company"], message: "required" });
    }
  });
export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const passwordSchema = z
  .string()
  .min(10, { error: "validation" })
  .max(72, { error: "validation" })
  .regex(/[a-z]/, { error: "validation" })
  .regex(/[A-Z]/, { error: "validation" })
  .regex(/\d/, { error: "validation" });

export const registerSchema = z.object({
  first_name: req(80),
  last_name: req(80),
  email: emailSchema,
  password: passwordSchema,
  marketing_consent: z.boolean().optional(),
});

export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1, { error: "required" }).max(72) });

export const newsletterSchema = z.object({
  email: emailSchema,
  consent: z.literal(true, { error: "required" }),
  // honeypot + minimální doba vyplnění (anti-spam bez CAPTCHA)
  website: z.string().max(0).optional(),
  started_at: z.coerce.number().int().positive(),
});

export const reviewSchema = z.object({
  product_id: z.uuid(),
  rating: z.coerce.number().int().min(1, { error: "required" }).max(5),
  title: opt(120),
  body: z.string().trim().min(10, { error: "validation" }).max(4000),
  pros: opt(1000),
  cons: opt(1000),
  author_name: z.string().trim().min(2, { error: "required" }).max(60),
  author_city: opt(60),
});

export const contactSchema = z.object({
  name: z.string().trim().min(2, { error: "required" }).max(100),
  email: emailSchema,
  order_number: z.union([z.string().trim().regex(/^\d{10}$/, { error: "validation" }), z.literal("")]).optional(),
  subject: z.string().trim().min(2, { error: "required" }).max(160),
  message: z.string().trim().min(10, { error: "validation" }).max(5000),
  website: z.string().max(0).optional(),
  started_at: z.coerce.number().int().positive(),
});

export const returnRequestSchema = z.object({
  order_id: z.uuid({ error: "required" }),
  type: z.enum(["return", "complaint"]),
  items: z
    .array(z.object({ order_item_id: z.uuid(), quantity: z.number().int().min(1).max(99) }))
    .min(1, { error: "required" })
    .max(50),
  reason: z.string().trim().min(5, { error: "validation" }).max(2000),
  bank_account: opt(64),
});

/** Převede chyby zod na mapu cesta → kód chyby. */
export function toFieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (out[key]) continue;
    const msg = issue.message as FieldErrorCode;
    out[key] = (["required", "email", "phone", "postalCode", "companyId"] as const).includes(msg as never) ? msg : "validation";
  }
  return out;
}
