import { Badge } from "@/components/ui/badge";

const badgeStyles: Record<string, string> = {
    draft: 'bg-[var(--badge-gray-bg)] text-[var(--badge-gray-text)] border-transparent',
    live: 'bg-[var(--badge-green-bg)] text-[var(--badge-green-text)] border-transparent',
    scheduled: 'bg-[var(--badge-blue-bg)] text-[var(--badge-blue-text)] border-transparent',
    completed: 'bg-[var(--badge-emerald-bg)] text-[var(--badge-emerald-text)] border-transparent',
    expired: 'bg-[var(--badge-orange-bg)] text-[var(--badge-orange-text)] border-transparent',
    cancelled: 'bg-[var(--badge-red-bg)] text-[var(--badge-red-text)] border-transparent',
    // Funding
    unfunded: 'bg-[var(--badge-gray-bg)] text-[var(--badge-gray-text)] border-transparent',
    pending: 'bg-[var(--badge-yellow-bg)] text-[var(--badge-yellow-text)] border-transparent',
    confirmed: 'bg-[var(--badge-green-bg)] text-[var(--badge-green-text)] border-transparent',
    refunded: 'bg-[var(--badge-purple-bg)] text-[var(--badge-purple-text)] border-transparent',
    // User roles
    admin: 'bg-[var(--badge-indigo-bg)] text-[var(--badge-indigo-text)] border-transparent',
    user: 'bg-[var(--badge-gray-bg)] text-[var(--badge-gray-text)] border-transparent',
    // Quest types
    FCFS: 'bg-[var(--badge-cyan-bg)] text-[var(--badge-cyan-text)] border-transparent',
    LEADERBOARD: 'bg-[var(--badge-amber-bg)] text-[var(--badge-amber-text)] border-transparent',
    LUCKY_DRAW: 'bg-[var(--badge-pink-bg)] text-[var(--badge-pink-text)] border-transparent',
    // Participation
    in_progress: 'bg-[var(--badge-blue-bg)] text-[var(--badge-blue-text)] border-transparent',
    submitted: 'bg-[var(--badge-yellow-bg)] text-[var(--badge-yellow-text)] border-transparent',
    failed: 'bg-[var(--badge-red-bg)] text-[var(--badge-red-text)] border-transparent',
    // Payout
    paid: 'bg-[var(--badge-green-bg)] text-[var(--badge-green-text)] border-transparent',
    na: 'bg-[var(--badge-gray-bg)] text-[var(--badge-gray-text)] border-transparent',
};

export function StatusBadge({ status }: { status: string }) {
    const cls = badgeStyles[status] ?? 'bg-[var(--badge-gray-bg)] text-[var(--badge-gray-text)] border-transparent';
    return (
        <Badge variant="outline" className={`font-semibold px-2.5 py-0.5 border-0 ${cls}`}>
            {status.replace(/_/g, ' ')}
        </Badge>
    );
}
