// Maps known contract custom error names to user-friendly messages

const CONTRACT_ERRORS: Record<string, string> = {
    QuestAlreadyFunded: 'This quest has already been funded.',
    TokenNotAllowed: 'This token is not allowed by the escrow contract.',
    ZeroAmount: 'Deposit amount must be greater than zero.',
    QuestNotFound: 'Quest not found in the escrow contract.',
    QuestCancelled: 'This quest has been cancelled.',
    InsufficientFunds: 'Insufficient funds in escrow for this operation.',
    NothingToRefund: 'There is nothing to refund for this quest.',
    NotSponsor: 'Only the quest sponsor can perform this action.',
    NoExpiry: 'Quest has no expiry set.',
    GracePeriodNotElapsed: 'The grace period has not elapsed yet.',
    AlreadyWithdrawn: 'Funds have already been withdrawn.',
    NativeTransferFailed: 'Native token transfer failed.',
}

/**
 * Decode a wagmi/viem contract error into a human-readable message.
 * Handles: user rejection, custom contract errors, generic revert reasons.
 */
export function decodeContractError(error: Error | null | undefined): string {
    if (!error) return 'An unknown error occurred.'

    const msg = error.message ?? ''

    // User rejected in wallet
    if (msg.includes('User rejected') || msg.includes('user rejected') || msg.includes('4001')) {
        return 'Transaction rejected by user.'
    }

    // Insufficient funds for gas (wallet-level)
    if (msg.includes('insufficient funds for gas')) {
        return 'Insufficient funds for gas. Please add ETH to your wallet.'
    }

    // Scan for known custom error names in the message
    for (const [errorName, friendlyMsg] of Object.entries(CONTRACT_ERRORS)) {
        if (msg.includes(errorName)) {
            return friendlyMsg
        }
    }

    // viem often includes "reason:" in revert messages
    const reasonMatch = msg.match(/reason:\s*(.+?)(?:\n|$)/i)
    if (reasonMatch) return reasonMatch[1].trim()

    // Execution reverted with no reason
    if (msg.includes('execution reverted')) {
        return 'Transaction reverted by contract. Check that the quest is not already funded and the token is allowed.'
    }

    // Fallback: truncate long messages
    return msg.length > 120 ? `${msg.slice(0, 120)}...` : msg
}
