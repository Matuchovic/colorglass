// Náhledový režim: bez připojené databáze (chybí proměnné Supabase) web běží nad přibaleným
// snapshotem ukázkových dat – vhodné pro první nasazení a kontrolu designu. Nákup je vypnutý
// a stránky mají noindex. Po doplnění proměnných Supabase se režim sám vypne.
export const PREVIEW_MODE = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
