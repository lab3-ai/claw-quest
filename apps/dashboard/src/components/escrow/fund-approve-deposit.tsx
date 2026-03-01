import type { DepositParams } from '@/components/escrow/fund-types'
import { TxLink } from '@/components/escrow/tx-link'

interface FundApproveProps {
    params: DepositParams
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
                <p className="fund-balance-info">
                    Balance: {walletBalance} {params.tokenSymbol}
                </p>
            )}
            {hasInsufficientBalance && (
                <div className="fund-insufficient-warning">
                    Insufficient {params.tokenSymbol} balance to fund this quest.
                </div>
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
                <p className="fund-balance-info">
                    Balance: {walletBalance} {params.tokenSymbol}
                </p>
            )}
            {hasInsufficientBalance && (
                <div className="fund-insufficient-warning">
                    Insufficient {params.tokenSymbol} balance to fund this quest.
                </div>
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
