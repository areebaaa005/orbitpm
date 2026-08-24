interface OrbitMarkProps {
  size?: number;
  className?: string;
}

/**
 * The OrbitPM signature mark: a small orbiting-dot motif that echoes the
 * product's name and its core idea (tasks in motion around a project).
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
      <circle cx="16" cy="16" r="4.5" fill="#5B5FEF" />
      <ellipse
        cx="16"
        cy="16"
        rx="14"
        ry="6.5"
        stroke="#ABA9FF"
        strokeWidth="1.6"
        transform="rotate(-20 16 16)"
      />
      <ellipse
        cx="16"
        cy="16"
        rx="14"
        ry="6.5"
        stroke="#5B5FEF"
        strokeOpacity="0.35"
        strokeWidth="1.6"
        transform="rotate(40 16 16)"
      />
      <circle cx="27.5" cy="11.5" r="2" fill="#F59E0B" />
    </svg>
  );
}
