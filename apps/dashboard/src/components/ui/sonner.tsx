import {
    CircleCheckIcon,
    InfoIcon,
    LoaderCircleIcon,
    OctagonXIcon,
    TriangleAlertIcon,
} from "@/components/ui/icons"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
    return (
        <Sonner
            className="toaster group"
            icons={{
                success: <CircleCheckIcon className="h-4 w-4" />,
                info: <InfoIcon className="h-4 w-4" />,
                warning: <TriangleAlertIcon className="h-4 w-4" />,
                error: <OctagonXIcon className="h-4 w-4" />,
                loading: <LoaderCircleIcon className="h-4 w-4 animate-spin" />,
            }}
            toastOptions={{
                classNames: {
                    toast: "group toast group-[.toaster]:bg-bg-base group-[.toaster]:text-fg-1 group-[.toaster]:border-border-2 group-[.toaster]:shadow-lg",
                    description: "group-[.toast]:text-fg-3",
                    actionButton:
                        "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
                    cancelButton:
                        "group-[.toast]:bg-bg-3 group-[.toast]:text-fg-3",
                },
            }}
            {...props}
        />
    )
}

export { Toaster }
