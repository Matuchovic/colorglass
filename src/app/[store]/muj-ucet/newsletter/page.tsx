import { resolveStore } from "@/components/catalog/collection-page";
import { PREVIEW_MODE } from "@/lib/preview";
import { newsletterToggleAction } from "@/actions/account";
import { btnPrimary, btnSecondary } from "@/components/ui/styles";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getSessionUser } from "@/server/auth";

export default async function AccountNewsletter({ params }: { params: Promise<{ store: string }> }) {
  const { store, t } = await resolveStore(params);
  if (PREVIEW_MODE) return null;
  const user = await getSessionUser();
  const { data } = user?.email
    ? await supabaseAdmin().from("newsletter_subscribers").select("status").eq("email", user.email.toLowerCase()).maybeSingle()
    : { data: null };
  const subscribed = data?.status === "confirmed";
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold tracking-tight">{t.account.nav.newsletter}</h1>
      <p className="text-ink-700">{subscribed ? t.account.newsletterOn : t.account.newsletterOff}</p>
      {!subscribed && <p className="max-w-xl text-sm text-ink-600">{t.newsletter.consentText}</p>}
      <form action={newsletterToggleAction}>
        <input type="hidden" name="store" value={store.code} />
        <input type="hidden" name="subscribe" value={subscribed ? "0" : "1"} />
        <button type="submit" className={subscribed ? btnSecondary : btnPrimary}>{subscribed ? t.account.newsletterUnsubscribe : t.account.newsletterSubscribe}</button>
      </form>
    </div>
  );
}
