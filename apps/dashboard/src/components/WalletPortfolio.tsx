import { useQuery } from "@tanstack/react-query"
import { Skeleton } from "@/components/ui/skeleton"

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000"

// ─── Types ──────────────────────────────────────────────────────────────────

interface PortfolioToken {
    symbol: string
    chainName: string
    balance: string
    valueUsd: string
    logoUrl: string | null
}

interface PortfolioData {
    totalValueUsd: string
    tokens: PortfolioToken[]
}

interface PortfolioResponse {
    data: PortfolioData | null
    error?: string
}

// ─── Fetcher ────────────────────────────────────────────────────────────────

async function fetchPortfolio(address: string): Promise<PortfolioData | null> {
    const res = await fetch(
        `${API_BASE}/onchain/wallet-portfolio?address=${encodeURIComponent(address)}`,
    )
    if (!res.ok) return null

    const json: PortfolioResponse = await res.json()
    return json.data
}

// ─── Component ──────────────────────────────────────────────────────────────

interface WalletPortfolioProps {
    walletAddress: string | null
}

export function WalletPortfolio({ walletAddress }: WalletPortfolioProps) {
    const { data: portfolio, isLoading } = useQuery({
        queryKey: ["walletPortfolio", walletAddress],
        queryFn: () => fetchPortfolio(walletAddress!),
        enabled: !!walletAddress,
        staleTime: 5 * 60_000,
        retry: 1,
    })

    // No wallet address
    if (!walletAddress) {
        return (
            <div className="p-5 border border-border-1 bg-bg-1">
                <h3 className="text-sm font-semibold text-fg-1 mb-2">
                    Cross-Chain Portfolio
                </h3>
                <p className="text-xs text-fg-3">
                    Enter a wallet address to view portfolio
                </p>
            </div>
        )
    }

    // Loading
    if (isLoading) {
        return (
            <div className="p-5 border border-border-1 bg-bg-1">
                <h3 className="text-sm font-semibold text-fg-1 mb-3">
                    Cross-Chain Portfolio
                </h3>
                <Skeleton className="h-8 w-24 mb-3" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
            </div>
        )
    }

    // API failed or no data
    if (!portfolio) return null

    return (
        <div className="p-5 border border-border-1 bg-bg-1 hover:bg-bg-2 transition-colors">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-fg-1">
                    Cross-Chain Portfolio
                </h3>
                <span className="text-xs text-fg-3">
                    via OKX OnchainOS
                </span>
            </div>

            {/* Total value */}
            <p className="text-2xl font-bold text-fg-1 mb-4">
                ${parseFloat(portfolio.totalValueUsd).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                })}
            </p>

            {/* Top tokens */}
            {portfolio.tokens.length > 0 && (
                <div className="flex flex-col gap-2">
                    {portfolio.tokens.map((token, i) => (
                        <div
                            key={`${token.symbol}-${token.chainName}-${i}`}
                            className="flex items-center justify-between py-1.5"
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                {token.logoUrl ? (
                                    <img
                                        src={token.logoUrl}
                                        alt={token.symbol}
                                        className="w-5 h-5 rounded-full shrink-0"
                                    />
                                ) : (
                                    <div className="w-5 h-5 rounded-full bg-bg-3 shrink-0" />
                                )}
                                <span className="text-sm text-fg-1 font-medium truncate">
                                    {token.symbol}
                                </span>
                                <span className="text-xs text-fg-3">
                                    {token.chainName}
                                </span>
                            </div>
                            <div className="text-right shrink-0 ml-2">
                                <p className="text-sm font-medium text-fg-1">
                                    ${parseFloat(token.valueUsd).toLocaleString(undefined, {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                    })}
                                </p>
                                <p className="text-xs text-fg-3">
                                    {parseFloat(token.balance).toLocaleString(undefined, {
                                        maximumFractionDigits: 6,
                                    })}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
