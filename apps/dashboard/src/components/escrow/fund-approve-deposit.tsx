import type { DepositParams } from '@/components/escrow/fund-types'
import { TxLink } from '@/components/escrow/tx-link'
import { Button } from '@/components/ui/button'

function PartialFundingBanner({ tokenSymbol, walletBalance }: { tokenSymbol: string; walletBalance: string }) {
    const balanceNum = parseFloat(walletBalance)
    const isEmpty = balanceNum === 0

    return (
        <div className="text-xs text-fg-muted bg-muted/50 border border-border rounded p-2 px-3 mb-3">
            {isEmpty
                ? `Your wallet has 0 ${tokenSymbol}. Deposit more funds or invite a partner.`
                : `You have ${walletBalance} ${tokenSymbol}. You can deposit a partial amount — invite partners for the rest.`
            }
        </div>
    )
}

interface FundApproveProps {
    params: DepositParams
    questId: string
    approveLoading: boolean
    approveTxHash?: string
    approveConfirmed: boolean
    walletBalance?: string
    hasInsufficientBalance: boolean
    onApprove: () => void
}

export function FundApprove({
    params,
    approveLoading,
    approveTxHash,
    approveConfirmed,
    walletBalance,
    hasInsufficientBalance,
    onApprove,
}: FundApproveProps) {
    return (
        <div>
            {walletBalance !== undefined && (
                <p className="text-xs text-muted-foreground mb-2">
                    Balance: {walletBalance} {params.tokenSymbol}
                </p>
            )}
            {hasInsufficientBalance && walletBalance !== undefined && (
                <PartialFundingBanner tokenSymbol={params.tokenSymbol} walletBalance={walletBalance} />
            )}
            <p>Approve {params.tokenSymbol} spending</p>
            <Button
                className="w-full"
                onClick={onApprove}
                disabled={approveLoading}
            >
                {approveLoading ? 'Approving...' : `Approve ${params.amount} ${params.tokenSymbol}`}
            </Button>
            {approveTxHash && !approveConfirmed && (
                <p className="text-xs text-muted-foreground mt-3">Waiting for confirmation...</p>
            )}
        </div>
    )
}

interface FundDepositProps {
    params: DepositParams
    questId: string
    depositLoading: boolean
    depositTxHash?: string
    depositConfirmed: boolean
    walletBalance?: string
    hasInsufficientBalance: boolean
    onDeposit: () => void
}

export function FundDeposit({
    params,
    depositLoading,
    depositTxHash,
    depositConfirmed,
    walletBalance,
    hasInsufficientBalance,
    onDeposit,
}: FundDepositProps) {
    return (
        <div>
            {walletBalance !== undefined && (
                <p className="text-xs text-muted-foreground mb-2">
                    Balance: {walletBalance} {params.tokenSymbol}
                </p>
            )}
            {hasInsufficientBalance && walletBalance !== undefined && (
                <PartialFundingBanner tokenSymbol={params.tokenSymbol} walletBalance={walletBalance} />
            )}
            <p>Deposit {params.amount} {params.tokenSymbol} to escrow</p>
            <Button
                className="w-full"
                onClick={onDeposit}
                disabled={depositLoading}
            >
                {depositLoading ? 'Depositing...' : `Deposit ${params.amount} ${params.tokenSymbol}`}
            </Button>
            {depositTxHash && !depositConfirmed && (
                <p className="text-xs text-muted-foreground mt-3">Waiting for confirmation...</p>
            )}
        </div>
    )
}

interface FundConfirmingProps {
    chainId: number
    depositTxHash?: string
}

export function FundConfirming({ chainId, depositTxHash }: FundConfirmingProps) {
    return (
        <div className="flex flex-col items-center gap-3">
            <div className="size-8 border-[3px] border-border border-t-accent rounded-full animate-spin" />
            <p>Deposit confirmed on-chain! Waiting for backend to detect...</p>
            {depositTxHash && <TxLink chainId={chainId} txHash={depositTxHash} />}
        </div>
    )
}
