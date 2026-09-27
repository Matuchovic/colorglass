// Vlajky ČR a SR (zjednodušené, s jemným zaoblením podle návrhu)
export function FlagCZ({ className = "h-4 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 30 20" className={className} role="img" aria-label="Česko">
      <clipPath id="flag-cz-r"><rect width="30" height="20" rx="3" /></clipPath>
      <g clipPath="url(#flag-cz-r)">
        <rect width="30" height="10" fill="#fff" />
        <rect y="10" width="30" height="10" fill="#d7141a" />
        <path d="M0 0l15 10L0 20z" fill="#11457e" />
      </g>
      <rect width="30" height="20" rx="3" fill="none" stroke="#0b1533" strokeOpacity=".12" />
    </svg>
  );
}

export function FlagSK({ className = "h-4 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 30 20" className={className} role="img" aria-label="Slovensko">
      <clipPath id="flag-sk-r"><rect width="30" height="20" rx="3" /></clipPath>
      <g clipPath="url(#flag-sk-r)">
        <rect width="30" height="20" fill="#ee1c25" />
        <rect width="30" height="13.34" fill="#0b4ea2" />
        <rect width="30" height="6.67" fill="#fff" />
        <path d="M6.3 4.6h8.4v6.3c0 3.1-2.3 4.9-4.2 5.7-1.9-.8-4.2-2.6-4.2-5.7z" fill="#fff" />
        <path d="M6.9 5.2h7.2v5.7c0 2.7-2 4.2-3.6 4.9-1.6-.7-3.6-2.2-3.6-4.9z" fill="#ee1c25" />
        <path d="M10 6.2h1v1.4h1.7v.9H11v1.1h2.2v.9H11v2.4h-1V10.5H7.8v-.9H10V8.5H8.3v-.9H10z" fill="#fff" />
        <path d="M7.2 12.9c.8-.9 1.6-.9 2.3-.3.7-.8 1.4-.8 2 0 .7-.6 1.5-.6 2.3.3-.8 1.4-2.1 2.4-3.3 2.9-1.2-.5-2.5-1.5-3.3-2.9z" fill="#0b4ea2" />
      </g>
      <rect width="30" height="20" rx="3" fill="none" stroke="#0b1533" strokeOpacity=".12" />
    </svg>
  );
}
