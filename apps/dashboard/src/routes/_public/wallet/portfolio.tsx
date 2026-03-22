import { useState } from "react"
import { PageTitle } from "@/components/page-title"
import { Button } from "@/components/ui/button"
import { WalletPortfolio } from "@/components/WalletPortfolio"
import { Search2Fill } from "@mingcute/react"

// ─── Component ──────────────────────────────────────────────────────────────

interface WalletPortfolioPageProps {
    address?: string
}

export function WalletPortfolioPage({ address: initialAddress }: WalletPortfolioPageProps) {
    const [inputValue, setInputValue] = useState(initialAddress ?? "")
    const [activeAddress, setActiveAddress] = useState(initialAddress ?? "")

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        const trimmed = inputValue.trim()
        if (trimmed) setActiveAddress(trimmed)
    }

    return (
        <div>
            <PageTitle
                title="Wallet Portfolio"
                description="View cross-chain portfolio for any wallet address via OKX OnchainOS"
            />

            {/* Search bar */}
            <form onSubmit={handleSubmit} className="flex gap-2 mt-4 mb-6">
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Enter wallet address (0x...)"
                    className="flex-1 px-3 py-2 text-sm border border-border-2 bg-bg-base text-fg-1 placeholder:text-fg-3 focus:outline-none focus:ring-1 focus:ring-accent"
                />
                <Button type="submit" disabled={!inputValue.trim()}>
                    <Search2Fill size={16} className="mr-1.5" />
                    Lookup
                </Button>
            </form>

            {/* Portfolio result */}
            {activeAddress ? (
                <div className="max-w-md">
                    <WalletPortfolio walletAddress={activeAddress} />
                </div>
            ) : (
                <div className="text-center py-16 text-fg-3">
                    <p className="text-sm">Enter a wallet address to view its cross-chain portfolio</p>
                </div>
            )}
        </div>
    )
}
