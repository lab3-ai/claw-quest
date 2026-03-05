import type { SVGProps } from "react"

type IconProps = SVGProps<SVGSVGElement>

const defaultProps: IconProps = {
    xmlns: "http://www.w3.org/2000/svg",
    width: 24,
    height: 24,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
}

export const XIcon = (props: IconProps) => (
    <svg {...defaultProps} {...props}>
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
    </svg>
)

export const CheckIcon = (props: IconProps) => (
    <svg {...defaultProps} {...props}>
        <path d="M20 6 9 17l-5-5" />
    </svg>
)

export const ChevronDownIcon = (props: IconProps) => (
    <svg {...defaultProps} {...props}>
        <path d="m6 9 6 6 6-6" />
    </svg>
)

export const ChevronUpIcon = (props: IconProps) => (
    <svg {...defaultProps} {...props}>
        <path d="m18 15-6-6-6 6" />
    </svg>
)

export const ChevronRightIcon = (props: IconProps) => (
    <svg {...defaultProps} {...props}>
        <path d="m9 18 6-6-6-6" />
    </svg>
)

export const CircleIcon = (props: IconProps) => (
    <svg {...defaultProps} {...props}>
        <circle cx="12" cy="12" r="10" />
    </svg>
)

export const CircleCheckIcon = (props: IconProps) => (
    <svg {...defaultProps} {...props}>
        <circle cx="12" cy="12" r="10" />
        <path d="m9 12 2 2 4-4" />
    </svg>
)

export const InfoIcon = (props: IconProps) => (
    <svg {...defaultProps} {...props}>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4" />
        <path d="M12 8h.01" />
    </svg>
)

export const TriangleAlertIcon = (props: IconProps) => (
    <svg {...defaultProps} {...props}>
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
    </svg>
)

export const OctagonXIcon = (props: IconProps) => (
    <svg {...defaultProps} {...props}>
        <path d="M2.586 16.726A2 2 0 0 1 1.504 15.52L3.572 7.656a2 2 0 0 1 .37-1.782L9.046.537A2 2 0 0 1 10.604 0h2.792a2 2 0 0 1 1.558.537l5.104 5.337a2 2 0 0 1 .37 1.782l-2.068 7.864a2 2 0 0 1-1.082 1.206" />
        <path d="m15 9-6 6" />
        <path d="m9 9 6 6" />
    </svg>
)

export const LoaderCircleIcon = (props: IconProps) => (
    <svg {...defaultProps} {...props}>
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
)
