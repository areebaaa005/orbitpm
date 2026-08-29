interface OrbitMarkProps {
  size?: number;
  className?: string;
}

/**
 * OrbitPM's mark: a simple rotated square with a center dot — clean and
 * geometric, reads clearly at small sizes (favicon, sidebar, tab icon).
 */
export function OrbitMark({ size = 28, className = '' }: OrbitMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect
        x="4"
        y="4"
        width="24"
        height="24"
        rx="7"
        transform="rotate(-15 16 16)"
        fill="#5B5FEF"
      />
      <circle cx="16" cy="16" r="4" fill="white" />
      <circle cx="24" cy="9" r="2.5" fill="#F59E0B" />
    </svg>
  );
}
