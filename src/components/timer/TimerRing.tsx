interface TimerRingProps {
  ratio: number
  breaking?: boolean
}

export function TimerRing({ ratio, breaking = false }: TimerRingProps) {
  const r = 46
  const c = 2 * Math.PI * r
  const offset = c * (1 - Math.min(1, Math.max(0, ratio)))

  return (
    <svg
      viewBox="0 0 100 100"
      className="pointer-events-none absolute h-[clamp(280px,40vw,460px)] w-[clamp(280px,40vw,460px)] opacity-70"
      aria-hidden
    >
      <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(244,232,210,0.09)" strokeWidth="0.7" />
      <circle
        className="dial"
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke={breaking ? 'rgba(110,127,106,0.85)' : 'rgba(227,164,92,0.85)'}
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
      />
      <circle cx="50" cy="50" r="43" fill="none" stroke="rgba(244,232,210,0.03)" strokeWidth="6" />
    </svg>
  )
}
