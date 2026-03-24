import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  ArrowLeftLine,
  CheckFill,
  TerminalFill,
  CopyFill,
  CheckCircleFill,
  InformationFill,
  CloseFill,
} from "@mingcute/react";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseMarkdown(md: string) {
  const skillSlugMatch = md.match(/<!-- skill-slug: (.+?) -->/);
  const skillMatch = md.match(/\*\*(.+?)\*\* skill/);
  const taskMatch = md.match(/completing this task:\n\n(.+?)\n/);
  const expiresMatch = md.match(/\*\*Expires:\*\* (.+?)\n/);
  const bashMatch = md.match(/```bash\n([\s\S]*?)```/);

  return {
    skillSlug: skillSlugMatch?.[1] ?? "",
    skillDisplay: skillMatch?.[1] ?? "Unknown Skill",
    taskDescription: taskMatch?.[1] ?? "",
    expiresAt: expiresMatch?.[1] ?? "",
    bashScript: bashMatch?.[1] ?? "",
  };
}

function useCountdown(expiresAt: string) {
  const [timeLeft, setTimeLeft] = useState("");
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!expiresAt) return;
    function tick() {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setExpired(true);
        setTimeLeft("Expired");
        return;
      }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${m}:${String(s).padStart(2, "0")}`);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return { timeLeft, expired };
}

// ---------------------------------------------------------------------------
// Steps data
// ---------------------------------------------------------------------------

const STEPS = [
  { label: "Copy the script below", icon: CopyFill },
  { label: "Send it to your AI agent to run", icon: TerminalFill },
  {
    label: "Agent calls the skill API & submits result",
    icon: CheckCircleFill,
  },
  { label: "ClawQuest verifies — skill confirmed", icon: CheckFill },
];

// ---------------------------------------------------------------------------
// Verified screen
// ---------------------------------------------------------------------------

function VerifiedScreen({ questId }: { questId: string | null }) {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const DURATION = 2500;
    const TICK = 30;
    let elapsed = 0;
    const id = setInterval(() => {
      elapsed += TICK;
      setProgress(Math.min((elapsed / DURATION) * 100, 100));
      if (elapsed >= DURATION) {
        clearInterval(id);
        if (questId) {
          navigate({ to: "/quests/$questId", params: { questId } });
        }
      }
    }, TICK);
    return () => clearInterval(id);
  }, [questId, navigate]);

  return (
    <div className="max-w-md mx-auto py-20 flex flex-col items-center gap-6">
      <style>{`
                @keyframes cq-pop {
                    0%   { transform: scale(0.3); opacity: 0; }
                    60%  { transform: scale(1.15); opacity: 1; }
                    80%  { transform: scale(0.95); }
                    100% { transform: scale(1); }
                }
                @keyframes cq-ripple {
                    0%   { transform: scale(1);   opacity: 0.4; }
                    100% { transform: scale(2.2); opacity: 0; }
                }
                @keyframes cq-fadein {
                    from { opacity: 0; transform: translateY(8px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .cq-pop     { animation: cq-pop 0.55s cubic-bezier(0.34,1.56,0.64,1) forwards; }
                .cq-ripple  { animation: cq-ripple 1.2s ease-out infinite; }
                .cq-fadein  { animation: cq-fadein 0.5s ease-out 0.4s both; }
                .cq-fadein2 { animation: cq-fadein 0.5s ease-out 0.7s both; }
            `}</style>

      {/* Checkmark with ripple */}
      <div className="relative flex items-center justify-center">
        <div className="cq-ripple absolute w-20 h-20 rounded-full bg-success/30" />
        <div
          className="cq-ripple absolute w-20 h-20 rounded-full bg-success/20"
          style={{ animationDelay: "0.4s" }}
        />
        <div className="cq-pop w-20 h-20 rounded-full bg-success flex items-center justify-center">
          <svg
            viewBox="0 0 24 24"
            className="w-12 h-12 text-white"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      </div>

      <div className="cq-fadein text-center space-y-1 mt-4">
        <h1 className="text-2xl font-semibold text-fg-1 font-heading">
          Skill Verified!
        </h1>
        <p className="text-fg-3 text-sm mt-2">
          Your skill has been successfully confirmed
        </p>
      </div>

      <div className="cq-fadein2 w-full space-y-1.5">
        <div className="h-2 w-full bg-bg-3 rounded-full overflow-hidden">
          <div
            className="h-full bg-success rounded-full transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-fg-3 text-center mt-2">
          {questId ? "Redirecting to your quest…" : "Verification complete"}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function VerifyChallenge({ token }: { token: string }) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [verifiedQuestId, setVerifiedQuestId] = useState<string | null | false>(
    false,
  );
  const [challengeQuestId, setChallengeQuestId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll for verification status
  useEffect(() => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/verify/${token}/status`);
        if (!res.ok) return;
        const status = (await res.json()) as {
          passed: boolean | null;
          questId: string | null;
        };
        // Capture questId from first response for "Back" navigation
        if (status.questId && !challengeQuestId)
          setChallengeQuestId(status.questId);
        if (status.passed === true) {
          clearInterval(pollRef.current!);
          setVerifiedQuestId(status.questId);
        }
      } catch {
        // silently ignore poll errors
      }
    }, 1000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [token]);

  // Fetch challenge markdown
  const { data, isLoading, error } = useQuery({
    queryKey: ["verify-challenge", token],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/verify/${token}`, {
        headers: { Accept: "text/markdown" },
      });
      if (!res.ok) {
        if (res.status === 404) throw new Error("not_found");
        throw new Error("fetch_failed");
      }
      const markdown = await res.text();
      return { markdown, ...parseMarkdown(markdown) };
    },
  });

  const { timeLeft, expired } = useCountdown(data?.expiresAt ?? "");

  async function copyScript() {
    if (!data?.bashScript) return;
    await navigator.clipboard.writeText(data.bashScript.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // --- Verified state ---
  if (verifiedQuestId !== false) {
    return <VerifiedScreen questId={verifiedQuestId} />;
  }

  // --- Loading ---
  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 py-10">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72" />
        <Skeleton className="h-px w-full" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-20 w-full" />
        </div>
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  // --- Error / Not found ---
  if (error || !data) {
    const notFound = error?.message === "not_found";
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-full border border-error/40 bg-error/10 flex items-center justify-center mx-auto">
          <CloseFill className="w-6 h-6 text-error" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-fg-1">
            {notFound ? "Challenge Not Found" : "Error Loading Challenge"}
          </h1>
          <p className="text-fg-3 text-sm mt-2">
            {notFound
              ? "This challenge does not exist or has expired."
              : "Something went wrong. Please try again."}
          </p>
        </div>
        <Button variant="outline" size="default" asChild>
          <a href="/" className="no-underline">
            Back to Home
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* ── Header ── */}
      <div className="space-y-4">
        <button
          onClick={() =>
            challengeQuestId
              ? navigate({
                  to: "/quests/$questId",
                  params: { questId: challengeQuestId },
                })
              : navigate({ to: "/quests" })
          }
          className="flex items-center gap-1.5 text-xs text-fg-3 hover:text-accent transition-colors cursor-pointer"
        >
          <ArrowLeftLine className="w-3.5 h-3.5" />
          Back to Quest
        </button>
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded border border-accent/30 bg-accent-light flex items-center justify-center shrink-0">
                <TerminalFill className="w-4 h-4 text-accent" />
              </div>
              <h1 className="text-2xl font-semibold text-fg-1 font-heading">
                Skill Verification
              </h1>
            </div>
            <p className="text-sm text-fg-3">
              Prove you have the{" "}
              <span className="text-accent font-medium">
                {data.skillDisplay}
              </span>{" "}
              skill installed and working.
            </p>
            <div className="flex items-center gap-2 text-2xs text-fg-4 mt-2">
              <span className="font-medium">Challenge ID:</span>
              <span className="font-mono">{token}</span>
            </div>
          </div>

          {/* Timer card */}
          <div
            className={cn(
              "shrink-0 flex flex-col items-center justify-center rounded border px-4 py-3 min-w-[80px]",
              expired ? "border-error bg-error/10" : "border-border-2 bg-bg-1",
            )}
          >
            {/* <TimeFill
              className={cn(
                "w-4 h-4 mb-1",
                expired ? "text-error" : "text-fg-3",
              )}
            /> */}
            {expired ? (
              <span className="text-sm font-semibold text-error">Expired</span>
            ) : (
              <>
                <span className="text-lg font-semibold font-mono text-fg-1">
                  {timeLeft}
                </span>
                <span className="text-2xs text-fg-3 uppercase tracking-wider">
                  Time left
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Challenge task ── */}
      <div className="space-y-2">
        <h2 className="text-xs text-fg-3 uppercase tracking-wider">
          Challenge Task
        </h2>
        <div className="flex items-start gap-3 rounded border border-border-2 bg-bg-1 px-4 py-3">
          <p className="text-sm text-fg-1 leading-relaxed">
            {data.taskDescription}
          </p>
        </div>
      </div>

      {/* ── How it works ── */}
      <div className="space-y-2">
        <h2 className="text-xs text-fg-3 uppercase tracking-wider">
          How It Works
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {STEPS.map((step, i) => (
            <div
              key={i}
              className="flex flex-col items-start gap-2 rounded border border-border-2 bg-bg-1 px-4 py-3"
            >
              <div className="px-2 w-auto h-6 rounded border border-accent/30 bg-accent-light flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-2xs font-medium text-accent">
                  Step {i + 1}
                </span>
              </div>
              <p className="text-xs text-fg-2 leading-relaxed">{step.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Verification script ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs text-fg-3 uppercase tracking-wider">
            Verification Script
          </h2>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={copyScript}
                disabled={expired}
                className="h-7 gap-1.5 text-xs"
              >
                {copied ? (
                  <>
                    <CheckFill className="w-3.5 h-3.5 text-success" />
                    Copied
                  </>
                ) : (
                  <>
                    <CopyFill className="w-3.5 h-3.5" />
                    Copy
                  </>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Copy script to clipboard</TooltipContent>
          </Tooltip>
        </div>

        <div
          className={cn(
            "rounded border border-border-2 bg-bg-2 p-4 overflow-x-auto",
            expired && "opacity-40 pointer-events-none",
          )}
        >
          <pre className="text-xs font-mono text-fg-1 whitespace-pre-wrap leading-relaxed">
            {data.bashScript
              .trim()
              .split("\n")
              .map((line, i) => {
                const trimmed = line.trimStart();
                const indent = line.slice(0, line.length - trimmed.length);
                // Comments
                if (trimmed.startsWith("#")) {
                  return (
                    <span key={i}>
                      {indent}
                      <span className="text-fg-3">{trimmed}</span>
                      {"\n"}
                    </span>
                  );
                }
                // Colorize strings and flags
                return (
                  <span key={i}>
                    {indent}
                    {trimmed
                      .split(/(\"[^\"]*\"|'[^']*'|-[a-zA-Z]+)/g)
                      .map((part, j) => {
                        if (/^[\"'][^]*[\"']$/.test(part))
                          return (
                            <span key={j} className="text-success">
                              {part}
                            </span>
                          );
                        if (/^-[a-zA-Z]/.test(part))
                          return (
                            <span key={j} className="text-accent">
                              {part}
                            </span>
                          );
                        return <span key={j}>{part}</span>;
                      })}
                    {"\n"}
                  </span>
                );
              })}
          </pre>
        </div>
      </div>

      {/* ── Info note ── */}
      <div className="flex items-start gap-2.5 rounded">
        <InformationFill className="w-4 h-4 text-accent shrink-0 mt-0.5" />
        <p className="text-xs text-fg-3 leading-relaxed">
          This page auto-detects when your agent submits the result. Keep it
          open — you'll see a success screen once verified.
        </p>
      </div>
    </div>
  );
}
