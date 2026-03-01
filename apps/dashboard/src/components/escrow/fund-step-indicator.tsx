import type { FundStep } from '@/components/escrow/fund-types'

interface FundStepIndicatorProps {
    step: FundStep
    isNative: boolean
}

export function FundStepIndicator({ step, isNative }: FundStepIndicatorProps) {
    const afterApprove: FundStep[] = ['deposit', 'confirming', 'success']
    const afterDeposit: FundStep[] = ['confirming', 'success']

    return (
        <div className="fund-steps">
            <div className={`fund-step ${step === 'connect' ? '' : 'done'}`}>
                <span className="fund-step-num">1</span>
                <span>Connect</span>
            </div>
            {!isNative && (
                <div className={`fund-step ${step === 'approve' ? 'active' : afterApprove.includes(step) ? 'done' : ''}`}>
                    <span className="fund-step-num">2</span>
                    <span>Approve</span>
                </div>
            )}
            <div className={`fund-step ${step === 'deposit' ? 'active' : afterDeposit.includes(step) ? 'done' : ''}`}>
                <span className="fund-step-num">{isNative ? 2 : 3}</span>
                <span>Deposit</span>
            </div>
            <div className={`fund-step ${step === 'confirming' ? 'active' : step === 'success' ? 'done' : ''}`}>
                <span className="fund-step-num">{isNative ? 3 : 4}</span>
                <span>Confirm</span>
            </div>
        </div>
    )
}
