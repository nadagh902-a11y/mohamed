import { motion } from 'motion/react';
import { useState } from 'react';
import { BeadMaterial } from '../types/tasbih';

interface BeadRingProps {
  count: number;
  target: number; // 0 means infinite
  totalTapIndex: number; // monotonically increasing tap counter for smooth bead travel
  material: BeadMaterial;
  darkMode: boolean;
  justCompletedCycle: boolean;
  onIncrement: () => void;
}

const PHYSICAL_BEADS = 33;

export function BeadRing({
  count,
  target,
  totalTapIndex,
  material,
  darkMode,
  justCompletedCycle,
  onIncrement,
}: BeadRingProps) {
  const [rippleKey, setRippleKey] = useState(0);

  const handleTap = () => {
    setRippleKey((prev) => prev + 1);
    onIncrement();
  };

  // Ring geometry
  const size = 340;
  const center = size / 2;
  const ringRadius = 144;
  const progressRadius = 114;
  const progressCircumference = 2 * Math.PI * progressRadius;

  // Calculate progress ratio for inner ring
  const progressRatio =
    target > 0 ? Math.min(1, count / target) : ((count % 33) / 33);
  const strokeDashoffset = progressCircumference * (1 - progressRatio);

  // Bead fill/stroke palette based on theme
  const beadFill = darkMode ? material.darkBeadFill : material.beadFill;
  const beadHighlight = darkMode ? material.darkBeadHighlight : material.beadHighlight;
  const beadStroke = darkMode ? material.darkBeadStroke : material.beadStroke;
  const dividerFill = darkMode ? material.darkDividerFill : material.dividerFill;
  const cordColor = darkMode ? material.darkCordColor : material.cordColor;

  // Determine how many beads appear "counted" around the 33-bead loop
  const activeBeadPos = target === 1 ? (count >= 1 ? 33 : 0) : count % PHYSICAL_BEADS === 0 && count > 0 ? PHYSICAL_BEADS : count % PHYSICAL_BEADS;

  return (
    <div className="relative flex flex-col items-center justify-center select-none">
      <div className="relative flex h-[268px] w-[268px] items-center justify-center sm:h-[360px] sm:w-[360px]">
        {/* SVG Tasbih Ring & Beads */}
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
          aria-hidden="true"
        >
          <defs>
            <radialGradient id={`bead-grad-${material.id}-${darkMode ? 'd' : 'l'}`} cx="35%" cy="30%" r="65%">
              <stop offset="0%" stopColor={beadHighlight} />
              <stop offset="65%" stopColor={beadFill} />
              <stop offset="100%" stopColor={beadStroke} />
            </radialGradient>
            <radialGradient id={`divider-grad-${material.id}-${darkMode ? 'd' : 'l'}`} cx="35%" cy="30%" r="65%">
              <stop offset="0%" stopColor="#F0D79A" />
              <stop offset="65%" stopColor={dividerFill} />
              <stop offset="100%" stopColor="#7A5A21" />
            </radialGradient>
          </defs>

          {/* Subtle braided outer cord */}
          <circle
            cx={center}
            cy={center}
            r={ringRadius}
            fill="none"
            stroke={cordColor}
            strokeWidth={2.5}
            strokeDasharray="3 2"
          />

          {/* Inner progress track */}
          <circle
            cx={center}
            cy={center}
            r={progressRadius}
            fill="none"
            stroke={darkMode ? 'rgba(235, 240, 237, 0.08)' : 'rgba(19, 42, 35, 0.08)'}
            strokeWidth={3}
          />

          {/* Inner active progress arc */}
          <motion.circle
            cx={center}
            cy={center}
            r={progressRadius}
            fill="none"
            stroke={justCompletedCycle ? dividerFill : beadFill}
            strokeWidth={3.5}
            strokeLinecap="round"
            strokeDasharray={progressCircumference}
            initial={false}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            transform={`rotate(-90 ${center} ${center})`}
          />

          {/* Imame (top finial bead at 12 o'clock) with subtle woven tassel */}
          <g transform={`translate(${center}, ${center - ringRadius - 6})`}>
            <path
              d="M -3.5 -10 L 3.5 -10 L 5 5 C 5 8 -5 8 -5 5 Z"
              fill={`url(#divider-grad-${material.id}-${darkMode ? 'd' : 'l'})`}
              stroke={darkMode ? '#1A201E' : '#FFFFFF'}
              strokeWidth={1.2}
            />
            <circle cx={0} cy={-13} r={2.4} fill={dividerFill} />
            <line
              x1={-1.5}
              y1={-15.5}
              x2={-3}
              y2={-22}
              stroke={dividerFill}
              strokeWidth={1.2}
              strokeLinecap="round"
              opacity={0.75}
            />
            <line
              x1={0}
              y1={-15.5}
              x2={0}
              y2={-23}
              stroke={dividerFill}
              strokeWidth={1.3}
              strokeLinecap="round"
              opacity={0.9}
            />
            <line
              x1={1.5}
              y1={-15.5}
              x2={3}
              y2={-22}
              stroke={dividerFill}
              strokeWidth={1.2}
              strokeLinecap="round"
              opacity={0.75}
            />
          </g>

          {/* 33 Tactile Beads distributed along the cord (leaving a subtle gap around 12 o'clock for the Imame) */}
          {Array.from({ length: PHYSICAL_BEADS }).map((_, index) => {
            // Distribute beads from +12deg to +348deg clockwise starting after Imame
            const startAngleDeg = -78;
            const spanDeg = 336;
            const angleDeg = startAngleDeg + (index / (PHYSICAL_BEADS - 1)) * spanDeg;
            const angleRad = (angleDeg * Math.PI) / 180;

            // Slight dynamic displacement when bead is "passed"
            const isPassed = index < activeBeadPos;
            const isCurrent = index === activeBeadPos - 1;
            const isDivider = (index + 1) % 11 === 0 && index !== PHYSICAL_BEADS - 1;

            // Subtle shift along the ring when passed
            const effectiveRadius = isCurrent ? ringRadius + 2.5 : ringRadius;
            const bx = center + effectiveRadius * Math.cos(angleRad);
            const by = center + effectiveRadius * Math.sin(angleRad);

            const beadRadius = isDivider ? 8.2 : isCurrent ? 7.8 : 6.4;

            return (
              <motion.g
                key={index}
                initial={false}
                animate={{
                  scale: isCurrent ? 1.15 : 1,
                  opacity: isPassed ? 1 : 0.38,
                }}
                transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                style={{ transformOrigin: `${bx}px ${by}px` }}
              >
                <circle
                  cx={bx}
                  cy={by}
                  r={beadRadius}
                  fill={
                    isDivider
                      ? `url(#divider-grad-${material.id}-${darkMode ? 'd' : 'l'})`
                      : `url(#bead-grad-${material.id}-${darkMode ? 'd' : 'l'})`
                  }
                  stroke={darkMode ? '#0C1210' : '#F7F8F6'}
                  strokeWidth={1.4}
                />
              </motion.g>
            );
          })}
        </svg>

        {/* Central Tactile Tap Button */}
        <motion.button
          type="button"
          onClick={handleTap}
          whileTap={{ scale: 0.965 }}
          transition={{ duration: 0.1, ease: [0.16, 1, 0.3, 1] }}
          aria-label={`Compter un tasbih, compteur actuel : ${count}`}
          className="group relative z-10 flex h-[174px] w-[174px] shrink-0 touch-manipulation cursor-pointer flex-col items-center justify-center rounded-full bg-white shadow-[0_12px_36px_-12px_rgba(19,42,35,0.16)] ring-1 ring-[#132A23]/8 transition-shadow hover:shadow-[0_16px_42px_-12px_rgba(27,94,72,0.22)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1B5E48] active:shadow-inner dark:bg-[#131C19] dark:shadow-[0_14px_40px_-10px_rgba(0,0,0,0.65)] dark:ring-[#EBF0ED]/10 dark:hover:ring-[#34A87E]/30 dark:focus-visible:outline-[#34A87E] sm:h-[224px] sm:w-[224px]"
        >
          {/* Subtle ripple feedback on each tap */}
          {totalTapIndex > 0 && (
            <motion.span
              key={rippleKey}
              initial={{ scale: 0.72, opacity: 0.35 }}
              animate={{ scale: 1.08, opacity: 0 }}
              transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-full border-2 border-[#1B5E48]/40 dark:border-[#34A87E]/45"
            />
          )}

          {/* Cycle completion halo */}
          {justCompletedCycle && (
            <motion.span
              initial={{ scale: 0.9, opacity: 0.6 }}
              animate={{ scale: 1.15, opacity: 0 }}
              transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-full border-2 border-[#B5893A] dark:border-[#D4AF6A]"
            />
          )}

          <span className="font-mono text-4xl font-semibold tracking-tight text-[#132A23] tabular-nums dark:text-[#EBF0ED] sm:text-6xl">
            {count}
          </span>

          <span className="mt-1 text-xs font-medium text-[#132A23]/55 tabular-nums dark:text-[#EBF0ED]/55">
            {target > 0 ? `sur ${target}` : 'comptage libre'}
          </span>

          <span className="mt-2.5 text-[11px] font-medium tracking-wide text-[#1B5E48] opacity-80 transition-opacity group-hover:opacity-100 dark:text-[#34A87E] sm:mt-4">
            Touchez pour compter
          </span>
        </motion.button>
      </div>
    </div>
  );
}
