import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  useParams,
  useSearch,
  Link,
  useNavigate,
} from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Quest } from "@clawquest/shared";
import { REWARD_TYPE, FUNDING_METHOD } from "@clawquest/shared";
import {
  Group2Line,
  GiftLine,
  User3Fill,
  AiFill,
  AlertLine,
  ArrowRightUpLine,
  Sandglass2Line,
  TimeLine,
  CheckLine,
  CloseCircleLine,
} from "@mingcute/react";
import { PlatformIcon } from "@/components/PlatformIcon";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { TokenIcon } from "@/components/token-icon";
import { CountdownTimer } from "@/components/countdown-timer";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { startTelegramLogin } from "@/lib/telegram-oidc";
import { getDiceBearUrl } from "@/components/avatarUtils";
import { SponsorLogo } from "@/components/sponsor-logo";
import { SeoHead } from "@/components/seo-head";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { QuestTypeBadge, QuestStatusBadge } from "@/components/quest-badges";
import { Button } from "@/components/ui/button";
import { Breadcrumb } from "@/components/breadcrumb";
import { cn } from "@/lib/utils";
import { QuestGridCard } from "@/components/QuestGridCard";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
const REDIRECT_KEY = "clawquest_redirect_after_login";

function useCountdown(expiresAt: string | null) {
  const [timeLeft, setTimeLeft] = useState({
    d: 0,
    h: 0,
    m: 0,
    s: 0,
    ended: false,
  });

  useEffect(() => {
    if (!expiresAt) return;
    function tick() {
      const diff = new Date(expiresAt!).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft({ d: 0, h: 0, m: 0, s: 0, ended: true });
        return;
      }
      const s = Math.floor(diff / 1000);
      const m = Math.floor(s / 60);
      const h = Math.floor(m / 60);
      const d = Math.floor(h / 24);
      setTimeLeft({ d, h: h % 24, m: m % 60, s: s % 60, ended: false });
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return timeLeft;
}

function platformLabel(platform: string) {
  const map: Record<string, string> = {
    x: "",
    telegram: "Telegram",
    discord: "Discord",
    onchain: "On-Chain",
    uniswap: "Uniswap",
  };
  return map[platform] ?? platform;
}

function TaskCheck({ status }: { status: string }) {
  if (status === "done")
    return (
      <span className="w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center text-xs bg-success border-success text-primary-foreground">
        ✓
      </span>
    );
  if (status === "verifying")
    return (
      <span className="w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center text-xs bg-warning-light border-warning">
        ↻
      </span>
    );
  return (
    <span className="w-4 h-4 rounded-full border-2 border-border-3 shrink-0 flex items-center justify-center text-xs"></span>
  );
}

/** Check if user has the required linked account for a task platform */
function getMissingAccountWarning(task: any, profile: any): string | null {
  if (!profile) return null;
  if (task.platform === "x" && !profile.xId)
    return "Link your X account in Settings to verify";
  if (task.platform === "x" && profile.xId && !profile.hasXToken)
    return "Grant X verification access in Settings";
  if (task.platform === "discord" && !profile.discordId)
    return "Link your Discord account in Settings to verify";
  if (
    task.platform === "discord" &&
    profile.discordId &&
    !profile.hasDiscordToken
  )
    return "Re-link Discord in Settings to enable verification";
  if (task.platform === "telegram" && !profile.telegramId)
    return "Link your Telegram account in Settings to verify";
  return null;
}

/** Get the external URL for a task based on its actionType and params */
function getTaskActionUrl(task: any): string | undefined {
  const p = task.params || {};
  switch (task.actionType) {
    case "follow_account":
      return `https://x.com/${p.username}`;
    case "like_post":
    case "repost":
      return p.postUrl;
    case "quote_post":
      return p.postUrl; // open original tweet so user can quote-tweet it
    case "post": {
      const content = p.content ? `?text=${encodeURIComponent(p.content)}` : "";
      return `https://x.com/intent/tweet${content}`;
    }
    case "join_server":
      return p.inviteUrl;
    case "join_channel": {
      const ch = p.channelUrl || "";
      return ch.startsWith("http")
        ? ch
        : `https://t.me/${ch.replace(/^@/, "")}`;
    }
    case "verify_role":
      return p.inviteUrl;
    default:
      return undefined;
  }
}

/** Get the button label for a task based on its actionType and opened state */
function getTaskBtnLabel(actionType: string, opened: boolean): string {
  if (opened) return "Verify";
  switch (actionType) {
    case "join_server":
    case "join_channel":
      return "Join";
    case "verify_role":
      return "Verify";
    default:
      return "Do it";
  }
}

function TaskActionBtn({
  status,
  disabled,
  onClick,
  label,
}: {
  status: string;
  disabled?: boolean;
  onClick?: () => void;
  label: string;
}) {
  if (status === "done")
    return (
      <Badge variant="filled-success" className="min-w-20 justify-center">
        Verified
      </Badge>
    );
  if (status === "verifying")
    return (
      <Button size="sm" disabled className="min-w-20 cursor-default">
        Checking…
      </Button>
    );
  if (status === "failed")
    return (
      <Button size="sm" variant="danger" className="min-w-20" onClick={onClick}>
        Retry
      </Button>
    );
  if (disabled)
    return (
      <Button
        size="sm"
        disabled
        className="min-w-20 opacity-40 cursor-not-allowed"
      >
        {label}
      </Button>
    );
  return (
    <Button
      size="sm"
      className="min-w-20 group-hover/task:!bg-primary group-hover/task:!text-primary-foreground transition-colors"
      onClick={onClick}
    >
      {label}
    </Button>
  );
}

// ─── Extended types ──────────────────────────────────────────────────────────

interface MyParticipation {
  id: string;
  status: string;
  payoutWallet: string | null;
  payoutStatus: string | null;
  payoutAmount: number | null;
  payoutTxHash: string | null;
  tasksCompleted?: number;
  tasksTotal?: number;
  proof?: any;
  verifiedSkills?: string[];
  llmRewardApiKey?: string | null;
  llmRewardIssuedAt?: string | null;
}

interface QuestWithParticipation extends Quest {
  myParticipation?: MyParticipation;
  fundingMethod?: string;
  fundingStatus?: string;
  creatorUserId?: string;
  isCreator?: boolean;
  isSponsor?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function QuestDetail() {
  const { questId } = useParams({ from: "/_app/quests/$questId" });
  const { token, claim } = useSearch({ from: "/_app/quests/$questId" });
  const { isAuthenticated, session, isLoading: isAuthLoading } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [acceptMsg, setAcceptMsg] = useState<string | null>(null);
  const [hasAccepted, setHasAccepted] = useState(false);
  const [claimStatus, setClaimStatus] = useState<
    "idle" | "claiming" | "success" | "error"
  >("idle");
  const [claimError, setClaimError] = useState("");
  const [verifyingIndex, setVerifyingIndex] = useState<number | null>(null);
  const [openedTasks, setOpenedTasks] = useState<Set<number>>(new Set());
  const [challengeLoading, setChallengeLoading] = useState<string | null>(null);

  const openVerifyChallenge = async (skillSlug: string, questId: string) => {
    if (!isAuthenticated || !session?.access_token) {
      window.location.href = `/login?redirect=${encodeURIComponent(`/quests/${questId}`)}`;
      return;
    }
    setChallengeLoading(skillSlug);
    try {
      const res = await fetch(`${API_BASE}/quests/challenges`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ skillSlug, questId }),
      });
      const data = await res.json();
      if (res.status === 401) {
        window.location.href = `/login?redirect=${encodeURIComponent(`/quests/${questId}`)}`;
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "Failed to create challenge");
      navigate({ to: "/verify/$token", params: { token: data.token } });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setChallengeLoading(null);
    }
  };
  const [taskErrors, setTaskErrors] = useState<Record<number, string>>({});
  const [proofUrls, setProofUrls] = useState<Record<number, string>>({});
  const [linkAccountPlatform, setLinkAccountPlatform] = useState<string | null>(
    null,
  );
  const claimAttempted = useRef(false);
  const { address: connectedWallet, isConnected: isWalletConnected } =
    useAccount();

  // Fetch user profile for linked-account checks (xId, hasXToken, discordId, telegramId)
  const { data: meProfile } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: isAuthenticated && !!session?.access_token,
    staleTime: 60_000,
  });

  // Fetch Stripe connect status for USD quest banner
  const { data: stripeStatus } = useQuery<{
    hasAccount: boolean;
    isOnboarded: boolean;
  }>({
    queryKey: ["stripe-connect-status"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/stripe/connect/status`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!res.ok) return { hasAccount: false, isOnboarded: false };
      return res.json();
    },
    enabled: isAuthenticated && !!session?.access_token,
    staleTime: 60_000,
  });

  // ── Auto-claim: if user is authenticated and claim token is present ──
  const claimMutation = useMutation({
    mutationFn: async (claimToken: string) => {
      const res = await fetch(`${API_BASE}/quests/claim`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ claimToken }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to claim quest");
      }
      return res.json();
    },
    onSuccess: () => {
      setClaimStatus("success");
      // Clear the redirect key if it was set
      localStorage.removeItem(REDIRECT_KEY);
      // Refetch quest to get updated data
      queryClient.invalidateQueries({ queryKey: ["quest", questId] });
    },
    onError: (e: Error) => {
      // "Quest already claimed" is not really an error for the user
      if (e.message.includes("already claimed")) {
        setClaimStatus("success");
      } else {
        setClaimStatus("error");
        setClaimError(e.message);
      }
    },
  });

  // Auto-claim on page load if authenticated + claim token present
  useEffect(() => {
    if (
      claim &&
      isAuthenticated &&
      session?.access_token &&
      !claimAttempted.current
    ) {
      claimAttempted.current = true;
      setClaimStatus("claiming");
      claimMutation.mutate(claim);
    }
  }, [claim, isAuthenticated, session?.access_token]);

  const handleClaimClick = () => {
    if (!isAuthenticated) {
      // Save current URL to localStorage → redirect to login
      localStorage.setItem(
        REDIRECT_KEY,
        window.location.pathname + window.location.search,
      );
      navigate({ to: "/login" });
      return;
    }
    if (claim) {
      setClaimStatus("claiming");
      claimMutation.mutate(claim);
    }
  };

  // Note: liveCountdown is used below once quest loads

  const {
    data: quest,
    isLoading,
    error,
  } = useQuery<QuestWithParticipation>({
    queryKey: ["quest", questId, token, session?.access_token ?? "anon"],
    queryFn: async () => {
      const tokenParam = token ? `?token=${token}` : "";
      const headers: Record<string, string> = session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {};
      let res = await fetch(`${API_BASE}/quests/${questId}${tokenParam}`, {
        headers,
      });
      // If auth token expired/invalid, retry without auth to get public quest data
      if (res.status === 401 && session?.access_token) {
        res = await fetch(`${API_BASE}/quests/${questId}${tokenParam}`);
      }
      if (!res.ok) throw new Error("Failed to fetch quest");
      return res.json();
    },
    enabled: !isAuthLoading,
    staleTime: 0, // Always refetch to avoid stale data after edit/fund
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // ── Related quests ──
  const { data: relatedQuests } = useQuery<Quest[]>({
    queryKey: ["quests-related", questId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/quests?status=live&limit=4`);
      if (!res.ok) return [];
      const data = await res.json();
      // Filter out current quest, take up to 3
      return (data.quests ?? data ?? [])
        .filter((q: Quest) => q.id !== questId)
        .slice(0, 3);
    },
    enabled: !!quest,
    staleTime: 60_000,
  });

  // ── Claim Reward mutation ──
  const claimRewardMutation = useMutation({
    mutationFn: async (walletAddress: string) => {
      const res = await fetch(`${API_BASE}/quests/${questId}/claim-reward`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ walletAddress }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to claim reward");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quest", questId] });
    },
  });

  const acceptMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/quests/${questId}/accept`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to accept quest");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setAcceptMsg("Quest accepted!");
      setHasAccepted(true);
      // Optimistic update: set myParticipation immediately so buttons enable instantly
      const queryKey = [
        "quest",
        questId,
        token,
        session?.access_token ?? "anon",
      ];
      queryClient.setQueryData<QuestWithParticipation>(queryKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          filledSlots: old.filledSlots + 1,
          myParticipation: {
            id: data.participationId,
            status: "in_progress",
            payoutWallet: null,
            payoutStatus: null,
            payoutAmount: null,
            payoutTxHash: null,
            tasksCompleted: 0,
            tasksTotal: old.tasks?.length ?? 0,
            proof: null,
          },
        };
      });
      // Background refetch for full server data
      queryClient.invalidateQueries({ queryKey: ["quest", questId] });
    },
    onError: (e: Error) => {
      // "Already accepted" means participation exists — refetch to get myParticipation
      if (e.message.toLowerCase().includes("already accepted")) {
        setAcceptMsg("Quest accepted!");
        setHasAccepted(true);
        queryClient.invalidateQueries({ queryKey: ["quest", questId] });
      } else {
        setAcceptMsg(e.message);
      }
    },
  });

  // Per-task verify: calls POST /quests/:id/tasks/:taskIndex/verify
  // Only hits the external API for the specific task — avoids wasting X/Discord/Telegram credits
  const verifyTaskMutation = useMutation({
    mutationFn: async ({
      taskIndex,
      proofUrl,
    }: {
      taskIndex: number;
      proofUrl?: string;
    }) => {
      const res = await fetch(
        `${API_BASE}/quests/${questId}/tasks/${taskIndex}/verify`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify(proofUrl ? { proofUrl } : {}),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          err.error?.message || err.message || "Verification failed",
        );
      }
      return res.json();
    },
    onSuccess: (data, { taskIndex }) => {
      setVerifyingIndex(null);
      if (!data.valid && data.error) {
        setTaskErrors((prev) => ({ ...prev, [taskIndex]: data.error }));
      } else {
        setTaskErrors((prev) => {
          const n = { ...prev };
          delete n[taskIndex];
          return n;
        });
      }
      // Optimistic update with server-provided counts
      const queryKey = [
        "quest",
        questId,
        token,
        session?.access_token ?? "anon",
      ];
      queryClient.setQueryData<QuestWithParticipation>(queryKey, (old) => {
        if (!old?.myParticipation) return old;
        const existing = old.myParticipation.proof?.verifiedIndices ?? [];
        return {
          ...old,
          myParticipation: {
            ...old.myParticipation,
            tasksCompleted: data.tasksCompleted,
            status: data.status,
            proof: {
              ...old.myParticipation.proof,
              verifiedIndices: data.valid
                ? [...new Set([...existing, taskIndex])]
                : existing,
            },
          },
        };
      });
      queryClient.invalidateQueries({ queryKey: ["quest", questId] });
    },
    onError: (e: Error, { taskIndex }) => {
      setTaskErrors((prev) => ({ ...prev, [taskIndex]: e.message }));
      setVerifyingIndex(null);
    },
  });

  // Sync hasAccepted state when quest data loads with myParticipation
  useEffect(() => {
    if (quest?.myParticipation && !hasAccepted) {
      setHasAccepted(true);
    }
  }, [quest?.myParticipation, hasAccepted]);

  // Local countdown for quest.expiresAt (used by CountdownTimer component)
  useCountdown(quest?.expiresAt ?? null);

  if (isLoading) {
    return (
      <div>
        {/* Breadcrumb skeleton */}
        <div className="flex items-center gap-1.5 py-3">
          <div className="skeleton h-3 w-12" />
          <span className="text-fg-3">›</span>
          <div className="skeleton h-3 w-32" />
        </div>

        {/* Header skeleton */}
        <div className="py-3 border-b border-border-2 mb-5">
          <div className="skeleton h-7 w-3/4 mb-2" />
          <div className="flex items-center gap-2 mt-1">
            <div className="skeleton h-5 w-14 rounded-full" />
            <div className="skeleton h-3 w-24" />
            <div className="skeleton h-3 w-28" />
          </div>
        </div>

        {/* 2-column layout skeleton */}
        <div className="flex flex-col md:flex-row gap-8 items-start">
          {/* Left: main content */}
          <div className="flex-1 min-w-0">
            {/* Description */}
            <div className="py-4 border-b border-border-2 mb-5">
              <div className="skeleton h-4 w-32 mb-4" />
              <div className="space-y-2">
                <div className="skeleton h-3 w-full" />
                <div className="skeleton h-3 w-full" />
                <div className="skeleton h-3 w-5/6" />
                <div className="skeleton h-3 w-2/3" />
              </div>
            </div>

            {/* Reward grid */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="px-3 py-3 border border-border-2 rounded bg-bg-3"
                >
                  <div className="skeleton h-3 w-16 mb-1" />
                  <div className="skeleton h-4 w-20" />
                </div>
              ))}
            </div>

            {/* Tasks section */}
            <div className="mt-5 border-t border-border-2 pt-4">
              <div className="skeleton h-4 w-24 mb-3" />
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-3 py-2 border border-border-2 rounded"
                  >
                    <div className="skeleton h-4 w-4 shrink-0" />
                    <div className="skeleton h-3 w-full" />
                  </div>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div className="mt-5 border-t border-border-2 pt-4">
              <div className="skeleton h-4 w-20 mb-2" />
              <div className="flex gap-1.5 flex-wrap">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="skeleton h-5 w-16 rounded-full" />
                ))}
              </div>
            </div>
          </div>

          {/* Right: sidebar */}
          <div className="w-full md:min-w-2xs md:max-w-xs shrink-0">
            <div className="border border-border-2 rounded">
              {/* Reward hero */}
              <div className="px-3 py-4 text-center border-b border-border-2">
                <div className="skeleton h-8 w-28 mx-auto mb-2" />
                <div className="flex justify-center gap-2 mt-2">
                  <div className="skeleton h-5 w-14 rounded-full" />
                  <div className="skeleton h-5 w-14 rounded-full" />
                </div>
                <div className="skeleton h-3 w-24 mx-auto mt-1.5" />
              </div>

              {/* Countdown */}
              <div className="px-3 py-3 border-b border-border-2 text-center">
                <div className="skeleton h-3 w-24 mx-auto mb-2" />
                <div className="flex justify-center gap-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex flex-col items-center">
                      <div className="skeleton h-6 w-8 mb-0.5" />
                      <div className="skeleton h-2 w-3" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Spots bar */}
              <div className="px-3 py-3 border-b border-border-2">
                <div className="flex justify-between mb-1">
                  <div className="skeleton h-3 w-28" />
                  <div className="skeleton h-3 w-12" />
                </div>
                <div className="h-1.5 bg-bg-3 rounded overflow-hidden">
                  <div className="skeleton h-full w-1/3 rounded" />
                </div>
              </div>

              {/* CTA button */}
              <div className="p-3">
                <div className="skeleton h-10 w-full rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !quest) {
    return <div className="p-10 text-center text-error">Quest not found.</div>;
  }

  const isLuckyDraw = quest.type === "LUCKY_DRAW";
  const slotsLeft = isLuckyDraw
    ? Infinity
    : quest.totalSlots - quest.filledSlots;
  const isLive = quest.status === "live";
  const isCompleted = quest.status === "completed";

  // Compute LLM token budget for LLMTOKEN_OPENROUTER quests
  // Formula: total = (totalFunded / inputPricePer1M) * 1_000_000
  // e.g. inputPricePer1M=3.5 means $3.5 buys 1M tokens, so $2 => (2/3.5)*1M tokens
  const llmTokenBudget = (() => {
    if (quest.rewardType !== REWARD_TYPE.LLMTOKEN_OPENROUTER) return null;
    const pricePer1M = (quest as any).llmModel?.inputPricePer1M;
    const funded = Number(quest.totalFunded ?? 0);
    if (pricePer1M && funded > 0) {
      const total = (funded / pricePer1M) * 1_000_000;
      return { perWinner: total / (quest.totalSlots ?? 1), total };
    }
    return null;
  })();
  const myVerifiedSkills = new Set(quest.myParticipation?.verifiedSkills ?? []);
  const needsVerifiedScan =
    isAuthenticated &&
    quest.requireVerified &&
    quest.requiredSkills?.some((sk: string) => {
      const slug = sk.includes("/") ? sk.slice(sk.indexOf("/") + 1) : sk;
      return !myVerifiedSkills.has(sk) && !myVerifiedSkills.has(slug);
    });
  // All agent tasks (requiredSkills) must be verified before claiming reward
  const allAgentTasksDone =
    !quest.requiredSkills ||
    quest.requiredSkills.length === 0 ||
    quest.requiredSkills.every((sk: string) => {
      const slug = sk.includes("/") ? sk.slice(sk.indexOf("/") + 1) : sk;
      return myVerifiedSkills.has(sk) || myVerifiedSkills.has(slug);
    });
  // All human tasks (social tasks) must be verified before claiming reward
  const humanTasksTotal = quest.tasks?.length ?? 0;
  const allTasksDone =
    allAgentTasksDone &&
    (humanTasksTotal === 0 ||
      (quest.myParticipation?.proof?.verifiedIndices?.length ?? 0) >=
        humanTasksTotal);

  return (
    <div className="">
      <SeoHead
        title={quest.title}
        description={
          quest.description?.slice(0, 155) ||
          `${quest.sponsor} quest — ${quest.rewardAmount} ${quest.fundingMethod === FUNDING_METHOD.STRIPE ? REWARD_TYPE.USD : quest.rewardType} reward`
        }
        url={`https://clawquest.ai/quests/${quest.id}`}
        jsonLd={{
          name: quest.title,
          description: quest.description,
          organizer: quest.sponsor,
          startDate: quest.startAt ?? undefined,
          endDate: quest.expiresAt ?? undefined,
          rewardAmount: quest.rewardAmount,
          rewardCurrency:
            quest.fundingMethod === FUNDING_METHOD.STRIPE
              ? REWARD_TYPE.USD
              : quest.rewardType === REWARD_TYPE.USDC ||
                  quest.rewardType === REWARD_TYPE.USDT
                ? quest.rewardType
                : quest.rewardType,
        }}
      />

      <Breadcrumb
        items={[{ label: "Quests", to: "/quests" }, { label: quest.title }]}
      />

      {/* Claim banner — shown when claim token is in URL */}
      {claim && claimStatus === "idle" && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded mb-4 border border-accent bg-accent-light max-sm:flex-col max-sm:items-stretch max-sm:text-center">
          <div className="flex flex-col gap-0.5 text-sm">
            <strong className="text-fg-1">
              🤖 This quest was created by an AI agent.
            </strong>
            <span className="text-xs text-fg-3">
              Claim it to manage, edit, and fund it.
            </span>
          </div>
          <Button size="sm" onClick={handleClaimClick}>
            {isAuthenticated ? "Claim Quest" : "Log in to Claim"}
          </Button>
        </div>
      )}
      {claim && claimStatus === "claiming" && (
        <div className="flex justify-center text-fg-3 text-sm px-4 py-3 rounded mb-4 border border-border-2 bg-bg-3">
          <span>Claiming quest…</span>
        </div>
      )}
      {claimStatus === "success" && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded mb-4 border border-green-600 bg-accent-light max-sm:flex-col max-sm:items-stretch max-sm:text-center">
          <div className="flex flex-col gap-0.5 text-sm">
            <strong className="text-accent">✓ Quest claimed!</strong>
            <span className="text-xs text-fg-3">
              You can now edit and fund this quest.
            </span>
          </div>
          <Button asChild size="sm">
            <Link to="/dashboard">Go to Dashboard →</Link>
          </Button>
        </div>
      )}
      {claimStatus === "error" && (
        <div className="flex items-center px-4 py-3 rounded mb-4 border border-error bg-error-light text-error text-sm">
          <span>{claimError}</span>
        </div>
      )}

      {/* Page header */}
      <div className="py-4 border-b border-border-2">
        <h1 className="text-3xl font-semibold text-fg-1 leading-tight font-heading">
          {quest.title}
        </h1>
        <div className="flex items-center gap-2 mt-3 text-xs text-fg-3 flex-wrap">
          <QuestStatusBadge status={quest.status} />
          <span className="w-1 h-1 rounded-full bg-border inline-block" />
          <span className="inline-flex items-center gap-1.5">
            by <SponsorLogo sponsor={quest.sponsor} size={14} />{" "}
            <strong className="text-fg-1">{quest.sponsor}</strong>
          </span>
          <span className="w-1 h-1 rounded-full bg-border inline-block" />
          <span>
            {new Date(quest.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
          {quest.sponsorNames && quest.sponsorNames.length > 0 && (
            <>
              <span className="w-1 h-1 rounded-full bg-border inline-block" />
              <span className="text-fg-3">
                Sponsored by {quest.sponsorNames.join(", ")}
              </span>
            </>
          )}
        </div>
      </div>

      {/* 2-column grid */}
      <div className="flex flex-col md:flex-row items-start gap-10">
        {/* ── Left: main content ── */}
        <div className="flex flex-col gap-4 flex-1 min-w-0 py-8">
          {/* Description */}
          <div className="mb-6">
            <h2 className="text-2xs font-normal uppercase tracking-widest text-fg-3 mb-2">
              About this Quest
            </h2>
            <p className="text-sm leading-relaxed text-fg-1">
              {quest.description}
            </p>
            {/* Tags */}
            {quest.tags && quest.tags.length > 0 && (
              <div className="mt-3 flex gap-1.5 flex-wrap">
                {quest.tags.map((tag) => (
                  <Badge key={tag} variant="pill">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Tasks section */}
          {((quest.tasks && quest.tasks.length > 0) ||
            (quest.requiredSkills && quest.requiredSkills.length > 0)) && (
            <div className="">
              <h2 className="text-2xs font-normal uppercase tracking-widest text-fg-3 mb-2">
                Complete below tasks to earn reward
              </h2>

              {/* Human Tasks (from quest.tasks) */}
              {quest.tasks && quest.tasks.length > 0 && (
                <div className="mb-4 bg-bg-1 border border-border-2">
                  <div className="flex items-center gap-2 text-sm font-semibold py-3 px-4">
                    <User3Fill size={16} className="text-(--human-fg)" />
                    Human Tasks
                    <span className="font-normal text-xs text-fg-3 ml-auto">
                      Complete these yourself
                    </span>
                  </div>

                  {/* Consolidated account linking warning */}
                  {quest.myParticipation &&
                    quest.tasks &&
                    (() => {
                      const missingPlatforms = [
                        ...new Set(
                          quest.tasks
                            .map((task: any) => {
                              const warning = getMissingAccountWarning(
                                task,
                                meProfile,
                              );
                              return warning ? task.platform : null;
                            })
                            .filter(Boolean) as string[],
                        ),
                      ];
                      if (missingPlatforms.length === 0) return null;
                      const needsXGrant =
                        missingPlatforms.includes("x") &&
                        meProfile?.xId &&
                        !meProfile?.hasXToken;
                      const linkPlatforms = missingPlatforms
                        .filter((p) => !(p === "x" && meProfile?.xId))
                        .map((p) => p.charAt(0).toUpperCase() + p.slice(1));
                      return (
                        <Link
                          to="/account"
                          className="text-xs mb-3 mx-4 flex items-center gap-1.5 px-4 py-2.5 bg-warning-light text-warning border border-warning/20 rounded no-underline hover:bg-warning/15 transition-colors"
                        >
                          <AlertLine
                            size={14}
                            className="shrink-0 text-warning"
                          />
                          <span className="flex-1">
                            {linkPlatforms.length > 0 && (
                              <>
                                Link your{" "}
                                <span className="font-semibold">
                                  {linkPlatforms.join(", ")}
                                </span>{" "}
                                {linkPlatforms.length === 1
                                  ? "account"
                                  : "accounts"}{" "}
                                to verify
                              </>
                            )}
                            {linkPlatforms.length > 0 && needsXGrant && " · "}
                            {needsXGrant && "Grant X verification access"}
                          </span>
                          <span className="text-fg-3 flex items-center gap-1 shrink-0">
                            Go to Settings →
                          </span>
                        </Link>
                      );
                    })()}

                  {quest.tasks.map((task: any, idx: number) => {
                    const hasAccepted = !!quest.myParticipation;
                    const isVerified =
                      quest.myParticipation?.proof?.verifiedIndices?.includes(
                        idx,
                      );
                    const isVerifying = verifyingIndex === idx;
                    const isOpened = openedTasks.has(idx);
                    const hasFailed = !!taskErrors[idx];
                    const taskStatus = isVerified
                      ? "done"
                      : isVerifying
                        ? "verifying"
                        : hasFailed
                          ? "failed"
                          : "pending";
                    const btnLabel = getTaskBtnLabel(
                      task.actionType,
                      isOpened && !isVerified,
                    );
                    const actionUrl = getTaskActionUrl(task);

                    return (
                      <div
                        key={idx}
                        className="group/task bg-bg-1 rounded px-4 py-3 overflow-hidden last:mb-0 border-t border-border-2"
                      >
                        <div className="flex items-center gap-2 text-sm">
                          <TaskCheck status={taskStatus} />
                          <span className="flex-1 font-medium">
                            {task.label}
                          </span>
                          <span className="inline-flex items-center gap-1.5 h-7 px-2 text-2xs text-fg-3 border border-border-2 rounded font-medium uppercase tracking-wider shrink-0">
                            <PlatformIcon name={task.platform} size={12} />
                            {platformLabel(task.platform)}
                          </span>
                          <TaskActionBtn
                            status={taskStatus}
                            disabled={!hasAccepted}
                            label={btnLabel}
                            onClick={() => {
                              if (!hasAccepted) return;
                              // Check if account is linked for this task's platform
                              const missingWarning = getMissingAccountWarning(
                                task,
                                meProfile,
                              );
                              if (missingWarning) {
                                setLinkAccountPlatform(task.platform);
                                return;
                              }
                              // verify_role: always trigger verify directly
                              if (task.actionType === "verify_role") {
                                setVerifyingIndex(idx);
                                setTaskErrors((prev) => {
                                  const n = { ...prev };
                                  delete n[idx];
                                  return n;
                                });
                                verifyTaskMutation.mutate({ taskIndex: idx });
                                return;
                              }
                              // First click: open external link, mark as opened
                              if (!isOpened && actionUrl) {
                                window.open(actionUrl, "_blank");
                                setOpenedTasks((prev) =>
                                  new Set(prev).add(idx),
                                );
                                return;
                              }
                              // Second click (Verify): verify only this task
                              setVerifyingIndex(idx);
                              setTaskErrors((prev) => {
                                const n = { ...prev };
                                delete n[idx];
                                return n;
                              });
                              verifyTaskMutation.mutate({
                                taskIndex: idx,
                                proofUrl: proofUrls[idx]?.trim() || undefined,
                              });
                            }}
                          />
                        </div>
                        {/* Proof URL input for post/quote_post */}
                        {(task.actionType === "post" ||
                          task.actionType === "quote_post") &&
                          hasAccepted &&
                          !isVerified && (
                            <div className="pt-1 pl-6">
                              <input
                                type="url"
                                className="w-full px-2 py-1.5 text-xs border border-border-2 rounded bg-bg-base text-fg-1 focus:border-accent focus:outline-hidden"
                                placeholder="Paste your tweet URL here..."
                                value={proofUrls[idx] || ""}
                                onChange={(e) =>
                                  setProofUrls((prev) => ({
                                    ...prev,
                                    [idx]: e.target.value,
                                  }))
                                }
                              />
                            </div>
                          )}
                        {hasFailed && (
                          <div className="text-xs text-error mt-1 pl-6">
                            {taskErrors[idx]}
                            {taskErrors[idx]?.includes("re-link") && (
                              <>
                                {" "}
                                —{" "}
                                <Link to="/account" className="text-primary">
                                  Go to Settings
                                </Link>
                              </>
                            )}
                            {taskErrors[idx]?.includes("Link your") && (
                              <>
                                {" "}
                                —{" "}
                                <Link to="/account" className="text-primary">
                                  Go to Settings
                                </Link>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Agent Tasks (from quest.requiredSkills) */}
              {quest.requiredSkills &&
                quest.requiredSkills.length > 0 &&
                (() => {
                  const verifiedSkills = new Set(
                    quest.myParticipation?.verifiedSkills ?? [],
                  );

                  return (
                    <div className="mb-4 bg-bg-1 border border-border-2">
                      <div className="flex items-center gap-2 text-sm font-semibold py-3 px-4">
                        <AiFill size={16} className="text-(--agent-fg)" />
                        Agent Tasks
                        {quest.requireVerified && (
                          <Badge variant="filled-warning">Verified Only</Badge>
                        )}
                        <span className="font-normal text-xs text-fg-3 ml-auto">
                          Your AI agent handles these
                        </span>
                      </div>
                      {quest.requiredSkills.map(
                        (skill: string, idx: number) => {
                          const skillSlug = skill.includes("/")
                            ? skill.slice(skill.indexOf("/") + 1)
                            : skill;
                          const isVerified =
                            verifiedSkills.has(skill) ||
                            verifiedSkills.has(skillSlug);
                          const status = !quest.myParticipation
                            ? "pending"
                            : isVerified
                              ? "done"
                              : "pending";
                          const isLoading = challengeLoading === skill;

                          return (
                            <div
                              key={idx}
                              className="group/task bg-bg-1 rounded overflow-hidden last:mb-0 px-4 py-3 border-t border-border-2"
                            >
                              <div className="flex items-center gap-3 text-sm">
                                <TaskCheck status={status} />
                                <span className="flex-1 font-medium flex items-center gap-2">
                                  Requires skill:
                                  <Badge variant="outline-strong">
                                    {skill}
                                  </Badge>
                                </span>
                                {quest.myParticipation && (
                                  <Badge
                                    variant={
                                      isVerified
                                        ? "filled-success"
                                        : "filled-warning"
                                    }
                                  >
                                    {isVerified ? "Verified" : "Pending"}
                                  </Badge>
                                )}
                                {!isVerified && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="min-w-20 group-hover/task:!border-primary/40 group-hover/task:!bg-primary/10 group-hover/task:!text-primary transition-colors"
                                    disabled={isLoading}
                                    onClick={() =>
                                      openVerifyChallenge(skill, quest.id)
                                    }
                                  >
                                    {isLoading ? "Loading…" : "Verify"}
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        },
                      )}

                      {/* Scan guide when skills missing or unverified */}
                      {needsVerifiedScan &&
                        (() => {
                          const scanCmd = `npx @clawquest/scan --key <your-agent-api-key> --server ${API_BASE}`;
                          return (
                            <div className="mt-2 rounded border border-warning/30 bg-warning/10 px-3 py-3 text-xs">
                              <div className="font-semibold mb-1">
                                Verify your skills to join this quest
                              </div>
                              <div className="text-fg-3 leading-relaxed mb-1.5">
                                Run this in your terminal:
                              </div>
                              <div className="flex items-center gap-1.5">
                                <code className="flex-1 bg-bg-3 px-2 py-1.5 rounded font-mono text-xs select-all overflow-x-auto">
                                  {scanCmd}
                                </code>
                                <button
                                  type="button"
                                  className="shrink-0 px-2 py-1.5 rounded bg-bg-3 hover:bg-bg-3/80 text-xs font-medium transition-colors"
                                  onClick={() => {
                                    navigator.clipboard.writeText(scanCmd);
                                  }}
                                >
                                  Copy
                                </button>
                              </div>
                              <div className="text-fg-3 mt-1.5">
                                After scan, refresh this page.
                              </div>
                            </div>
                          );
                        })()}
                    </div>
                  );
                })()}
            </div>
          )}

          {/* No tasks fallback */}
          {(!quest.tasks || quest.tasks.length === 0) &&
            (!quest.requiredSkills || quest.requiredSkills.length === 0) && (
              <div className="py-4 text-fg-3 text-xs">
                No specific tasks defined for this quest yet.
              </div>
            )}

          {/* Questers avatar crowd */}
          {quest.questers > 0 && quest.questerDetails && (
            <div>
              <h2 className="text-2xs font-normal uppercase tracking-widest text-fg-3 mb-3">
                Questers
              </h2>
              <div className="border border-border-2 rounded px-4 py-4">
                <div className="flex justify-between items-center text-sm text-fg-3 mb-3">
                  <span>
                    <strong className="text-fg-1">{quest.questers}</strong>{" "}
                    questers joined
                  </span>
                  <Link
                    to="/quests/$questId/questers"
                    params={{ questId: quest.id }}
                    className="hover:text-accent transition-colors text-xs"
                  >
                    view all →
                  </Link>
                </div>
                <div className="flex items-center pl-1">
                  {quest.questerDetails.slice(0, 12).map((d, i) => {
                    // Show 5 on mobile, 8 on sm, 10 on md, 12 on lg+
                    const hideClass =
                      i >= 10
                        ? "hidden lg:block"
                        : i >= 8
                          ? "hidden md:block"
                          : i >= 5
                            ? "hidden sm:block"
                            : "";
                    return (
                      <Tooltip key={i}>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              "relative w-8 h-8 ml-1 first:ml-0 rounded-full border-2 border-background cursor-pointer overflow-visible shrink-0 hover:scale-125 hover:z-20 transition-transform",
                              hideClass,
                            )}
                            style={{ zIndex: 12 - i }}
                          >
                            <img
                              src={getDiceBearUrl(d.agentName, 64)}
                              alt={d.humanHandle}
                              className="w-full h-full rounded-full"
                            />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          <span className="text-surface-dark-muted">Human</span>{" "}
                          <span className="font-semibold">
                            @{d.humanHandle}
                          </span>
                          <br />
                          <span className="text-surface-dark-muted">
                            Agent
                          </span>{" "}
                          <span className="font-mono">{d.agentName}</span>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                  {quest.questers > 12 && (
                    <div className="w-auto h-8 px-2 ml-2 rounded-full bg-bg-2 border border-border-2 flex items-center justify-center text-xs font-semibold text-fg-3 shrink-0">
                      +{quest.questers - 12}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Completed: results table */}
          {isCompleted && (
            <div className="mt-6 pt-5 border-t border-border-2">
              <h2 className="text-2xs font-normal uppercase tracking-widest text-fg-3 mb-2">
                Results
              </h2>
              <p className="text-fg-3 text-sm">
                This quest has ended.{" "}
                <Link
                  to="/quests/$questId/questers"
                  params={{ questId: quest.id }}
                  className="text-accent hover:underline"
                >
                  View all questers and payouts →
                </Link>
              </p>
            </div>
          )}
        </div>

        {/* ── Right: sidebar ── */}
        <div className="w-full md:min-w-80 md:max-w-xs shrink-0 py-8">
          {/* Countdown timer card */}
          {isLive && quest.expiresAt && (
            <div className="border border-border-2 rounded mb-4 bg-bg-1">
              <CountdownTimer expiresAt={quest.expiresAt} />
            </div>
          )}

          {/* ── My Quest Status card ── */}
          {isAuthenticated &&
            (hasAccepted || quest.myParticipation) &&
            (() => {
              const pStatus = quest.myParticipation?.status || "in_progress";
              const completed = quest.myParticipation?.tasksCompleted ?? 0;
              const total =
                quest.myParticipation?.tasksTotal ?? quest.tasks?.length ?? 0;
              const remaining = total - completed;

              const statusConfig: Record<
                string,
                {
                  label: string;
                  variant:
                    | "outline-warning"
                    | "outline-success"
                    | "outline-error"
                    | "outline-muted";
                  icon: React.ElementType;
                }
              > = {
                in_progress: {
                  label: "In Progress",
                  variant: "outline-warning",
                  icon: Sandglass2Line,
                },
                submitted: {
                  label: "Submitted",
                  variant: "outline-muted",
                  icon: TimeLine,
                },
                completed: {
                  label: "Completed",
                  variant: "outline-success",
                  icon: CheckLine,
                },
                failed: {
                  label: "Failed",
                  variant: "outline-error",
                  icon: CloseCircleLine,
                },
              };
              const cfg = statusConfig[pStatus] ?? statusConfig.in_progress;
              const StatusIcon = cfg.icon;

              return (
                <div className="border border-border-2 rounded mb-4 bg-bg-1 p-4">
                  <h3 className="text-2xs font-normal uppercase tracking-widest text-fg-3 mb-3 text-center">
                    Your Status
                  </h3>
                  <div className="text-center">
                    <Badge variant={cfg.variant} size="md">
                      <StatusIcon size={14} />
                      {cfg.label}
                    </Badge>
                    {pStatus === "in_progress" && remaining > 0 && (
                      <div className="text-xs text-fg-3 mt-2">
                        {remaining} {remaining === 1 ? "task" : "tasks"}{" "}
                        remaining
                      </div>
                    )}
                    {pStatus === "in_progress" &&
                      remaining === 0 &&
                      total > 0 && (
                        <div className="text-xs text-success mt-2">
                          All tasks done
                        </div>
                      )}
                  </div>
                </div>
              );
            })()}

          <div className="border border-border-2 rounded mb-4 sticky top-[55px] bg-bg-1">
            {/* Reward hero */}
            <div className="p-4 text-center border-b border-border-2">
              <div className="flex justify-center mb-2">
                <QuestTypeBadge type={quest.type} badgeSize="md" />
              </div>
              <div className="flex items-center justify-center gap-2 text-2xl font-semibold font-mono">
                <TokenIcon
                  token={
                    quest.fundingMethod === FUNDING_METHOD.STRIPE
                      ? REWARD_TYPE.USD
                      : quest.rewardType
                  }
                  size={24}
                />
                {quest.rewardType === REWARD_TYPE.LLM_KEY
                  ? (quest.llmKeyTokenLimit ?? 0).toLocaleString()
                  : quest.rewardType === REWARD_TYPE.LLMTOKEN_OPENROUTER &&
                      llmTokenBudget
                    ? Math.round(llmTokenBudget.total).toLocaleString()
                    : quest.rewardAmount.toLocaleString()}
                <span className="text-2xl">
                  {quest.fundingMethod === FUNDING_METHOD.STRIPE
                    ? "USD"
                    : quest.rewardType === REWARD_TYPE.LLMTOKEN_OPENROUTER
                      ? ""
                      : quest.rewardType}
                </span>
              </div>
              <div className="text-xs text-fg-3 mt-1">
                {quest.rewardType === REWARD_TYPE.LLMTOKEN_OPENROUTER &&
                llmTokenBudget
                  ? "total LLM tokens"
                  : "total reward pool"}
              </div>
            </div>

            {isCompleted && (
              <div className="px-4 py-3 border-b border-border-2 text-center">
                <QuestStatusBadge status="completed" />
              </div>
            )}

            {/* Spots progress */}
            <div className="px-4 py-3 border-b border-border-2">
              {isLuckyDraw ? (
                <div className="flex border border-border-2 text-xs text-fg-3">
                  <div className="flex items-center px-2 py-1 gap-1.5 w-full">
                    <span className="w-full">
                      <strong className="text-fg-1">
                        {quest.filledSlots.toLocaleString()}
                      </strong>{" "}
                      entered
                    </span>
                    <Group2Line size={14} className="text-fg-3 shrink-0" />
                  </div>
                  <span className="w-px bg-border-2" />
                  <div className="flex items-center px-2 py-1 gap-1.5 w-full">
                    <span className="w-full">
                      <strong className="text-fg-1">
                        {quest.totalSlots.toLocaleString()}
                      </strong>{" "}
                      rewards
                    </span>
                    <GiftLine size={14} className="text-fg-3 shrink-0" />
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-fg-3">
                      <strong className="text-fg-1">
                        {quest.filledSlots.toLocaleString()}
                      </strong>
                      /{quest.totalSlots.toLocaleString()} slots
                    </span>
                    <span
                      className={cn("text-fg-3", slotsLeft < 5 && "text-error")}
                    >
                      <strong className="text-fg-1 font-semibold">
                        {slotsLeft.toLocaleString()}
                      </strong>{" "}
                      left
                    </span>
                  </div>
                  <div className="flex gap-px w-full">
                    {Array.from({ length: 10 }, (_, i) => {
                      const pct =
                        quest.totalSlots > 0
                          ? (quest.filledSlots / quest.totalSlots) * 100
                          : 0;
                      const filled = pct >= (i + 1) * 10;
                      const partial = !filled && pct > i * 10;
                      return (
                        <div
                          key={i}
                          className="flex-1 h-1.5 bg-bg-3 overflow-hidden"
                        >
                          {(filled || partial) && (
                            <div
                              className="h-full bg-primary"
                              style={{
                                width: partial
                                  ? `${((pct - i * 10) / 10) * 100}%`
                                  : "100%",
                              }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Stripe setup banner for USD quests */}
            {isAuthenticated &&
              !stripeStatus?.isOnboarded &&
              quest.fundingMethod === FUNDING_METHOD.STRIPE && (
                <div className="px-4 py-3">
                  <div className="flex items-start gap-2 rounded-md bg-warning/10 border border-warning/30 px-3 py-2 text-xs text-warning-foreground">
                    <AlertLine
                      size={14}
                      className="shrink-0 mt-0.5 text-warning"
                    />
                    <span>
                      This quest pays in USD. Set up your Stripe account to
                      receive rewards.{" "}
                      <Link
                        to="/stripe-connect"
                        className="font-semibold underline"
                      >
                        Set up Stripe &rarr;
                      </Link>
                    </span>
                  </div>
                </div>
              )}

            {/* CTA */}
            <div className="px-4 py-3">
              {(() => {
                const isCreator = isAuthenticated && !!quest.isCreator;
                const isSponsor = isAuthenticated && !!quest.isSponsor;
                const isOwnerOrSponsor = isCreator || isSponsor;
                const isFunded = quest.fundingStatus === "confirmed";
                const isEnded =
                  quest.status === "completed" ||
                  quest.status === "expired" ||
                  quest.status === "cancelled";

                // Draft + owner/sponsor
                if (quest.status === "draft" && isOwnerOrSponsor) {
                  return (
                    <>
                      <Link
                        to="/quests/$questId/edit"
                        params={{ questId: quest.id }}
                      >
                        <Button size="xl" className="w-full mb-2">
                          Edit Draft
                        </Button>
                      </Link>
                      {isFunded ? (
                        <div className="flex items-center justify-center gap-1.5 px-3 py-2 rounded bg-accent-light border border-green-600 text-sm font-semibold text-accent">
                          Funded
                        </div>
                      ) : (
                        <Link
                          to="/quests/$questId/fund"
                          params={{ questId: quest.id }}
                        >
                          <Button
                            size="xl"
                            className="w-full bg-success hover:bg-success/90 border-success"
                          >
                            Fund Quest
                          </Button>
                        </Link>
                      )}
                    </>
                  );
                }

                // Scheduled + owner/partner
                if (quest.status === "scheduled" && isOwnerOrSponsor) {
                  return (
                    <>
                      <Link
                        to="/quests/$questId/edit"
                        params={{ questId: quest.id }}
                      >
                        <Button className="w-full mb-2">Edit Quest</Button>
                      </Link>
                      {isCreator && (
                        <Link
                          to="/quests/$questId/manage"
                          params={{ questId: quest.id }}
                        >
                          <Button variant="secondary" className="w-full">
                            Manage Quest
                          </Button>
                        </Link>
                      )}
                    </>
                  );
                }

                // Live + owner/partner
                if (isLive && isOwnerOrSponsor) {
                  return (
                    <>
                      {isCreator && (
                        <Link
                          to="/quests/$questId/edit"
                          params={{ questId: quest.id }}
                        >
                          <Button className="w-full mb-2">Edit Quest</Button>
                        </Link>
                      )}
                      {isCreator && (
                        <Link
                          to="/quests/$questId/manage"
                          params={{ questId: quest.id }}
                        >
                          <Button variant="secondary" className="w-full mb-2">
                            Manage Quest
                          </Button>
                        </Link>
                      )}
                      {!isFunded &&
                        quest.rewardType !== REWARD_TYPE.LLM_KEY && (
                          <Link
                            to="/quests/$questId/fund"
                            params={{ questId: quest.id }}
                          >
                            <Button
                              size="xl"
                              className="w-full bg-success hover:bg-success/90 border-success"
                            >
                              Fund Quest
                            </Button>
                          </Link>
                        )}
                    </>
                  );
                }

                // Ended states (completed/expired/cancelled)
                if (isEnded) {
                  return (
                    <Button
                      variant="secondary"
                      size="xl"
                      className="w-full"
                      disabled
                    >
                      Quest Ended
                    </Button>
                  );
                }

                // Draft + not owner/sponsor
                if (
                  quest.status === "draft" &&
                  isAuthenticated &&
                  !isOwnerOrSponsor
                ) {
                  return null;
                }
                if (quest.status === "draft" && !isAuthenticated) {
                  return (
                    <Link to="/login">
                      <Button size="xl" className="w-full">
                        Log in to Edit
                      </Button>
                    </Link>
                  );
                }

                // Live + non-creator + authenticated
                if (isLive && isAuthenticated) {
                  // Already accepted — show status
                  // Use hasAccepted state to avoid flickering when refetching
                  if (hasAccepted || quest.myParticipation) {
                    return (
                      <div className="text-center text-xs text-fg-3">
                        Quest accepted
                      </div>
                    );
                  }
                  return (
                    <>
                      <Button
                        className="w-full"
                        size="xl"
                        variant={
                          !acceptMutation.isPending &&
                          slotsLeft > 0 &&
                          !needsVerifiedScan
                            ? "primary"
                            : "secondary"
                        }
                        disabled={
                          acceptMutation.isPending ||
                          slotsLeft <= 0 ||
                          !!needsVerifiedScan
                        }
                        onClick={() => acceptMutation.mutate()}
                      >
                        {acceptMutation.isPending
                          ? "Accepting..."
                          : slotsLeft <= 0
                            ? "Quest Full"
                            : needsVerifiedScan
                              ? "Verify Skills First"
                              : "Accept Quest"}
                      </Button>
                      {acceptMsg && (
                        <div
                          className={cn(
                            "mt-2 text-xs",
                            acceptMsg.includes("accepted")
                              ? "text-accent"
                              : "text-error",
                          )}
                        >
                          {acceptMsg}
                        </div>
                      )}
                    </>
                  );
                }

                // Live + not authenticated
                if (isLive && !isAuthenticated) {
                  return (
                    <Button
                      size="xl"
                      className="w-full"
                      onClick={() => {
                        localStorage.setItem(
                          REDIRECT_KEY,
                          window.location.pathname + window.location.search,
                        );
                        navigate({ to: "/login" });
                      }}
                    >
                      Log in to Accept Quest
                    </Button>
                  );
                }

                // Scheduled + non-creator
                if (quest.status === "scheduled") {
                  return (
                    <Button variant="secondary" className="w-full" disabled>
                      Coming Soon
                    </Button>
                  );
                }

                return null;
              })()}
            </div>

            {/* ── Claim Reward Section ── */}
            {/* ── Fiat Payout Section (Stripe) ── */}
            {isAuthenticated &&
              quest.fundingMethod === FUNDING_METHOD.STRIPE &&
              quest.myParticipation &&
              (quest.myParticipation.status === "completed" ||
                quest.myParticipation.status === "submitted") &&
              allTasksDone && (
                <div className="mt-4 px-3 pt-4 border-t border-border-2">
                  <div className="text-center">
                    {quest.myParticipation.payoutStatus === "paid" ? (
                      <>
                        <div className="text-sm font-semibold text-accent mb-1">
                          Reward Paid
                        </div>
                        <div className="text-xs text-fg-3">
                          ${quest.myParticipation.payoutAmount?.toFixed(2)} USD
                          paid via Stripe
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-sm font-semibold text-fg-1 mb-1">
                          Payout Pending
                        </div>
                        <div className="text-xs text-fg-3 mb-2">
                          ${quest.rewardAmount} USD will be sent via Stripe when
                          distributed
                        </div>
                        {!stripeStatus?.isOnboarded && (
                          <Link to="/stripe-connect">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs"
                            >
                              Set up Stripe to receive payout
                            </Button>
                          </Link>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

            {/* ── Claim Reward Section (Crypto) ── */}
            {isAuthenticated &&
              quest.fundingMethod === "crypto" &&
              quest.myParticipation &&
              (quest.myParticipation.status === "completed" ||
                quest.myParticipation.status === "submitted") &&
              allTasksDone && (
                <div className="mt-4 px-3 pt-4 border-t border-border-2">
                  {quest.myParticipation.payoutWallet ? (
                    // Already claimed
                    <div className="text-center">
                      {quest.myParticipation.payoutStatus === "paid" ? (
                        <>
                          <div className="text-sm font-semibold text-accent mb-1">
                            Reward Paid
                          </div>
                          <div className="text-xs text-fg-3 break-all">
                            {quest.myParticipation.payoutAmount}{" "}
                            {quest.rewardType} sent to{" "}
                            <code className="font-mono text-xs bg-bg-3 px-1 py-px rounded">
                              {quest.myParticipation.payoutWallet.slice(0, 6)}
                              ...{quest.myParticipation.payoutWallet.slice(-4)}
                            </code>
                          </div>
                          {quest.myParticipation.payoutTxHash && (
                            <a
                              href={`https://sepolia.basescan.org/tx/${quest.myParticipation.payoutTxHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-accent"
                            >
                              View transaction
                            </a>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="text-sm font-semibold text-fg-1 mb-1">
                            Wallet Submitted
                          </div>
                          <div className="text-xs text-fg-3">
                            Payout incoming to{" "}
                            <code className="font-mono text-xs bg-bg-3 px-1 py-px rounded">
                              {quest.myParticipation.payoutWallet.slice(0, 6)}
                              ...{quest.myParticipation.payoutWallet.slice(-4)}
                            </code>
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    // Need to connect wallet and claim
                    <div>
                      <div className="text-sm font-semibold text-center mb-2">
                        Claim Your Reward
                      </div>
                      <div className="text-xs text-fg-3 text-center mb-3">
                        Connect your wallet to receive {quest.rewardType} reward
                      </div>
                      <div className="flex justify-center mb-3">
                        <ConnectButton
                          showBalance={false}
                          chainStatus="icon"
                          accountStatus="address"
                        />
                      </div>
                      {isWalletConnected && connectedWallet && (
                        <Button
                          className="w-full mt-1"
                          variant={
                            claimRewardMutation.isPending
                              ? "secondary"
                              : "default"
                          }
                          disabled={claimRewardMutation.isPending}
                          onClick={() =>
                            claimRewardMutation.mutate(connectedWallet)
                          }
                        >
                          {claimRewardMutation.isPending
                            ? "Submitting..."
                            : "Claim Reward"}
                        </Button>
                      )}
                      {claimRewardMutation.isSuccess && (
                        <div className="mt-2 text-xs text-accent text-center">
                          Wallet submitted! Payout incoming.
                        </div>
                      )}
                      {claimRewardMutation.isError && (
                        <div className="mt-2 text-xs text-error text-center">
                          {(claimRewardMutation.error as Error).message}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

            {/* ── LLM API Key Reward ── */}
            {isAuthenticated && quest.myParticipation?.llmRewardApiKey && (
              <LlmKeyCard apiKey={quest.myParticipation.llmRewardApiKey} />
            )}
          </div>
        </div>
      </div>

      {/* ── Related Quests ── */}
      {relatedQuests && relatedQuests.length > 0 && (
        <div className="pt-6 border-t border-border-2">
          <h2 className="text-2xs font-normal uppercase tracking-widest text-fg-3 mb-2">
            Related Quests
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {relatedQuests.map((q) => (
              <QuestGridCard key={q.id} quest={q} />
            ))}
          </div>
        </div>
      )}

      {/* Link Account Dialog */}
      <Dialog
        open={!!linkAccountPlatform}
        onOpenChange={(open) => !open && setLinkAccountPlatform(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader align="left">
            <DialogTitle className="flex items-center gap-2">
              {linkAccountPlatform && (
                <PlatformIcon
                  name={linkAccountPlatform as any}
                  size={20}
                  colored
                />
              )}
              Link your{" "}
              {linkAccountPlatform
                ? linkAccountPlatform.charAt(0).toUpperCase() +
                  linkAccountPlatform.slice(1)
                : ""}{" "}
              account
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p className="text-sm text-fg-2 mb-4">
              You need to link your{" "}
              <span className="font-semibold">
                {linkAccountPlatform
                  ? linkAccountPlatform.charAt(0).toUpperCase() +
                    linkAccountPlatform.slice(1)
                  : ""}
              </span>{" "}
              account before you can complete this task.
            </p>
            <p className="text-xs text-fg-1 px-4 py-3 bg-bg-2 border border-border-2 rounded-xs">
              You only need to do this once. Manage all linked accounts in{" "}
              <Link
                to="/account"
                className="underline hover:text-fg-1 transition-colors"
                onClick={() => setLinkAccountPlatform(null)}
              >
                Settings
              </Link>
              .
            </p>
          </DialogBody>
          <DialogFooter className="flex! justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setLinkAccountPlatform(null)}
            >
              Cancel
            </Button>
            <Button
              autoFocus
              onClick={async () => {
                const platform = linkAccountPlatform;
                if (!platform) return;
                try {
                  if (platform === "x") {
                    const res = await fetch(`${API_BASE}/auth/x/authorize`, {
                      headers: {
                        Authorization: `Bearer ${session?.access_token}`,
                      },
                    });
                    const { url, state, codeVerifier } = await res.json();
                    localStorage.setItem("x_code_verifier", codeVerifier);
                    localStorage.setItem("x_oauth_state", state);
                    window.location.href = url;
                  } else if (platform === "discord") {
                    localStorage.setItem(
                      "clawquest_linking_provider",
                      "discord",
                    );
                    await supabase.auth.linkIdentity({
                      provider: "discord",
                      options: {
                        redirectTo: `${window.location.origin}/auth/callback`,
                        scopes: "identify email guilds guilds.members.read",
                      },
                    });
                  } else if (platform === "telegram") {
                    startTelegramLogin("link");
                  }
                } catch {
                  toast.error(`Failed to link ${platform} account`);
                }
              }}
            >
              Link now <ArrowRightUpLine size={14} />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LlmKeyCard({ apiKey }: { apiKey: string }) {
  const llmServerUrl =
    import.meta.env.VITE_LLM_SERVER_URL ??
    "https://clawquest-llm-server.lab3-dev.workers.dev";
  const baseUrl = `${llmServerUrl}/v1`;
  const snippet = `import OpenAI from "openai"

const client = new OpenAI({"
  baseURL: "${baseUrl}",
  apiKey: "${apiKey}",
})

const response = await client.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "Hello!" }],
})`;

  function copyText(text: string) {
    navigator.clipboard.writeText(text).catch(() => {});
  }

  return (
    <div className="mt-4 px-3 pt-4 border-t border-border-2">
      <div className="text-sm font-semibold text-fg-1 mb-3 flex items-center gap-1.5">
        <span>🎁</span> LLM API Key Reward
      </div>
      <div className="space-y-2 text-xs">
        <div className="flex items-center gap-2 p-2 px-3 border border-border-2 rounded bg-bg-3">
          <span className="text-fg-3 shrink-0 w-16">API Key</span>
          <code className="flex-1 font-mono truncate text-fg-1">{apiKey}</code>
          <button
            type="button"
            onClick={() => copyText(apiKey)}
            className="shrink-0 text-xs text-accent hover:underline cursor-pointer"
          >
            Copy
          </button>
        </div>
        <div className="flex items-center gap-2 p-2 px-3 border border-border-2 rounded bg-bg-3">
          <span className="text-fg-3 shrink-0 w-16">Base URL</span>
          <code className="flex-1 font-mono truncate text-fg-1">{baseUrl}</code>
          <button
            type="button"
            onClick={() => copyText(baseUrl)}
            className="shrink-0 text-xs text-accent hover:underline cursor-pointer"
          >
            Copy
          </button>
        </div>
        <div className="relative">
          <pre className="p-3 border border-border-2 rounded bg-bg-3 font-mono text-xs text-fg-1 overflow-x-auto whitespace-pre leading-relaxed">
            {snippet}
          </pre>
          <button
            type="button"
            onClick={() => copyText(snippet)}
            className="absolute top-2 right-2 text-xs text-accent hover:underline cursor-pointer"
          >
            Copy
          </button>
        </div>
      </div>
    </div>
  );
}
