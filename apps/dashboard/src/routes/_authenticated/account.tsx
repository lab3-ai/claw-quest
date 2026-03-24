import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { startTelegramLogin } from "@/lib/telegram-oidc";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/page-title";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { toast } from "sonner";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CloseLine } from "@mingcute/react";
import { PlatformIcon } from "@/components/PlatformIcon";
import { GitHubIcon } from "@/components/github-icon";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

interface Wallet {
  id: string;
  address: string;
  chainId: number | null;
  isPrimary: boolean;
  createdAt: string;
}

interface UserProfile {
  id: string;
  email: string;
  username: string | null;
  displayName: string | null;
  role: string;
  telegramId: string | null;
  telegramUsername: string | null;
  xId: string | null;
  xHandle: string | null;
  hasXToken: boolean;
  discordId: string | null;
  discordHandle: string | null;
  githubId: string | null;
  githubHandle: string | null;
  createdAt: string;
}

const CHAIN_NAMES: Record<number, string> = {
  1: "Ethereum",
  8453: "Base",
  84532: "Base Sepolia",
  10: "Optimism",
  42161: "Arbitrum",
};

function shortenAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

// Providers available for social linking on account page
const LINK_PROVIDERS = [
  { key: "google", label: "Google", icon: "G", supabaseProvider: "google" },
  { key: "telegram", label: "Telegram", icon: "TG", supabaseProvider: null },
  { key: "x", label: "X (Twitter)", icon: "X", supabaseProvider: "x" },
  { key: "discord", label: "Discord", icon: "DC", supabaseProvider: "discord" },
];

// Map for displaying legacy connected identities not in LINK_PROVIDERS
const PROVIDER_LABELS: Record<string, { label: string; icon: string }> = {
  google: { label: "Google", icon: "G" },
  github: { label: "GitHub", icon: "GH" },
  telegram: { label: "Telegram", icon: "TG" },
  twitter: { label: "X (Twitter)", icon: "X" },
  discord: { label: "Discord", icon: "DC" },
};

export function Account() {
  const { session, user: supabaseUser } = useAuth();
  const queryClient = useQueryClient();
  const token = session?.access_token;

  const [walletInput, setWalletInput] = useState("");
  const [walletActionPending, setWalletActionPending] = useState(""); // wallet id being acted on
  const [promotedWalletId, setPromotedWalletId] = useState(""); // animates newly-promoted wallet
  const [unlinkPending, setUnlinkPending] = useState("");
  const [linkPending, setLinkPending] = useState("");
  const [xAuthPending, setXAuthPending] = useState(false);

  // Profile editing state
  const [editingField, setEditingField] = useState<
    "displayName" | "username" | null
  >(null);
  const [editValue, setEditValue] = useState("");

  // Fetch profile from API
  const {
    data: profile,
    isLoading: profileLoading,
    isError: profileError,
  } = useQuery<UserProfile>({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch profile");
      return res.json();
    },
    enabled: !!token,
  });

  // Auto-sync social providers: if Supabase identity exists but Prisma profile is missing xId/discordId,
  // call /auth/social/sync to populate the local DB. Runs once when profile is first loaded.
  useEffect(() => {
    if (!token || !profile || !supabaseUser?.identities) return;

    const providerMap: Record<
      string,
      { prismaField: string | null; providerAliases: string[] }
    > = {
      x: { prismaField: profile.xId, providerAliases: ["x", "twitter"] },
      discord: { prismaField: profile.discordId, providerAliases: ["discord"] },
    };

    const toSync: string[] = [];
    for (const [provider, { prismaField, providerAliases }] of Object.entries(
      providerMap,
    )) {
      const hasIdentity = supabaseUser.identities.some((i) =>
        providerAliases.includes(i.provider),
      );
      if (hasIdentity && !prismaField) toSync.push(provider);
    }

    if (toSync.length === 0) return;

    Promise.all(
      toSync.map((provider) =>
        fetch(`${API_BASE}/auth/social/sync`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ provider }),
        }).catch(() => null),
      ),
    ).then((results) => {
      if (results.some((r) => r?.ok)) {
        queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      }
    });
  }, [profile?.xId, profile?.discordId, supabaseUser?.identities, token]);

  // Fetch wallets
  const {
    data: wallets = [],
    isLoading: walletsLoading,
    isError: walletsError,
  } = useQuery<Wallet[]>({
    queryKey: ["wallets"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/wallets`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch wallets");
      return res.json();
    },
    enabled: !!token,
  });

  // Remove wallet mutation
  const removeWallet = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE}/wallets/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message ?? "Failed to remove wallet");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
      toast.success("Wallet removed");
    },
    onError: (err: Error) => toast.error(err.message),
    onSettled: () => setWalletActionPending(""),
  });

  // Set primary wallet mutation
  const setPrimaryWallet = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE}/wallets/${id}/primary`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message ?? "Failed to set primary wallet");
      }
      return id;
    },
    onSuccess: (id) => {
      setPromotedWalletId(id);
      setTimeout(() => setPromotedWalletId(""), 1200);
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
      toast.success("Primary wallet updated");
    },
    onError: (err: Error) => toast.error(err.message),
    onSettled: () => setWalletActionPending(""),
  });

  // Link wallet mutation
  const linkWallet = useMutation({
    mutationFn: async (address: string) => {
      const res = await fetch(`${API_BASE}/wallets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ address }),
      });
      if (!res.ok) {
        const err = await res
          .json()
          .catch(() => ({ message: "Failed to link wallet" }));
        throw new Error(err.message ?? "Failed to link wallet");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
      setWalletInput("");
      toast.success("Wallet linked");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // Update profile mutation
  const updateProfile = useMutation({
    mutationFn: async (data: { displayName?: string; username?: string }) => {
      const res = await fetch(`${API_BASE}/auth/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res
          .json()
          .catch(() => ({ error: { message: "Failed to update profile" } }));
        throw new Error(err.error?.message ?? "Failed to update profile");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      setEditingField(null);
      setEditValue("");
      toast.success("Profile updated");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  function startEdit(field: "displayName" | "username") {
    setEditingField(field);
    /* cleared */ setEditValue(
      field === "displayName"
        ? (profile?.displayName ?? "")
        : (profile?.username ?? ""),
    );
  }

  function handleSaveEdit() {
    if (!editingField) return;
    const value = editValue.trim();
    if (
      editingField === "username" &&
      value &&
      !/^[a-z0-9][a-z0-9_-]{1,18}[a-z0-9]$/.test(value)
    ) {
      toast.error("3-20 chars: lowercase letters, numbers, hyphens");
      return;
    }
    updateProfile.mutate({
      [editingField]:
        value || (editingField === "displayName" ? "" : undefined),
    });
  }

  // OAuth identities from Supabase session
  const identities = supabaseUser?.identities ?? [];
  const linkedProviders = new Set(identities.map((i) => i.provider));
  // User can unlink if they have >=2 Supabase identities OR Telegram is linked (separate auth path)
  const canUnlinkOAuth = identities.length > 1 || !!profile?.telegramId;

  // Find connected identities not in LINK_PROVIDERS (e.g. GitHub after disabling)
  const linkProviderKeys = new Set(LINK_PROVIDERS.map((p) => p.key));
  const legacyIdentities = identities.filter(
    (i) => !linkProviderKeys.has(i.provider),
  );

  async function handleLinkProvider(supabaseProvider: string) {
    /* cleared */ /* cleared */ setLinkPending(supabaseProvider);
    try {
      // Store provider so callback.tsx can detect this is an identity-link flow
      localStorage.setItem("clawquest_linking_provider", supabaseProvider);
      const { error } = await supabase.auth.linkIdentity({
        provider: supabaseProvider as any,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          // Request extra Discord scopes for role verification (guilds.members.read)
          ...(supabaseProvider === "discord" && {
            scopes: "identify email guilds guilds.members.read",
          }),
        },
      });
      if (error) throw error;
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to link provider";
      toast.error(msg);
    } finally {
      setLinkPending("");
    }
  }

  async function handleUnlinkProvider(providerKey: string) {
    /* cleared */ /* cleared */ setUnlinkPending(providerKey);

    try {
      // Fetch fresh identity list from Supabase to avoid stale cached session data
      const { data: freshData, error: idError } =
        await supabase.auth.getUserIdentities();
      if (idError) throw idError;

      const freshIdentities = freshData?.identities ?? [];
      const hasTelegram = !!profile?.telegramId;

      // Lockout prevention: need at least 1 identity remaining after unlink
      if (!hasTelegram && freshIdentities.length <= 1) {
        toast.error("Cannot unlink — this is your only sign-in method.");
        return;
      }

      const identity = freshIdentities.find((i) => i.provider === providerKey);
      if (!identity) {
        toast.error("Identity not found. Please refresh and try again.");
        return;
      }

      const { error } = await supabase.auth.unlinkIdentity(identity);
      if (error) throw error;

      // Clear Prisma fields for Twitter/Discord only
      // API uses "twitter" not "x" (Supabase's key for X/Twitter)
      if (providerKey === "x" || providerKey === "discord") {
        const apiProvider = providerKey === "x" ? "twitter" : providerKey;
        const res = await fetch(`${API_BASE}/auth/social/${apiProvider}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(
            body?.error?.message ?? "Failed to clear social profile data",
          );
        }
      }

      // Refresh session so onAuthStateChange fires with updated user.identities
      await supabase.auth.refreshSession();
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      toast.success("Account unlinked");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to unlink provider";
      toast.error(msg);
    } finally {
      setUnlinkPending("");
    }
  }

  async function handleUnlinkTelegram() {
    /* cleared */ /* cleared */ // Lockout prevention: block if Telegram is the only sign-in method
    const nonTelegramIdentities = identities.filter(
      (i) => i.provider !== "telegram",
    );
    if (nonTelegramIdentities.length === 0) {
      toast.error("Cannot unlink — this is your only sign-in method.");
      return;
    }

    setUnlinkPending("telegram");
    try {
      const res = await fetch(`${API_BASE}/auth/social/telegram`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message ?? "Failed to unlink Telegram");
      }
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      toast.success("Telegram unlinked");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to unlink Telegram";
      toast.error(msg);
    } finally {
      setUnlinkPending("");
    }
  }

  async function handleXReadAccess() {
    setXAuthPending(true);
    try {
      const res = await fetch(`${API_BASE}/auth/x/authorize`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message ?? "Failed to get X authorize URL");
      }
      const { url, state, codeVerifier } = await res.json();
      localStorage.setItem("x_code_verifier", codeVerifier);
      localStorage.setItem("x_oauth_state", state);
      window.location.href = url;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to authorize X");
      setXAuthPending(false);
    }
  }

  function handleLinkWallet(e: React.FormEvent) {
    e.preventDefault();
    /* cleared */ const addr = walletInput.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) {
      toast.error("Invalid wallet address");
      return;
    }
    linkWallet.mutate(addr);
  }

  return (
    <div className="max-w-3xl mx-auto">
      <PageTitle title="Account" className="mb-4" />

      {/* Profile */}
      <div className="border border-border-2 rounded mb-6 bg-bg-base overflow-hidden">
        <div className="text-sm font-semibold px-4 py-3 border-b border-border-2 bg-bg-2 text-fg-1">
          Profile
        </div>
        <div className="px-4 py-1">
          {profileLoading ? (
            <>
              <div className="flex items-center min-h-12 py-2 text-sm">
                <span
                  className="skeleton"
                  style={{ width: "100%", height: 16 }}
                />
              </div>
              <div className="flex items-center min-h-12 py-2 text-sm border-t border-border-2">
                <span
                  className="skeleton"
                  style={{ width: "100%", height: 16 }}
                />
              </div>
              <div className="flex items-center min-h-12 py-2 text-sm border-t border-border-2">
                <span
                  className="skeleton"
                  style={{ width: "60%", height: 16 }}
                />
              </div>
            </>
          ) : profileError ? (
            <div className="text-xs text-destructive py-3 flex items-center gap-2">
              Failed to load profile.{" "}
              <Button size="sm"
                variant="outline"
                onClick={() =>
                  queryClient.invalidateQueries({ queryKey: ["auth", "me"] })
                }
              >
                Retry
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center min-h-12 py-2 text-sm gap-2">
                <span className="max-sm:hidden sm:w-34 shrink-0 font-normal text-fg-3 text-sm">
                  Display Name
                </span>
                <span className="text-fg-1 flex-1 min-w-0 max-sm:flex max-sm:flex-col">
                  {editingField === "displayName" ? (
                    <span className="flex gap-1.5 items-center flex-wrap sm:flex-wrap sm:justify-end">
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        maxLength={50}
                        placeholder="Your display name"
                        className="h-7 text-sm px-2 flex-1 min-w-0 sm:w-45 sm:flex-none border border-border-2 rounded bg-bg-base text-fg-1 outline-hidden focus:border-accent"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveEdit();
                          if (e.key === "Escape") setEditingField(null);
                        }}
                      />
                      <Button size="sm"
                        onClick={handleSaveEdit}
                        disabled={updateProfile.isPending}
                      >
                        {updateProfile.isPending ? "…" : "Save"}
                      </Button>
                      <Button size="sm"
                        variant="outline"
                        onClick={() => setEditingField(null)}
                      >
                        Cancel
                      </Button>
                    </span>
                  ) : (
                    <>
                      <span className="sm:hidden text-fg-3 text-xs">
                        Display Name
                      </span>
                      <span
                        className={cn(
                          "truncate",
                          profile?.displayName
                            ? "font-medium"
                            : "text-fg-4 font-normal",
                        )}
                      >
                        {profile?.displayName || "Not set"}
                      </span>
                    </>
                  )}
                </span>
                {editingField !== "displayName" && (
                  <Button size="sm"
                    variant="outline"
                    className="min-w-[72px] shrink-0"
                    onClick={() => startEdit("displayName")}
                  >
                    Edit
                  </Button>
                )}
              </div>
              <div className="flex items-start min-h-12 py-2 text-sm border-t border-border-2 gap-2">
                <span className="max-sm:hidden sm:w-34 shrink-0 font-normal text-fg-3 text-sm pt-0.5">
                  Username
                </span>
                <span className="text-fg-1 flex-1 min-w-0 max-sm:flex max-sm:flex-col">
                  {editingField === "username" ? (
                    <>
                      <span className="flex gap-1.5 items-center flex-wrap sm:flex-wrap sm:justify-end">
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) =>
                            setEditValue(e.target.value.toLowerCase())
                          }
                          maxLength={20}
                          placeholder="username"
                          className="h-7 text-sm px-2 flex-1 min-w-0 sm:w-45 sm:flex-none border border-border-2 rounded bg-bg-base text-fg-1 outline-hidden focus:border-accent"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveEdit();
                            if (e.key === "Escape") setEditingField(null);
                          }}
                        />
                        <Button size="sm"
                          onClick={handleSaveEdit}
                          disabled={updateProfile.isPending}
                        >
                          {updateProfile.isPending ? "…" : "Save"}
                        </Button>
                        <Button size="sm"
                          variant="outline"
                          onClick={() => setEditingField(null)}
                        >
                          Cancel
                        </Button>
                      </span>
                      <span className="block text-xs text-fg-3 mt-1 sm:text-right">
                        3-20 chars, lowercase letters, numbers, hyphens
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="sm:hidden text-fg-3 text-xs">
                        Username
                      </span>
                      <span
                        className={cn(
                          "truncate",
                          profile?.username
                            ? "font-medium"
                            : "text-fg-4 font-normal",
                        )}
                      >
                        {profile?.username ? `@${profile.username}` : "Not set"}
                      </span>
                    </>
                  )}
                </span>
                {editingField !== "username" && (
                  <Button size="sm"
                    variant="outline"
                    className="min-w-[72px] shrink-0"
                    onClick={() => startEdit("username")}
                  >
                    Edit
                  </Button>
                )}
              </div>
              <div className="flex items-center min-h-12 py-2 text-sm border-t border-border-2 gap-2">
                <span className="max-sm:hidden sm:w-34 shrink-0 font-normal text-fg-3 text-sm">
                  Email
                </span>
                <span className="text-fg-1 flex-1 min-w-0 max-sm:flex max-sm:flex-col">
                  <span className="sm:hidden text-fg-3 text-xs">Email</span>
                  <span
                    className={cn(
                      "truncate",
                      profile?.email &&
                        !profile.email.match(/^tg_\d+@tg\.clawquest\.ai$/)
                        ? "font-medium"
                        : "text-fg-4 font-normal",
                    )}
                  >
                    {profile?.email?.match(/^tg_\d+@tg\.clawquest\.ai$/)
                      ? "No email linked"
                      : (profile?.email ?? supabaseUser?.email ?? "—")}
                  </span>
                </span>
              </div>
              <div className="flex items-center min-h-12 py-2 text-sm border-t border-border-2 gap-2">
                <span className="max-sm:hidden sm:w-34 shrink-0 font-normal text-fg-3 text-sm">
                  Member since
                </span>
                <span className="text-fg-1 flex-1 min-w-0 max-sm:flex max-sm:flex-col">
                  <span className="sm:hidden text-fg-3 text-xs">
                    Member since
                  </span>
                  <span className="font-medium">
                    {profile?.createdAt ? formatDate(profile.createdAt) : "—"}
                  </span>
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Connected Accounts */}
      <div className="border border-border-2 rounded mb-6 bg-bg-base overflow-hidden">
        <div className="text-sm font-semibold px-4 py-3 border-b border-border-2 bg-bg-2 text-fg-1">
          Connected Accounts
        </div>
        <div className="px-4 py-1">
          {LINK_PROVIDERS.map((p, idx) => {
            const identity = identities.find((i) => i.provider === p.key);
            const isLinked = linkedProviders.has(p.key);
            const isTelegram = p.key === "telegram";
            const telegramLinked = isTelegram && !!profile?.telegramId;

            // Build handle/email detail text
            let detail = "";
            if (p.key === "x" && profile?.xHandle)
              detail = `@${profile.xHandle}`;
            else if (p.key === "discord" && profile?.discordHandle)
              detail = `@${profile.discordHandle}`;
            else if (identity?.identity_data?.email)
              detail = identity.identity_data.email as string;
            else if (identity?.identity_data?.user_name)
              detail = identity.identity_data.user_name as string;

            return (
              <div
                key={p.key}
                className={`flex items-center gap-3 min-h-8 py-2 text-sm min-w-0${idx > 0 ? " border-t border-border-2" : ""}`}
              >
                <span className="w-5 flex items-center justify-center shrink-0">
                  <PlatformIcon
                    name={p.key as "google" | "telegram" | "x" | "discord"}
                    size={16}
                  />
                </span>
                {/* Mobile: stacked label + value */}
                {(() => {
                  const linked = isTelegram ? telegramLinked : isLinked;
                  const text = isTelegram
                    ? telegramLinked
                      ? profile?.telegramUsername
                        ? `@${profile.telegramUsername}`
                        : "Linked"
                      : null
                    : isLinked
                      ? detail || "Linked"
                      : null;
                  return (
                    <>
                      <span className="sm:hidden flex-1 flex flex-col min-w-0">
                        <span className="text-fg-3 text-xs">{p.label}</span>
                        <span
                          className={cn(
                            "truncate",
                            linked
                              ? "font-medium text-fg-1"
                              : "text-fg-4 font-normal",
                          )}
                        >
                          {text || "Not linked"}
                        </span>
                      </span>
                      <span className="max-sm:hidden font-normal text-fg-3 sm:w-26 shrink-0">
                        {p.label}
                      </span>
                      <span
                        className={cn(
                          "flex-1 text-sm max-sm:hidden",
                          linked
                            ? "font-medium text-fg-1"
                            : "text-fg-4 font-normal",
                        )}
                      >
                        {text || "Not linked"}
                      </span>
                    </>
                  );
                })()}

                {/* Action buttons */}
                {isTelegram ? (
                  telegramLinked ? (
                    <Button size="sm"
                      variant="outline"
                      className="min-w-[72px]"
                      disabled={unlinkPending === "telegram"}
                      onClick={() => handleUnlinkTelegram()}
                    >
                      {unlinkPending === "telegram" ? "Unlinking…" : "Unlink"}
                    </Button>
                  ) : (
                    <Button size="sm"
                      className="min-w-[72px]"
                      onClick={() => startTelegramLogin("link")}
                    >
                      Link
                    </Button>
                  )
                ) : isLinked ? (
                  <span className="flex items-center gap-2">
                    {p.key === "x" && profile?.xId && !profile?.hasXToken && (
                      <Button size="sm"
                        variant="outline"
                        disabled={xAuthPending}
                        onClick={handleXReadAccess}
                      >
                        {xAuthPending ? "Redirecting…" : "Authorize"}
                      </Button>
                    )}
                    <Button size="sm"
                      variant="outline"
                      className="min-w-[72px]"
                      disabled={!canUnlinkOAuth || unlinkPending === p.key}
                      onClick={() => handleUnlinkProvider(p.key)}
                    >
                      {unlinkPending === p.key ? "Unlinking…" : "Unlink"}
                    </Button>
                  </span>
                ) : (
                  <Button size="sm"
                    className="min-w-[72px]"
                    disabled={linkPending === p.supabaseProvider}
                    onClick={() => handleLinkProvider(p.supabaseProvider!)}
                  >
                    {linkPending === p.supabaseProvider ? "Linking…" : "Link"}
                  </Button>
                )}
              </div>
            );
          })}

          {/* Legacy connected identities (providers removed from LINK_PROVIDERS but still in Supabase) */}
          {legacyIdentities.map((identity) => {
            const info = PROVIDER_LABELS[identity.provider] ?? {
              label: identity.provider,
              icon: "?",
            };
            const detail =
              (identity.identity_data?.email as string) ||
              (identity.identity_data?.user_name as string) ||
              "";
            return (
              <div
                key={identity.id}
                className="flex items-center gap-3 min-h-8 py-2 text-sm min-w-0 opacity-70 border-t border-border-2"
              >
                <span className="w-5 text-center text-sm shrink-0">
                  {info.icon}
                </span>
                <span className="font-normal text-fg-3 sm:w-26">
                  {info.label}
                </span>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {detail && (
                    <span className="text-fg-1 text-sm font-medium">
                      {detail}
                    </span>
                  )}
                </div>
                <Button size="sm"
                  variant="outline"
                  className="min-w-[72px]"
                  disabled={
                    !canUnlinkOAuth || unlinkPending === identity.provider
                  }
                  onClick={() => handleUnlinkProvider(identity.provider)}
                >
                  {unlinkPending === identity.provider
                    ? "Unlinking…"
                    : "Unlink"}
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {/* GitHub for Bounties */}
      <div className="border border-border-2 rounded mb-6 bg-bg-base overflow-hidden">
        <div className="px-4 py-3 border-b border-border-2 bg-bg-2">
          <div className="text-sm font-semibold text-fg-1">
            GitHub for Bounties
          </div>
          <p className="text-xs text-fg-3 mt-0.5">
            Required to submit PRs for GitHub bounties.
          </p>
        </div>
        <div className="px-4 py-1">
          <div className="flex items-center gap-3 text-sm py-2">
            <span className="w-5 flex items-center justify-center shrink-0">
              <GitHubIcon size={16} />
            </span>
            {/* Mobile: stacked */}
            <span className="sm:hidden flex-1 flex flex-col min-w-0">
              <span className="text-fg-3 text-xs">GitHub</span>
              <span
                className={cn(
                  "truncate",
                  profile?.githubHandle
                    ? "font-medium text-fg-1"
                    : "text-fg-4 font-normal",
                )}
              >
                {profile?.githubHandle
                  ? `@${profile.githubHandle}`
                  : "Not linked"}
              </span>
            </span>
            {/* Desktop */}
            <span className="max-sm:hidden font-normal text-fg-3 sm:w-26 shrink-0">
              GitHub
            </span>
            <span
              className={cn(
                "flex-1 text-sm max-sm:hidden",
                profile?.githubHandle
                  ? "font-medium text-fg-1"
                  : "text-fg-4 font-normal",
              )}
            >
              {profile?.githubHandle
                ? `@${profile.githubHandle}`
                : "Not linked"}
            </span>
            {profile?.githubHandle ? (
              <>
                <Button size="sm"
                  variant="outline"
                  className="min-w-[72px]"
                  onClick={async () => {
                    try {
                      const res = await fetch(
                        `${API_BASE}/auth/social/github`,
                        {
                          method: "DELETE",
                          headers: { Authorization: `Bearer ${token}` },
                        },
                      );
                      if (!res.ok) throw new Error("Failed to unlink GitHub");
                      queryClient.invalidateQueries({
                        queryKey: ["auth", "me"],
                      });
                      toast.success("GitHub unlinked");
                    } catch {
                      toast.error("Failed to unlink GitHub");
                    }
                  }}
                >
                  Unlink
                </Button>
              </>
            ) : (
              <Button size="sm"
                  className="min-w-[72px]"
                  onClick={() => {
                    const state = crypto.randomUUID();
                    sessionStorage.setItem("github_oauth_state", state);
                    sessionStorage.setItem(
                      "github_oauth_return_to",
                      "/account",
                    );
                    window.location.href = `${API_BASE}/auth/github/authorize?scope=read:user&state=${state}`;
                  }}
                >
                  Link
                </Button>
            )}
          </div>
        </div>
      </div>

      {/* Wallets */}
      <div className="border border-border-2 rounded mb-6 bg-bg-base overflow-hidden">
        <div className="px-4 py-3 border-b border-border-2 bg-bg-2">
          <div className="text-sm font-semibold text-fg-1">Wallets</div>
          <p className="text-xs text-fg-3 mt-1">
            EVM addresses for receiving rewards. Supports&nbsp;
            <strong>Ethereum, Base, Optimism, and Arbitrum</strong>.
          </p>
        </div>
        <div className="px-4 py-3">
          <div className="flex flex-col gap-2">
            {walletsLoading ? (
              <div className="flex items-center min-h-12 py-2 text-sm">
                <span
                  className="skeleton"
                  style={{ width: "100%", height: 16 }}
                />
              </div>
            ) : walletsError ? (
              <div className="text-xs text-destructive py-3 flex items-center gap-2">
                Failed to load wallets.{" "}
                <Button size="sm"
                  variant="outline"
                  onClick={() =>
                    queryClient.invalidateQueries({ queryKey: ["wallets"] })
                  }
                >
                  Retry
                </Button>
              </div>
            ) : wallets.length === 0 ? null : (
              wallets.map((w) => (
                <div
                  key={w.id}
                  className={cn(
                    "flex items-center gap-3 py-2 px-3 text-sm bg-bg-2 border border-border-2 rounded",
                    promotedWalletId === w.id && "animate-promoted",
                  )}
                >
                  <span className="text-xs text-fg-1 font-mono font-medium">
                    {shortenAddress(w.address)}
                  </span>
                  {w.chainId && (
                    <span className="text-xs text-fg-3">
                      {CHAIN_NAMES[w.chainId] ?? `Chain ${w.chainId}`}
                    </span>
                  )}
                  {w.isPrimary && (
                    <Badge variant="outline-primary" size="sm">
                      Primary
                    </Badge>
                  )}
                  <div className="ml-auto flex items-center gap-2">
                    {!w.isPrimary && (
                      <Button size="sm"
                        variant="outline"
                        disabled={walletActionPending === w.id}
                        onClick={() => {
                          setWalletActionPending(w.id);
                          setPrimaryWallet.mutate(w.id);
                        }}
                      >
                        {setPrimaryWallet.isPending &&
                        walletActionPending === w.id
                          ? "Setting…"
                          : "Set primary"}
                      </Button>
                    )}
                    <Button size="sm"
                      variant="outline"
                      className="min-w-[76px]"
                      disabled={walletActionPending === w.id}
                      onClick={() => {
                        setWalletActionPending(w.id);
                        removeWallet.mutate(w.id);
                      }}
                    >
                      {removeWallet.isPending && walletActionPending === w.id
                        ? "…"
                        : "Remove"}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
          <form
            className={cn(
              "flex gap-2 items-center",
              wallets.length > 0 && "mt-4 pt-4 border-t border-border-2",
            )}
            onSubmit={handleLinkWallet}
          >
            <label htmlFor="wallet-address" className="sr-only">
              Wallet address
            </label>
            <Input
              id="wallet-address"
              name="wallet-address"
              type="text"
              placeholder="0x..."
              autoComplete="off"
              className="flex-1 font-mono h-7 text-xs"
              value={walletInput}
              onChange={(e) => setWalletInput(e.target.value)}
            />
            <Button size="sm" type="submit" disabled={linkWallet.isPending}>
              {linkWallet.isPending ? "Linking\u2026" : "Link wallet"}
            </Button>
          </form>
        </div>
      </div>

      {/* Fiat Payout */}
      <FiatPayoutSection />
    </div>
  );
}

// ─── Fiat Payout Section ─────────────────────────────────────────────────────

function FiatPayoutSection() {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <>
      <div className="border border-border-2 rounded mb-6 bg-bg-base overflow-hidden">
        <div className="px-4 py-3 border-b border-border-2 bg-bg-2">
          <div className="text-sm font-semibold text-fg-1">Fiat Payout</div>
          <p className="text-xs text-fg-3 mt-0.5">
            Coming soon — receive quest rewards via Stripe.
          </p>
        </div>
        <div className="px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-fg-3">
            Stripe Connect integration is under development.
          </span>
          <Button size="sm"
            variant="outline"
            className="min-w-[72px]"
            onClick={() => setShowDetails(true)}
          >
            More info
          </Button>
        </div>
      </div>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-xl p-8">
          <DialogClose className="absolute top-4 right-4 text-fg-3 hover:text-fg-1 transition-colors">
            <CloseLine size={20} />
          </DialogClose>
          {/* Stripe logo */}
          <svg
            width="60"
            height="25"
            viewBox="0 0 60 25"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="mb-4"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M60 12.9C60 8.63 57.97 5.22 54.07 5.22C50.15 5.22 47.78 8.63 47.78 12.87C47.78 17.87 50.55 20.48 54.53 20.48C56.48 20.48 57.97 20.01 59.1 19.34V16.07C57.97 16.67 56.67 17.03 55.03 17.03C53.42 17.03 52 16.47 51.82 14.53H59.97C59.97 14.32 60 13.38 60 12.9ZM51.75 11.6C51.75 9.74 52.82 8.93 54.05 8.93C55.25 8.93 56.27 9.74 56.27 11.6H51.75ZM41.38 5.22C39.75 5.22 38.7 5.99 38.12 6.52L37.92 5.48H34.55V24.65L38.2 23.88L38.22 19.38C38.82 19.82 39.7 20.48 41.35 20.48C44.72 20.48 47.78 17.67 47.78 12.72C47.75 8.18 44.67 5.22 41.38 5.22ZM40.55 16.9C39.42 16.9 38.75 16.5 38.22 15.98L38.2 9.92C38.75 9.34 39.45 8.97 40.55 8.97C42.35 8.97 43.6 10.93 43.6 12.92C43.6 14.97 42.37 16.9 40.55 16.9ZM29.18 4.2L32.85 3.42V0.08L29.18 0.83V4.2ZM29.18 5.48H32.85V20.18H29.18V5.48ZM25.25 6.72L25.02 5.48H21.73V20.18H25.38V9.68C26.25 8.55 27.72 8.77 28.18 8.93V5.48C27.7 5.3 25.95 4.97 25.25 6.72ZM17.88 1.63L14.3 2.38L14.28 16.27C14.28 18.6 16.05 20.5 18.38 20.5C19.65 20.5 20.58 20.27 21.1 19.98V16.63C20.6 16.83 17.85 17.65 17.85 15.32V9.12H21.1V5.48H17.85L17.88 1.63ZM5.1 9.92C5.1 9.3 5.6 9.05 6.45 9.05C7.68 9.05 9.22 9.42 10.45 10.1V6.6C9.1 6.05 7.78 5.82 6.45 5.82C2.9 5.82 0.55 7.72 0.55 10.72C0.55 15.35 7.1 14.63 7.1 16.63C7.1 17.37 6.48 17.62 5.57 17.62C4.22 17.62 2.5 17.07 1.12 16.3V19.85C2.65 20.5 4.2 20.78 5.57 20.78C9.2 20.78 11.7 18.93 11.7 15.9C11.67 10.88 5.1 11.75 5.1 9.92Z"
              fill="#635BFF"
            />
          </svg>

          <DialogHeader align="left" className="border-none px-0 py-0">
            <DialogTitle className="text-lg font-semibold text-fg-1 flex items-center gap-2">
              Stripe Payout Account
              <Badge variant="outline-warning" size="sm">
                Coming Soon
              </Badge>
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-fg-3 mt-1 mb-5">
            Connect your Stripe account to receive fiat rewards from quests.
          </p>

          {/* Info */}
          <div className="px-4 py-3 border border-border-2 bg-bg-2">
            <h4 className="text-sm font-semibold text-fg-1 mb-2">
              How it works
            </h4>
            <p className="text-xs text-fg-3 leading-relaxed mb-2">
              When you win a fiat-funded quest, the reward is automatically
              transferred to your Stripe account. From there, Stripe pays out to
              your bank account on a rolling basis (typically 2-7 business
              days).
            </p>
            <p className="text-xs text-fg-3 leading-relaxed">
              Stripe handles identity verification and tax compliance. Your
              information is securely managed by Stripe — ClawQuest never sees
              your bank details.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
