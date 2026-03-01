import { getChainById } from '@clawquest/shared'

function getExplorerTxUrl(chainId: number, txHash: string): string | null {
    const chain = getChainById(chainId)
    if (!chain) return null
    return `${chain.explorerUrl}/tx/${txHash}`
}

interface TxLinkProps {
    chainId: number
    txHash: string
}

export function TxLink({ chainId, txHash }: TxLinkProps) {
    const url = getExplorerTxUrl(chainId, txHash)
    const short = `${txHash.slice(0, 10)}...${txHash.slice(-8)}`
    if (!url) return <p className="fund-tx-hash">Tx: {short}</p>
    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="fund-tx-hash fund-tx-link"
        >
            Tx: {short} &#x2197;
        </a>
    )
}
