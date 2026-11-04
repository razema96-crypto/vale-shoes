import { Logo } from "./Logo";

/**
 * The VALE yellow shopping bag, drawn in SVG — inspired by the brand's own bag photo.
 * Real logo on the front, rope handles, folded top edge and the "VALE Shoes" pill at the bottom.
 */
export function BrandBag({ className = "" }: { className?: string }) {
  return (
    <div className={`relative aspect-[400/520] ${className}`} aria-hidden="true">
      <svg viewBox="0 0 400 520" className="absolute inset-0 size-full overflow-visible">
        <defs>
          <linearGradient id="bag-face" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f7dc3a" />
            <stop offset="0.55" stopColor="#f2d22e" />
            <stop offset="1" stopColor="#e6c11f" />
          </linearGradient>
          <linearGradient id="bag-side" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#d9b315" />
            <stop offset="1" stopColor="#c9a40d" />
          </linearGradient>
          <filter id="paper" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="n" />
            <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.06 0" result="g" />
            <feComposite in="g" in2="SourceGraphic" operator="in" result="t" />
            <feMerge>
              <feMergeNode in="SourceGraphic" />
              <feMergeNode in="t" />
            </feMerge>
          </filter>
        </defs>
        {/* soft floor shadow */}
        <ellipse cx="200" cy="508" rx="190" ry="14" fill="#000" opacity="0.12" />
        {/* back handle */}
        <path d="M150 112 C150 30, 250 30, 250 112" fill="none" stroke="#c9a40d" strokeWidth="9" strokeLinecap="round" />
        {/* side gusset */}
        <path d="M356 96 L392 120 L384 500 L350 500 Z" fill="url(#bag-side)" />
        {/* front face */}
        <path d="M24 96 L356 96 L350 500 L30 500 Z" fill="url(#bag-face)" filter="url(#paper)" />
        {/* folded top band */}
        <path d="M24 96 L356 96 L355.4 132 L24.6 132 Z" fill="#000" opacity="0.07" />
        <path d="M24.6 132 L355.4 132" stroke="#000" strokeOpacity="0.12" strokeWidth="1.5" />
        {/* crease lines */}
        <path d="M350 500 L335 470 M30 500 L46 470" stroke="#000" strokeOpacity="0.08" strokeWidth="2" />
        {/* front handle (twisted paper rope) */}
        <path d="M130 112 C126 18, 274 18, 270 112" fill="none" stroke="#e8c41f" strokeWidth="10" strokeLinecap="round" />
        <path d="M130 112 C126 18, 274 18, 270 112" fill="none" stroke="#b8950a" strokeWidth="10" strokeLinecap="round" strokeDasharray="2 7" opacity="0.5" />
        <circle cx="130" cy="112" r="6" fill="#b8950a" />
        <circle cx="270" cy="112" r="6" fill="#b8950a" />
        {/* bottom pill like the real bag */}
        <rect x="95" y="420" width="190" height="34" rx="17" fill="#141414" />
        <circle cx="117" cy="437" r="7" fill="#f2d22e" />
        <text x="195" y="443" textAnchor="middle" fontFamily="Tajawal, sans-serif" fontWeight="700" fontSize="17" fill="#f2d22e" direction="ltr">
          VALE Shoes
        </text>
      </svg>
      {/* the real logo */}
      <div className="absolute left-[12%] right-[17%] top-[33%] text-ink">
        <Logo className="w-full h-auto" />
      </div>
    </div>
  );
}
