import { Link } from '@tanstack/react-router'
import type { DepositParams } from '@/components/escrow/fund-types'
import { TxLink } from '@/components/escrow/tx-link'
import { Button } from '@/components/ui/button'

function InsufficientBalanceWarning({ tokenSymbol, questId }: { tokenSymbol: string; questId: string }) {
    return (
        <div className="text-xs text-destructive bg-destructive/10 border border-destructive rounded p-2 px-3 mb-3">
            Insufficient {tokenSymbol} balance to fund this quest.
            <Link to="/quests/$questId/edit" params={{ questId }} className="block mt-1.5 text-primary font-medium underline">
                Edit reward amount
            </Link>
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
    questId,
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
            {hasInsufficientBalance && (
                <InsufficientBalanceWarning tokenSymbol={params.tokenSymbol} questId={questId} />
            )}
            <p>Approve {params.tokenSymbol} spending</p>
            <Button
                className="w-full"
                onClick={onApprove}
                disabled={approveLoading || hasInsufficientBalance}
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
    questId,
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
            {hasInsufficientBalance && (
                <InsufficientBalanceWarning tokenSymbol={params.tokenSymbol} questId={questId} />
            )}
            <p>Deposit {params.amount} {params.tokenSymbol} to escrow</p>
            <Button
                className="w-full"
                onClick={onDeposit}
                disabled={depositLoading || hasInsufficientBalance}
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
