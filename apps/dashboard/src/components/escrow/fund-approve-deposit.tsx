import { Link } from '@tanstack/react-router'
import type { DepositParams } from '@/components/escrow/fund-types'
import { TxLink } from '@/components/escrow/tx-link'

function InsufficientBalanceWarning({ tokenSymbol, questId }: { tokenSymbol: string; questId: string }) {
    return (
        <div className="fund-insufficient-warning">
            Insufficient {tokenSymbol} balance to fund this quest.
            <Link to="/quests/$questId/manage" params={{ questId }} className="fund-edit-link">
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
                <p className="fund-balance-info">
                    Balance: {walletBalance} {params.tokenSymbol}
                </p>
            )}
            {hasInsufficientBalance && (
                <InsufficientBalanceWarning tokenSymbol={params.tokenSymbol} questId={questId} />
            )}
            <p>Approve {params.tokenSymbol} spending</p>
            <button
                className="btn btn-primary fund-btn"
                onClick={onApprove}
                disabled={approveLoading || hasInsufficientBalance}
            >
                {approveLoading ? 'Approving...' : `Approve ${params.amount} ${params.tokenSymbol}`}
            </button>
            {approveTxHash && !approveConfirmed && (
                <p className="fund-tx-status">Waiting for confirmation...</p>
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
                <p className="fund-balance-info">
                    Balance: {walletBalance} {params.tokenSymbol}
                </p>
            )}
            {hasInsufficientBalance && (
                <InsufficientBalanceWarning tokenSymbol={params.tokenSymbol} questId={questId} />
            )}
            <p>Deposit {params.amount} {params.tokenSymbol} to escrow</p>
            <button
                className="btn btn-primary fund-btn"
                onClick={onDeposit}
                disabled={depositLoading || hasInsufficientBalance}
            >
                {depositLoading ? 'Depositing...' : `Deposit ${params.amount} ${params.tokenSymbol}`}
            </button>
            {depositTxHash && !depositConfirmed && (
                <p className="fund-tx-status">Waiting for confirmation...</p>
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
        <div className="fund-confirming">
            <div className="fund-spinner" />
            <p>Deposit confirmed on-chain! Waiting for backend to detect...</p>
            {depositTxHash && <TxLink chainId={chainId} txHash={depositTxHash} />}
        </div>
    )
}
