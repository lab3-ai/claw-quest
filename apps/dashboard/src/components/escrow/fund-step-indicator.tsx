import { cn } from '@/lib/utils'
import type { FundStep } from '@/components/escrow/fund-types'

interface FundStepIndicatorProps {
    step: FundStep
    isNative: boolean
}

export function FundStepIndicator({ step, isNative }: FundStepIndicatorProps) {
    const afterApprove: FundStep[] = ['deposit', 'confirming', 'success']
    const afterDeposit: FundStep[] = ['confirming', 'success']

    return (
        <div className="flex justify-center gap-4 mb-8 max-sm:gap-2 max-sm:flex-wrap">
            <div className={cn(
                'flex items-center gap-1.5 text-xs text-muted-foreground opacity-50 transition-all',
                step !== 'connect' && 'opacity-100! text-accent!'
            )}>
                <span className={cn(
                    'inline-flex items-center justify-center size-[22px] rounded-full border-2 border-current text-xs font-semibold',
                    step !== 'connect' && 'bg-success! border-success! text-primary-foreground!'
                )}>1</span>
                <span>Connect</span>
            </div>
            {!isNative && (
                <div className={cn(
                    'flex items-center gap-1.5 text-xs text-muted-foreground opacity-50 transition-all',
                    step === 'approve' && 'opacity-100! text-accent! font-semibold!',
                    afterApprove.includes(step) && 'opacity-100! text-accent!'
                )}>
                    <span className={cn(
                        'inline-flex items-center justify-center size-[22px] rounded-full border-2 border-current text-xs font-semibold',
                        step === 'approve' && 'bg-accent! border-accent! text-accent-foreground!',
                        afterApprove.includes(step) && 'bg-success! border-success! text-primary-foreground!'
                    )}>2</span>
                    <span>Approve</span>
                </div>
            )}
            <div className={cn(
                'flex items-center gap-1.5 text-xs text-muted-foreground opacity-50 transition-all',
                step === 'deposit' && 'opacity-100! text-accent! font-semibold!',
                afterDeposit.includes(step) && 'opacity-100! text-accent!'
            )}>
                <span className={cn(
                    'inline-flex items-center justify-center size-[22px] rounded-full border-2 border-current text-xs font-semibold',
                    step === 'deposit' && 'bg-accent! border-accent! text-accent-foreground!',
                    afterDeposit.includes(step) && 'bg-success! border-success! text-primary-foreground!'
                )}>{isNative ? 2 : 3}</span>
                <span>Deposit</span>
            </div>
            <div className={cn(
                'flex items-center gap-1.5 text-xs text-muted-foreground opacity-50 transition-all',
                step === 'confirming' && 'opacity-100! text-accent! font-semibold!',
                step === 'success' && 'opacity-100! text-accent!'
            )}>
                <span className={cn(
                    'inline-flex items-center justify-center size-[22px] rounded-full border-2 border-current text-xs font-semibold',
                    step === 'confirming' && 'bg-accent! border-accent! text-accent-foreground!',
                    step === 'success' && 'bg-success! border-success! text-primary-foreground!'
                )}>{isNative ? 3 : 4}</span>
                <span>Confirm</span>
            </div>
        </div>
    )
}
