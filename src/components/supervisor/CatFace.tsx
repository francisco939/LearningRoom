interface CatFaceProps {
  className?: string
}

export function CatFace({ className }: CatFaceProps) {
  return (
    <svg className={className} viewBox="0 0 120 150" aria-hidden>
      <defs>
        <linearGradient id="cat-fur" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d98f4f" />
          <stop offset="100%" stopColor="#a9672f" />
        </linearGradient>
        <radialGradient id="cat-bg" cx="50%" cy="35%" r="75%">
          <stop offset="0%" stopColor="#4a3524" />
          <stop offset="100%" stopColor="#171009" />
        </radialGradient>
      </defs>
      <rect width="120" height="150" fill="url(#cat-bg)" />
      <path d="M28 62 L20 24 L46 42 Z" fill="#b87338" />
      <path d="M92 62 L100 24 L74 42 Z" fill="#b87338" />
      <ellipse cx="60" cy="82" rx="34" ry="32" fill="url(#cat-fur)" />
      <path d="M60 54 C50 54 43 62 42 76 C41 90 48 100 60 100 C72 100 79 90 78 76 C77 62 70 54 60 54 Z" fill="#f0e4d0" />
      <path d="M48 72 q6 -5 12 0" stroke="#3a2a1c" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M60 72 q6 -5 12 0" stroke="#3a2a1c" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M56 86 q4 3 8 0" stroke="#a9672f" strokeWidth="2" fill="none" strokeLinecap="round" />
      <g stroke="#5a4630" strokeWidth="0.9" opacity="0.8">
        <path d="M40 84 L16 80" />
        <path d="M40 88 L18 92" />
        <path d="M80 84 L104 80" />
        <path d="M80 88 L102 92" />
      </g>
      <path d="M44 50 q16 -8 32 0" stroke="#b87338" strokeWidth="5" fill="none" opacity="0.7" />
    </svg>
  )
}
