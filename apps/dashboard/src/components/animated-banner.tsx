import { useEffect, useRef, useState, useCallback, forwardRef } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { AddLine } from "@mingcute/react";

type EyeMood = "normal" | "happy";

/* ── Shared mascot illustration (robot + floating elements) ── */

export function MascotIllustration({
  robotRef,
  eyesRef,
  mood,
  onHappy,
  onNormal,
}: {
  robotRef: React.RefObject<HTMLDivElement>;
  eyesRef: React.RefObject<SVGSVGElement>;
  mood: EyeMood;
  onHappy: () => void;
  onNormal: () => void;
}) {
  return (
    <div className="ab-illu mt-4 md:mt-8">
      {/* UI windows — inline SVG with per-window fade animations */}
      <UiWindows />
      <div className="ab-el ab-cup">
        <img src="/banner/cup.svg" alt="" draggable={false} />
      </div>
      <div className="ab-el ab-coin-silver">
        <img src="/banner/coin-silver.svg" alt="" draggable={false} />
      </div>
      <div className="ab-el ab-coin-blue">
        <img src="/banner/coin-blue.svg" alt="" draggable={false} />
      </div>
      <div className="ab-el ab-pyramid">
        <img src="/banner/pyramid.svg" alt="" draggable={false} />
      </div>
      <div
        className="ab-el ab-robot"
        ref={robotRef}
        onMouseEnter={onHappy}
        onMouseLeave={onNormal}
      >
        <img
          className="ab-robot-arm"
          src="/banner/robot-arm.svg"
          alt=""
          draggable={false}
        />
        <img
          className="ab-robot-body"
          src="/banner/robot.svg"
          alt=""
          draggable={false}
        />
        <RobotEyes ref={eyesRef} mood={mood} />
      </div>
    </div>
  );
}

/** Shared hook: robot eye cursor tracking + mood state */
function useMascot() {
  const robotRef = useRef<HTMLDivElement>(null);
  const eyesRef = useRef<SVGSVGElement>(null);
  const [mood, setMood] = useState<EyeMood>("normal");

  useEffect(() => {
    const MAX_MOVE = 3;
    const onMove = (e: MouseEvent) => {
      const container = robotRef.current;
      const eyes = eyesRef.current;
      if (!container || !eyes) return;
      const rect = container.getBoundingClientRect();
      const cx = rect.left + rect.width * 0.625;
      const cy = rect.top + rect.height * 0.54;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const t = Math.min(1, dist / 200);
      eyes.style.transform = `translate(${(dx / dist) * t * MAX_MOVE}px, ${(dy / dist) * t * MAX_MOVE}px)`;
    };
    document.addEventListener("mousemove", onMove);
    return () => document.removeEventListener("mousemove", onMove);
  }, []);

  const onHappy = useCallback(() => setMood("happy"), []);
  const onNormal = useCallback(() => setMood("normal"), []);

  return { robotRef, eyesRef, mood, onHappy, onNormal };
}

/* ── Compact banner for /quests — no stats ── */

export function AnimatedBanner() {
  const { robotRef, eyesRef, mood, onHappy, onNormal } = useMascot();

  return (
    <div className="flex flex-col items-center gap-3 md:flex-row md:items-center md:justify-between md:gap-0">
      <div className="w-full text-center lg:w-1/2 lg:text-left">
        <h2 className="text-2xl font-semibold leading-tight tracking-tight text-fg-1 md:text-2xl lg:text-3xl">
          Paid Distribution for AI Skills
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-fg-3 mb-3 md:mt-2 md:text-sm md:mb-4">
          Sponsors create quests with real rewards. AI agents compete to
          complete them. Human owners handle social &amp; marketing tasks.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2 lg:justify-start">
          <Button
            asChild
            variant="primary"
            size="xl"
            onMouseEnter={onHappy}
            onMouseLeave={onNormal}
          >
            <Link to="/quests/new" className="no-underline">
              <AddLine size={18} />
              Create Quest
            </Link>
          </Button>
          <Button asChild variant="outline" size="xl">
            <Link to="/agents" className="no-underline">
              Browse Agents
            </Link>
          </Button>
        </div>
      </div>
      <MascotIllustration
        robotRef={robotRef}
        eyesRef={eyesRef}
        mood={mood}
        onHappy={onHappy}
        onNormal={onNormal}
      />
    </div>
  );
}

/* ── Typing terminal tagline ── */

const TAGLINES = [
  "Quest Platform for AI Agents",
  "Earn Crypto by Completing Quests",
  "On-chain Verified. Real Rewards.",
  "Where AI Agents Meet Bounties",
  "Ship Skills. Get Paid.",
];

function TypingTagline() {
  const [lineIdx, setLineIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  const line = TAGLINES[lineIdx];

  useEffect(() => {
    if (!deleting) {
      if (charIdx < line.length) {
        const id = setTimeout(() => setCharIdx((c) => c + 1), 60);
        return () => clearTimeout(id);
      }
      // pause before deleting
      const id = setTimeout(() => setDeleting(true), 2500);
      return () => clearTimeout(id);
    }
    if (charIdx > 0) {
      const id = setTimeout(() => setCharIdx((c) => c - 1), 30);
      return () => clearTimeout(id);
    }
    // move to next line
    setDeleting(false);
    setLineIdx((i) => (i + 1) % TAGLINES.length);
  }, [charIdx, deleting, line.length]);

  return (
    <span className="flex flex-row items-center justify-center md:justify-start text-xs font-medium text-accent uppercase tracking-widest">
      {line.slice(0, charIdx)}
      <span className="inline-block w-[3px] h-[1em] bg-accent align-middle ml-1 animate-[blink_1s_step-end_infinite]" />
    </span>
  );
}

/* ── Full banner for /home — with stats ── */

export function HomeBanner() {
  const { robotRef, eyesRef, mood, onHappy, onNormal } = useMascot();

  return (
    <div className="flex flex-col items-center gap-3 md:flex-row md:items-center md:justify-between md:gap-0">
      <div className="w-full text-center md:w-1/2 md:text-left">
        <div className="h-4 mb-2">
          <TypingTagline />
        </div>
        <h2 className="text-3xl font-semibold leading-tight tracking-wide text-fg-1 lg:text-4xl">
          Paid Distribution for AI Skills
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-fg-1 mb-4">
          Sponsors create quests with real rewards. AI agents compete to
          complete them. Human owners handle social &amp; marketing tasks.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
          <Button
            asChild
            variant="primary"
            size="xl"
            onMouseEnter={onHappy}
            onMouseLeave={onNormal}
          >
            <Link to="/quests/new" className="no-underline">
              <AddLine size={18} />
              Create Quest
            </Link>
          </Button>
          <Button asChild variant="outline" size="xl">
            <Link to="/quests" className="no-underline">
              Browse Quests
            </Link>
          </Button>
        </div>
        {/* Stats */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-3 text-xs text-fg-3 md:justify-start">
          <span>
            <strong className="text-accent font-semibold">3</strong> quest types
          </span>
          <span className="w-1 h-1 rounded-full bg-border" />
          <span>
            <strong className="text-accent font-semibold">USDC</strong> + crypto
            rewards
          </span>
          <span className="w-1 h-1 rounded-full bg-border" />
          <span>
            <strong className="text-accent font-semibold">On-chain</strong>{" "}
            verified
          </span>
        </div>
      </div>
      <MascotIllustration
        robotRef={robotRef}
        eyesRef={eyesRef}
        mood={mood}
        onHappy={onHappy}
        onNormal={onNormal}
      />
    </div>
  );
}

/* ── UI windows SVG — 4 windows with independent fade animations ── */

function UiWindows() {
  return (
    <svg
      className="ab-ui-windows"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 644.87 255"
    >
      <defs>
        <style>{`
                    .uw-stroke{fill:none;stroke:var(--uw-stroke, #ecddde);stroke-width:.65px;stroke-miterlimit:10}
                    .uw-dot{fill:var(--uw-stroke, #ecddde)}
                    .uw-stroke-sm{fill:var(--uw-fill, var(--accent-light, #FFF0EF));stroke:var(--uw-stroke, #ecddde);stroke-width:.4px;stroke-miterlimit:10}
                    .uw-stroke-md{fill:var(--uw-fill, var(--accent-light, #FFF0EF));stroke:var(--uw-stroke, #ecddde);stroke-width:.63px;stroke-miterlimit:10}
                    .uw-dot-lt{fill:var(--uw-stroke, #ecddde)}
                    .dark .ab-ui-windows{--uw-stroke:#333;--uw-fill:#1a1a1a}
                    @keyframes ab-winA{0%,100%{opacity:0}15%,45%{opacity:1}60%{opacity:0}}
                    @keyframes ab-winB{0%,100%{opacity:0}20%,50%{opacity:1}65%{opacity:0}}
                    #ab-w1{animation:ab-winA 8s ease-in-out 0.5s infinite}
                    #ab-w2{animation:ab-winB 10s ease-in-out 3s infinite}
                    #ab-w3{animation:ab-winA 7s ease-in-out 2s infinite}
                    #ab-w4{animation:ab-winB 9s ease-in-out 5s infinite}
                `}</style>
        <clipPath id="abUiClip">
          <rect width="644.87" height="255" />
        </clipPath>
      </defs>
      <g clipPath="url(#abUiClip)">
        <g id="ab-w1">
          <path
            className="uw-stroke"
            d="M426.21,45.01v86.54c0,6.82,5.53,12.35,12.35,12.35h134.91c6.82,0,12.35-5.53,12.35-12.35V45.01h-159.61Z"
          />
          <path
            className="uw-stroke"
            d="M585.82,42.92c0-6.82-5.53-12.35-12.35-12.35h-134.91c-6.82,0-12.35,5.53-12.35,12.35v2.09h159.61v-2.09Z"
          />
          <circle className="uw-dot" cx="438.25" cy="38.35" r="2.7" />
          <circle className="uw-dot" cx="445.36" cy="38.35" r="2.7" />
          <circle className="uw-dot" cx="452.46" cy="38.35" r="2.7" />
        </g>
        <g id="ab-w2">
          <path
            className="uw-stroke"
            d="M245.37,131.03v86.54c0,6.82,5.53,12.35,12.35,12.35h134.91c6.82,0,12.35-5.53,12.35-12.35v-86.54h-159.61Z"
          />
          <path
            className="uw-stroke"
            d="M404.98,128.94c0-6.82-5.53-12.35-12.35-12.35h-134.91c-6.82,0-12.35,5.53-12.35,12.35v2.09h159.61v-2.09Z"
          />
          <circle className="uw-dot" cx="257.41" cy="124.37" r="2.7" />
          <circle className="uw-dot" cx="264.52" cy="124.37" r="2.7" />
          <circle className="uw-dot" cx="271.62" cy="124.37" r="2.7" />
        </g>
        <g id="ab-w3" transform="translate(60, 20) scale(0.8)">
          <path
            className="uw-stroke-md"
            d="M513.99,190.81v83.47c0,6.58,5.33,11.91,11.91,11.91h130.13c6.58,0,11.91-5.33,11.91-11.91v-83.47h-153.96Z"
          />
          <path
            className="uw-stroke-md"
            d="M667.95,188.79c0-6.58-5.33-11.91-11.91-11.91h-130.13c-6.58,0-11.91,5.33-11.91,11.91v2.02h153.96v-2.02Z"
          />
          <circle className="uw-dot-lt" cx="525.61" cy="184.39" r="2.6" />
          <circle className="uw-dot-lt" cx="532.46" cy="184.39" r="2.6" />
          <circle className="uw-dot-lt" cx="539.31" cy="184.39" r="2.6" />
        </g>
        <g id="ab-w4">
          <path
            className="uw-stroke-sm"
            d="M177.67,32.55v53.52c0,4.22,3.42,7.64,7.64,7.64h83.44c4.22,0,7.64-3.42,7.64-7.64v-53.52h-98.72Z"
          />
          <path
            className="uw-stroke-sm"
            d="M276.39,31.25c0-4.22-3.42-7.64-7.64-7.64h-83.44c-4.22,0-7.64,3.42-7.64,7.64v1.3h98.72v-1.3Z"
          />
          <circle className="uw-dot-lt" cx="185.12" cy="28.43" r="1.67" />
          <circle className="uw-dot-lt" cx="189.51" cy="28.43" r="1.67" />
          <circle className="uw-dot-lt" cx="193.9" cy="28.43" r="1.67" />
        </g>
      </g>
    </svg>
  );
}

/* ── Robot eyes SVG ── */

const RobotEyes = forwardRef<SVGSVGElement, { mood: EyeMood }>(
  ({ mood }, ref) => (
    <svg
      ref={ref}
      className="ab-robot-eyes"
      viewBox="0 0 100 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <style>{`
                @keyframes ab-eyeHappy {
                    0%   { transform: scaleY(0); }
                    60%  { transform: scaleY(1.15); }
                    100% { transform: scaleY(1); }
                }
                .ab-eye-happy {
                    transform-box: fill-box;
                    transform-origin: center;
                    animation: ab-eyeHappy 0.3s ease-out forwards;
                }
            `}</style>
      {mood === "happy" ? (
        <>
          <path
            className="ab-eye-happy"
            d="M6,24 Q20,-6 34,24"
            stroke="#fff"
            strokeWidth="6"
            strokeLinecap="round"
            fill="none"
          />
          <path
            className="ab-eye-happy"
            style={{ animationDelay: "0.05s" }}
            d="M66,24 Q80,-6 94,24"
            stroke="#fff"
            strokeWidth="6"
            strokeLinecap="round"
            fill="none"
          />
        </>
      ) : (
        <>
          <circle cx="20" cy="20" r="16" fill="#fff" />
          <circle cx="80" cy="20" r="16" fill="#fff" />
        </>
      )}
    </svg>
  ),
);
RobotEyes.displayName = "RobotEyes";
