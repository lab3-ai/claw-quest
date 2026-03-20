import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

function Segment({
  value,
  label,
  urgent,
}: {
  value: number;
  label: string;
  urgent: boolean;
}) {
  return (
    <div className="flex flex-col items-center">
      <span
        className={cn(
          "text-2xl font-semibold font-mono tabular-nums leading-tight",
          urgent ? "text-error" : "text-fg-1",
        )}
      >
        {String(value).padStart(2, "0")}
      </span>
      <span className="font-mono text-2xs tracking-wide text-fg-3">
        {label}
      </span>
    </div>
  );
}

function Separator({ urgent }: { urgent: boolean }) {
  return (
    <span
      className={cn(
        "text-lg font-light px-3 pt-0.5",
        urgent ? "text-error" : "text-fg-3",
      )}
    >
      :
    </span>
  );
}

interface CountdownTimerProps {
  expiresAt: string;
  label?: string;
  color?: string;
}

export function CountdownTimer({
  expiresAt,
  label = "Time Remaining",
}: CountdownTimerProps) {
  const [time, setTime] = useState({ d: 0, h: 0, m: 0, s: 0, ended: false });

  useEffect(() => {
    function tick() {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setTime({ d: 0, h: 0, m: 0, s: 0, ended: true });
        return;
      }
      const s = Math.floor(diff / 1000);
      const m = Math.floor(s / 60);
      const h = Math.floor(m / 60);
      const d = Math.floor(h / 24);
      setTime({ d, h: h % 24, m: m % 60, s: s % 60, ended: false });
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  if (time.ended) return null;

  const urgent = time.d === 0 && time.h < 6;

  return (
    <div className="flex flex-col items-center gap-3 py-4 px-4">
      <p className="text-2xs uppercase tracking-widest text-fg-3">{label}</p>
      <div className="flex items-start">
        <Segment value={time.d} label="Days" urgent={urgent} />
        <Separator urgent={urgent} />
        <Segment value={time.h} label="Hours" urgent={urgent} />
        <Separator urgent={urgent} />
        <Segment value={time.m} label="Mins" urgent={urgent} />
        <Separator urgent={urgent} />
        <Segment value={time.s} label="Secs" urgent={urgent} />
      </div>
    </div>
  );
}
