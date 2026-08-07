"use client";

// Habillage "scanner" par-dessus la vidéo : coins verts, maillage façon
// reconnaissance faciale, et rayon vert qui défile de haut en bas.
export function ScanOverlay({ active = true }: { active?: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0">
      {/* Coins de visée */}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 300 400" preserveAspectRatio="none">
        {corner(20, 20, 1, 1)}
        {corner(280, 20, -1, 1)}
        {corner(20, 380, 1, -1)}
        {corner(280, 380, -1, -1)}
      </svg>

      {/* Maillage décoratif type "face mesh" */}
      <svg
        className="scan-mesh absolute left-1/2 top-1/2 h-[62%] w-[54%] -translate-x-1/2 -translate-y-1/2"
        viewBox="0 0 100 130"
        fill="none"
        stroke="#22c55e"
        strokeWidth="0.5"
      >
        <polyline points="50,8 30,30 22,60 34,92 50,112 66,92 78,60 70,30 50,8" opacity="0.5" />
        <path d="M50 8 L34 40 L22 60 M50 8 L66 40 L78 60 M34 40 L50 52 L66 40 M22 60 L38 66 L50 60 L62 66 L78 60 M38 66 L34 92 M62 66 L66 92 M50 52 L50 80 L34 92 M50 80 L66 92 M34 92 L50 112 L66 92" opacity="0.55" />
        {[
          [50, 8], [30, 30], [70, 30], [22, 60], [78, 60], [38, 66], [62, 66],
          [50, 52], [50, 80], [34, 92], [66, 92], [50, 112], [40, 44], [60, 44],
        ].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="1.6" fill="#22c55e" stroke="none" />
        ))}
      </svg>

      {/* Rayon de scan */}
      {active && <div className="scan-line" />}
    </div>
  );
}

function corner(x: number, y: number, dx: number, dy: number) {
  const len = 34;
  return (
    <path
      d={`M ${x} ${y + dy * len} L ${x} ${y} L ${x + dx * len} ${y}`}
      stroke="#22c55e"
      strokeWidth="4"
      strokeLinecap="round"
      fill="none"
    />
  );
}
