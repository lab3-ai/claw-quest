import type { DepositParams } from '@/components/escrow/fund-types'

interface FundSummaryProps {
    params: DepositParams
}

export function FundSummary({ params }: FundSummaryProps) {
    return (
        <div className="bg-bg-3/50 border border-border-2 rounded p-4 px-5 mb-6">
            <div className="flex justify-between items-center py-2 text-xs text-fg-3">
                <span>Amount</span>
                <span className="font-semibold text-sm text-fg-1">{params.amount} {params.tokenSymbol}</span>
            </div>
            <div className="flex justify-between items-center py-2 text-xs text-fg-3 border-t border-border-2">
                <span>Network</span>
                <span>{params.chainName}</span>
            </div>
            <div className="flex justify-between items-center py-2 text-xs text-fg-3 border-t border-border-2">
                <span>Contract</span>
                <span className="font-mono text-xs text-accent cursor-help" title={params.contractAddress}>
                    {params.contractAddress.slice(0, 6)}...{params.contractAddress.slice(-4)}
                </span>
            </div>
            {params.expiresAt > 0 && (
                <div className="flex justify-between items-center py-2 text-xs text-fg-3 border-t border-border-2">
                    <span>Expires</span>
                    <span>{new Date(params.expiresAt * 1000).toLocaleDateString()}</span>
                </div>
            )}
        </div>
    )
}
