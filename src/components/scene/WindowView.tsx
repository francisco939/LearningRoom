import type { SceneDef } from '@/data/scenes'

interface WindowViewProps {
  scene: SceneDef
}

export function WindowView({ scene }: WindowViewProps) {
  if (scene.motif === 'library') return <LibraryView />
  if (scene.motif === 'garden') return <GardenView />
  return <CityView />
}

function CityView() {
  return (
    <svg className="window-view" viewBox="0 0 800 600" preserveAspectRatio="xMidYMax slice" aria-hidden>
      <defs>
        <linearGradient id="city-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" style={{ stopColor: 'var(--sky)' }} />
          <stop offset="70%" style={{ stopColor: 'var(--sky2)' }} />
        </linearGradient>
        <radialGradient id="city-haze" cx="50%" cy="80%" r="60%">
          <stop offset="0%" stopColor="rgba(227,164,92,0.28)" />
          <stop offset="100%" stopColor="rgba(227,164,92,0)" />
        </radialGradient>
      </defs>
      <rect width="800" height="600" fill="url(#city-sky)" />
      <circle cx="620" cy="110" r="34" fill="rgba(244,232,210,0.22)" />
      <circle cx="620" cy="110" r="52" fill="rgba(244,232,210,0.06)" />
      <rect y="470" width="800" height="130" fill="url(#city-haze)" />
      <g fill="#0a0f14" opacity="0.92">
        <rect x="0" y="330" width="90" height="270" />
        <rect x="86" y="286" width="64" height="314" />
        <rect x="148" y="360" width="78" height="240" />
        <rect x="222" y="250" width="70" height="350" />
        <rect x="288" y="318" width="96" height="282" />
        <rect x="380" y="210" width="58" height="390" />
        <rect x="434" y="300" width="84" height="300" />
        <rect x="514" y="262" width="66" height="338" />
        <rect x="576" y="342" width="92" height="258" />
        <rect x="664" y="292" width="60" height="308" />
        <rect x="720" y="360" width="80" height="240" />
      </g>
      <g fill="rgba(227,164,92,0.55)">
        {[
          [18, 360],
          [40, 360],
          [104, 312],
          [126, 312],
          [166, 388],
          [190, 388],
          [240, 280],
          [262, 280],
          [306, 344],
          [330, 344],
          [354, 344],
          [396, 240],
          [418, 240],
          [452, 326],
          [476, 326],
          [500, 326],
          [532, 290],
          [554, 290],
          [594, 370],
          [618, 370],
          [642, 370],
          [680, 320],
          [702, 320],
          [738, 388],
          [762, 388],
        ].map(([x, y], i) => (
          <rect key={i} x={x} y={y} width="7" height="9" opacity={i % 3 === 0 ? 0.35 : 0.75} />
        ))}
      </g>
      <g fill="rgba(227,164,92,0.35)">
        <circle cx="150" cy="470" r="3" />
        <circle cx="430" cy="500" r="2.5" />
        <circle cx="700" cy="450" r="3.5" />
      </g>
    </svg>
  )
}

function LibraryView() {
  return (
    <svg className="window-view" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id="lib-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" style={{ stopColor: 'var(--sky)' }} />
          <stop offset="100%" style={{ stopColor: 'var(--sky2)' }} />
        </linearGradient>
      </defs>
      <rect width="800" height="600" fill="url(#lib-sky)" />
      <g fill="#2a1a10" opacity="0.85">
        <rect x="0" y="0" width="150" height="600" />
        <rect x="650" y="0" width="150" height="600" />
        {Array.from({ length: 7 }).map((_, i) => (
          <rect key={i} x="8" y={40 + i * 78} width="134" height="8" fill="#1a100a" />
        ))}
        {Array.from({ length: 7 }).map((_, i) => (
          <rect key={`r${i}`} x="658" y={40 + i * 78} width="134" height="8" fill="#1a100a" />
        ))}
      </g>
      <g opacity="0.55">
        {Array.from({ length: 18 }).map((_, i) => {
          const hue = ['#8a4a32', '#5c6b4f', '#8c7a4a', '#4c5b6b'][i % 4]
          return (
            <rect
              key={i}
              x={i < 9 ? 12 + (i % 3) * 42 : 662 + ((i - 9) % 3) * 42}
              y={50 + Math.floor((i % 9) / 3) * 78}
              width="10"
              height="52"
              fill={hue}
            />
          )
        })}
      </g>
      <path d="M250 600 L250 250 Q400 90 550 250 L550 600 Z" fill="rgba(244,232,210,0.08)" />
      <circle cx="400" cy="210" r="120" fill="rgba(240,194,122,0.12)" />
    </svg>
  )
}

function GardenView() {
  return (
    <svg className="window-view" viewBox="0 0 800 600" preserveAspectRatio="xMidYMax slice" aria-hidden>
      <defs>
        <linearGradient id="garden-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" style={{ stopColor: 'var(--sky)' }} />
          <stop offset="100%" style={{ stopColor: 'var(--sky2)' }} />
        </linearGradient>
      </defs>
      <rect width="800" height="600" fill="url(#garden-sky)" />
      <circle cx="560" cy="140" r="44" fill="rgba(255,246,224,0.6)" />
      <circle cx="560" cy="140" r="86" fill="rgba(255,246,224,0.12)" />
      <path d="M0 430 Q180 380 340 420 T800 400 L800 600 L0 600 Z" fill="#39463a" opacity="0.9" />
      <path d="M0 490 Q220 430 420 480 T800 460 L800 600 L0 600 Z" fill="#26312a" />
      <g fill="#1b241e">
        <path d="M120 470 L120 350 L136 350 L136 470 Z" />
        <circle cx="128" cy="330" r="58" />
        <circle cx="88" cy="356" r="38" />
        <circle cx="170" cy="352" r="42" />
        <path d="M690 480 L690 380 L706 380 L706 480 Z" />
        <circle cx="698" cy="360" r="64" />
        <circle cx="650" cy="392" r="40" />
      </g>
      <g fill="rgba(255,255,255,0.22)">
        <circle cx="300" cy="230" r="2" />
        <circle cx="340" cy="260" r="1.6" />
        <circle cx="380" cy="210" r="1.8" />
        <circle cx="430" cy="250" r="1.4" />
      </g>
    </svg>
  )
}

