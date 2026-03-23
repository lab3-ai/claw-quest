import { CheckFill, InformationFill, AlertFill, CloseCircleFill, Loading3Fill } from "@mingcute/react"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
    return (
        <Sonner
            className="toaster group"
            icons={{
                success: <CheckFill size={20} />,
                info: <InformationFill size={20} />,
                warning: <AlertFill size={20} />,
                error: <CloseCircleFill size={20} />,
                loading: <Loading3Fill size={20} className="animate-spin" />,
            }}
            toastOptions={{
                classNames: {
                    toast: "group toast group-[.toaster]:bg-bg-1 group-[.toaster]:text-fg-1 group-[.toaster]:border-border-2 group-[.toaster]:shadow-md group-[.toaster]:font-sans group-[.toaster]:text-sm group-[.toaster]:!px-4 group-[.toaster]:!py-3 group-[.toaster]:!rounded-md",
                    description: "group-[.toast]:text-fg-3 group-[.toast]:text-xs",
                    actionButton:
                        "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
                    cancelButton:
                        "group-[.toast]:bg-bg-3 group-[.toast]:text-fg-3",
                    success: "group-[.toaster]:!text-success group-[.toaster]:!border-success/30",
                    error: "group-[.toaster]:!text-error group-[.toaster]:!border-error/30",
                    warning: "group-[.toaster]:!text-warning group-[.toaster]:!border-warning/30",
                    info: "group-[.toaster]:!text-info group-[.toaster]:!border-info/30",
                },
            }}
            {...props}
        />
    )
}

export { Toaster }
