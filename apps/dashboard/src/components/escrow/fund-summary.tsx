import type { DepositParams } from '@/components/escrow/fund-types'

interface FundSummaryProps {
    params: DepositParams
}

export function FundSummary({ params }: FundSummaryProps) {
    return (
        <div className="bg-muted/50 border border-border rounded p-4 px-5 mb-6">
            <div className="flex justify-between items-center py-2 text-xs text-muted-foreground">
                <span>Amount</span>
                <span className="font-semibold text-sm text-foreground">{params.amount} {params.tokenSymbol}</span>
            </div>
            <div className="flex justify-between items-center py-2 text-xs text-muted-foreground border-t border-border">
                <span>Network</span>
                <span>{params.chainName}</span>
            </div>
            <div className="flex justify-between items-center py-2 text-xs text-muted-foreground border-t border-border">
                <span>Contract</span>
                <span className="font-mono text-xs text-accent cursor-help" title={params.contractAddress}>
                    {params.contractAddress.slice(0, 6)}...{params.contractAddress.slice(-4)}
                </span>
            </div>
            {params.expiresAt > 0 && (
                <div className="flex justify-between items-center py-2 text-xs text-muted-foreground border-t border-border">
                    <span>Expires</span>
                    <span>{new Date(params.expiresAt * 1000).toLocaleDateString()}</span>
                </div>
            )}
        </div>
    )
}
