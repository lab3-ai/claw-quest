import { Link } from '@tanstack/react-router'
import { TxLink } from '@/components/escrow/tx-link'

interface FundSuccessProps {
    questId: string
    chainId: number
    txHash?: string
}

export function FundSuccess({ questId, chainId, txHash }: FundSuccessProps) {
    return (
        <div className="fund-success">
            <div className="fund-success-icon">&#10003;</div>
            <h3>Quest Funded!</h3>
            <p>Your quest is now live and accepting participants.</p>
            {txHash && <TxLink chainId={chainId} txHash={txHash} />}
            <Link to="/quests/$questId" params={{ questId }} className="btn btn-primary">
                View Quest
            </Link>
        </div>
    )
}
