import { motion } from 'framer-motion';
import { useMemo } from 'react';

interface BubbleSpec {
  id: number;
  left: number; // %
  size: number; // px
  duration: number; // s
  delay: number; // s
  drift: number; // px, slight horizontal sway
}

function makeBubbles(count: number): BubbleSpec[] {
  return Array.from({ length: count }, (_, id) => ({
    id,
    left: Math.random() * 100,
    size: 4 + Math.random() * 10,
    duration: 5 + Math.random() * 6,
    delay: Math.random() * 6,
    drift: (Math.random() - 0.5) * 24,
  }));
}

/**
 * Purely decorative rising bubbles for the tank background. Low opacity,
 * randomized per mount — ambience only, never gameplay-relevant.
 */
export default function Bubbles() {
  const bubbles = useMemo(() => makeBubbles(16), []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {bubbles.map((bubble) => (
        <motion.span
          key={bubble.id}
          className="absolute rounded-full bg-white/25"
          style={{
            left: `${bubble.left}%`,
            width: bubble.size,
            height: bubble.size,
            bottom: -20,
          }}
          animate={{
            y: ['0%', '-620%'],
            x: [0, bubble.drift, 0],
            opacity: [0, 0.5, 0.5, 0],
          }}
          transition={{
            duration: bubble.duration,
            delay: bubble.delay,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      ))}
    </div>
  );
}
