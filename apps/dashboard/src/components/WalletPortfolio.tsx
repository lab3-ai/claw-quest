import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

// ─── Types ──────────────────────────────────────────────────────────────────

interface PortfolioToken {
  symbol: string;
  chainName: string;
  balance: string;
  valueUsd: string;
  logoUrl: string | null;
}

interface PortfolioData {
  totalValueUsd: string;
  tokens: PortfolioToken[];
}

interface PortfolioResponse {
  data: PortfolioData | null;
  error?: string;
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const USE_MOCK = false;

const MOCK_PORTFOLIO: PortfolioData = {
  totalValueUsd: "12847.53",
  tokens: [
    {
      symbol: "ETH",
      chainName: "Ethereum",
      balance: "2.4521",
      valueUsd: "8234.18",
      logoUrl: null,
    },
    {
      symbol: "USDC",
      chainName: "Ethereum",
      balance: "2150.00",
      valueUsd: "2150.00",
      logoUrl: null,
    },
    {
      symbol: "SOL",
      chainName: "Solana",
      balance: "12.385",
      valueUsd: "1489.22",
      logoUrl: null,
    },
    {
      symbol: "MATIC",
      chainName: "Polygon",
      balance: "1250.00",
      valueUsd: "562.50",
      logoUrl: null,
    },
    {
      symbol: "ARB",
      chainName: "Arbitrum",
      balance: "320.75",
      valueUsd: "243.77",
      logoUrl: null,
    },
    {
      symbol: "USDT",
      chainName: "BSC",
      balance: "167.86",
      valueUsd: "167.86",
      logoUrl: null,
    },
  ],
};

// ─── Fetcher ────────────────────────────────────────────────────────────────

async function fetchPortfolio(address: string): Promise<PortfolioData | null> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 600));
    return MOCK_PORTFOLIO;
  }

  const res = await fetch(
    `${API_BASE}/onchain/wallet-portfolio?address=${encodeURIComponent(address)}`,
  );
  if (!res.ok) return null;

  const json: PortfolioResponse = await res.json();
  return json.data;
}

// ─── Component ──────────────────────────────────────────────────────────────

interface WalletPortfolioProps {
  walletAddress: string | null;
}

export function WalletPortfolio({ walletAddress }: WalletPortfolioProps) {
  const { data: portfolio, isLoading } = useQuery({
    queryKey: ["walletPortfolio", walletAddress],
    queryFn: () => fetchPortfolio(walletAddress!),
    enabled: !!walletAddress,
    staleTime: 5 * 60_000,
    retry: 1,
  });

  // No wallet address
  if (!walletAddress) {
    return (
      <div className="p-5 border border-border-1 bg-bg-1">
        <h3 className="text-sm font-semibold text-fg-1 mb-4">
          Cross-Chain Portfolio
        </h3>
        <p className="text-xs text-fg-3">
          Enter a wallet address to view portfolio
        </p>
      </div>
    );
  }

  // Loading
  if (isLoading) {
    return (
      <div className="border border-border-2 bg-bg-1">
        {/* Header skeleton */}
        <div className="flex flex-col px-6 py-4 border-b border-border-2">
          <div className="flex justify-between mb-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3.5 w-24" />
          </div>
          <Skeleton className="h-8 w-36" />
        </div>
        {/* Token row skeletons */}
        <div className="flex flex-col gap-2 px-6 pb-4 py-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-1.5">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex flex-col gap-1">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-3 w-12" />
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-14" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // API failed or no data
  if (!portfolio) return null;

  return (
    <div className="border border-border-2 bg-bg-1">
      <div className="flex flex-col mb-2 px-6 py-4 border-b border-border-2">
        <div className="flex justify-between mb-2">
          <h3 className="text-sm font-semibold text-fg-1">
            Cross-Chain Portfolio
          </h3>
          <span className="flex items-center gap-1.5 text-xs text-fg-3">
            via
            <img
              src="https://web3.okx.com/cdn/assets/imgs/254/3A44C9825F1EB924.png"
              alt="OKX"
              className="h-3.5 invert dark:invert-0"
            />
            OnchainOS
          </span>
        </div>
        {/* Total value */}
        <p className="text-2xl font-semibold text-fg-1">
          $
          {parseFloat(portfolio.totalValueUsd).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </p>
      </div>

      {/* Top tokens */}
      {portfolio.tokens.length > 0 && (
        <div className="flex flex-col gap-2 px-6 pb-4 py-2 ">
          {portfolio.tokens.map((token, i) => (
            <div
              key={`${token.symbol}-${token.chainName}-${i}`}
              className="flex items-center justify-between py-1.5"
            >
              <div className="flex items-center gap-3 min-w-0">
                {token.logoUrl ? (
                  <img
                    src={token.logoUrl}
                    alt={token.symbol}
                    className="w-10 h-10 rounded-full shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-bg-3 shrink-0 flex items-center justify-center text-[9px] font-semibold text-fg-3">
                    {token.symbol.charAt(0)}
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="text-base text-fg-1 font-semibold truncate">
                    {token.symbol}
                  </span>
                  <span className="text-xs text-fg-3">{token.chainName}</span>
                </div>
              </div>
              <div className="text-right shrink-0 ml-2">
                <p className="text-base font-medium text-fg-1">
                  $
                  {parseFloat(token.valueUsd).toLocaleString(undefined, {
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
  );
}
