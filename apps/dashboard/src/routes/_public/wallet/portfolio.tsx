import { useCallback, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WalletPortfolio } from "@/components/WalletPortfolio";
import { Search2Fill, TimeLine, CloseLine } from "@mingcute/react";

// ─── Component ──────────────────────────────────────────────────────────────

interface WalletPortfolioPageProps {
  address?: string;
}

export function WalletPortfolioPage({
  address: initialAddress,
}: WalletPortfolioPageProps) {
  const [inputValue, setInputValue] = useState(initialAddress ?? "");
  const [activeAddress, setActiveAddress] = useState(initialAddress ?? "");
  const [history, setHistory] = useState<string[]>([]);

  const addToHistory = useCallback((addr: string) => {
    setHistory((prev) => {
      const filtered = prev.filter((a) => a !== addr);
      return [addr, ...filtered].slice(0, 10);
    });
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (trimmed) {
      setActiveAddress(trimmed);
      addToHistory(trimmed);
    }
  }

  function handleHistoryClick(addr: string) {
    setInputValue(addr);
    setActiveAddress(addr);
    addToHistory(addr);
  }

  function handleHistoryRemove(addr: string) {
    setHistory((prev) => prev.filter((a) => a !== addr));
  }

  return (
    <div className="max-w-3xl mx-auto lg:bg-bg-1 lg:border lg:border-border-2 p-4 sm:p-6 lg:px-10 lg:py-8">
      <PageTitle
        title="Wallet Portfolio"
        className="py-0"
        description="View cross-chain portfolio for any wallet address via OKX OnchainOS"
      />

      {/* Search bar */}
      <form onSubmit={handleSubmit} className="flex gap-2 mt-4">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Enter wallet address (0x...)"
          className="flex-1 font-mono"
        />
        <Button type="submit" size="lg" disabled={!inputValue.trim()}>
          <Search2Fill size={16} className="mr-1.5" />
          Lookup
        </Button>
      </form>

      {/* Search history */}
      {history.length > 0 && (
        <div className="mt-4 mb-6">
          <div className="flex items-center gap-1.5 mb-2">
            <TimeLine size={14} className="text-fg-3" />
            <span className="text-xs font-normal uppercase tracking-wide text-fg-3">
              Recent Search
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {history.map((addr) => (
              <button
                key={addr}
                type="button"
                onClick={() => handleHistoryClick(addr)}
                className="group flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 text-xs font-mono text-fg-2 bg-fg-1/10 rounded-button hover:bg-fg-1/20 hover:text-fg-1 transition-colors"
              >
                <span className="truncate max-w-[120px]">{addr}</span>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleHistoryRemove(addr);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.stopPropagation();
                      handleHistoryRemove(addr);
                    }
                  }}
                  className="text-fg-3 hover:text-fg-1 transition-colors"
                >
                  <CloseLine size={12} />
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Portfolio result */}
      {activeAddress ? (
        <div className="w-full">
          <WalletPortfolio walletAddress={activeAddress} />
        </div>
      ) : (
        <div className="text-center text-fg-3 hidden">
          <p className="text-sm">
            Enter a wallet address to view its cross-chain portfolio
          </p>
        </div>
      )}
    </div>
  );
}
