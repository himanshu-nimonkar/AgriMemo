/**
 * AgriMemo — SVG Logo Icon
 */
export function AgriMemoLogo({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="40" height="40" rx="10" fill="#3eaa13" />
      {/* Leaf / sprout shape */}
      <path
        d="M20 30 C20 30 20 18 12 14 C16 14 22 16 24 22 C26 16 32 14 28 14 C20 18 20 30 20 30Z"
        fill="white"
        opacity="0.95"
      />
      <path
        d="M20 30 L20 20"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.7"
      />
      {/* Sound waves suggesting voice */}
      <path
        d="M8 20 Q9 17 10 20 Q11 23 12 20"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
        fill="none"
      />
    </svg>
  )
}
