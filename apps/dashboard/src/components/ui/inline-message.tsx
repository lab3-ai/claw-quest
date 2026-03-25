import { cn } from "@/lib/utils"
import {
    InformationFill,
    AlertFill,
    CheckFill,
    CloseCircleFill,
} from "@mingcute/react"

type MessageVariant = "info" | "warning" | "success" | "error"

interface InlineMessageProps {
    variant?: MessageVariant
    children: React.ReactNode
    className?: string
}

const config: Record<
    MessageVariant,
    { icon: typeof InformationFill; border: string; bg: string; text: string }
> = {
    info: {
        icon: InformationFill,
        border: "border-border-2",
        bg: "bg-bg-3/60",
        text: "text-fg-3",
    },
    warning: {
        icon: AlertFill,
        border: "border-warning/50",
        bg: "bg-warning-light",
        text: "text-warning",
    },
    success: {
        icon: CheckFill,
        border: "border-success/50",
        bg: "bg-success-light",
        text: "text-success",
    },
    error: {
        icon: CloseCircleFill,
        border: "border-error/50",
        bg: "bg-error-light",
        text: "text-error",
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
