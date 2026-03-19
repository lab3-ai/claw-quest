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
    if (!url) return <p className="font-mono text-xs text-fg-3">Tx: {short}</p>
    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-accent no-underline px-2 py-1 border border-border-2 rounded bg-bg-3/50 hover:border-accent transition-colors font-mono text-xs"
        >
            Tx: {short} &#x2197;
        </a>
    )
}
