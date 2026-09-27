// Časové výpočty pro serverové komponenty (vykreslení probíhá na požadavek, čas je součást dat).
export const isWithinMinutes = (iso: string, minutes: number): boolean => Date.now() - new Date(iso).getTime() < minutes * 60_000;
export const daysAgoIso = (days: number): string => new Date(Date.now() - days * 86_400_000).toISOString();
