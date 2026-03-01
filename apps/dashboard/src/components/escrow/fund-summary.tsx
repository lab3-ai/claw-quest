import type { DepositParams } from '@/components/escrow/fund-types'

interface FundSummaryProps {
    params: DepositParams
}

export function FundSummary({ params }: FundSummaryProps) {
    return (
        <div className="fund-summary">
            <div className="fund-summary-row">
                <span>Amount</span>
                <span className="fund-amount">{params.amount} {params.tokenSymbol}</span>
            </div>
            <div className="fund-summary-row">
                <span>Network</span>
                <span>{params.chainName}</span>
            </div>
            <div className="fund-summary-row">
                <span>Contract</span>
                <span className="fund-address" title={params.contractAddress}>
                    {params.contractAddress.slice(0, 6)}...{params.contractAddress.slice(-4)}
                </span>
            </div>
            {params.expiresAt > 0 && (
                <div className="fund-summary-row">
                    <span>Expires</span>
                    <span>{new Date(params.expiresAt * 1000).toLocaleDateString()}</span>
                </div>
            )}
        </div>
    )
}
