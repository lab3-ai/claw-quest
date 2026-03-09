import { Link } from '@tanstack/react-router'
import { TxLink } from '@/components/escrow/tx-link'
import { Button } from '@/components/ui/button'

interface FundSuccessProps {
    questId: string
    chainId: number
    txHash?: string
}

export function FundSuccess({ questId, chainId, txHash }: FundSuccessProps) {
    return (
        <div className="flex flex-col items-center gap-3">
            <div className="flex items-center justify-center size-12 rounded-full bg-success text-primary-foreground text-xl font-semibold">&#10003;</div>
            <h3 className="text-foreground text-base font-semibold">Quest Funded!</h3>
            <p>Your quest is now live and accepting participants.</p>
            {txHash && <TxLink chainId={chainId} txHash={txHash} />}
            <Button asChild>
                <Link to="/quests/$questId" params={{ questId }}>View Quest</Link>
            </Button>
        </div>
    )
}
