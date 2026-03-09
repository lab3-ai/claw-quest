import { cn } from "@/lib/utils"
import {
    InformationLine,
    AlertLine,
    CheckLine,
    CloseCircleLine,
} from "@mingcute/react"

type MessageVariant = "info" | "warning" | "success" | "error"

interface InlineMessageProps {
    variant?: MessageVariant
    children: React.ReactNode
    className?: string
}

const config: Record<
    MessageVariant,
    { icon: typeof InformationLine; border: string; bg: string; text: string }
> = {
    info: {
        icon: InformationLine,
        border: "border-neutral-600",
        bg: "bg-neutral-800/60",
        text: "text-neutral-300",
    },
    warning: {
        icon: AlertLine,
        border: "border-yellow-600/50",
        bg: "bg-yellow-950/40",
        text: "text-yellow-400",
    },
    success: {
        icon: CheckLine,
        border: "border-green-600/50",
        bg: "bg-green-950/40",
        text: "text-green-400",
    },
    error: {
        icon: CloseCircleLine,
        border: "border-red-600/50",
        bg: "bg-red-950/40",
        text: "text-red-400",
    },
}

export function InlineMessage({
    variant = "info",
    children,
    className,
}: InlineMessageProps) {
    const { icon: Icon, border, bg, text } = config[variant]

    return (
        <div
            className={cn(
                "flex items-center gap-2 rounded border px-3 py-2 text-xs font-mono",
                border,
                bg,
                text,
                className,
            )}
        >
            <Icon size={16} className="shrink-0" />
            <span>{children}</span>
        </div>
    )
}
