import  tailwindcssAnimate from "tailwindcss-animate";
/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ["class"],
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                /* === shadcn/ui required tokens === */
                background: "var(--bg)",
                foreground: "var(--fg)",
                card: {
                    DEFAULT: "var(--bg)",
                    foreground: "var(--fg)",
                },
                popover: {
                    DEFAULT: "var(--bg)",
                    foreground: "var(--fg)",
                },
                primary: {
                    DEFAULT: "var(--primary)",
                    foreground: "var(--primary-fg)",
                },
                secondary: {
                    DEFAULT: "var(--bg-muted)",
                    foreground: "var(--fg)",
                },
                muted: {
                    DEFAULT: "var(--bg-muted)",
                    foreground: "var(--fg-muted)",
                },
                destructive: {
                    DEFAULT: "var(--error)",
                    foreground: "var(--accent-fg)",
                },
                input: "var(--border)",
                ring: "var(--accent)",

                /* === ClawQuest design tokens === */
                bg: {
                    DEFAULT: "var(--bg)",
                    subtle: "var(--bg-subtle)",
                    muted: "var(--bg-muted)",
                },
                fg: {
                    DEFAULT: "var(--fg)",
                    secondary: "var(--fg-secondary)",
                    muted: "var(--fg-muted)",
                },
                border: {
                    DEFAULT: "var(--border)",
                    heavy: "var(--border-heavy)",
                    strong: "var(--border-strong)",
                },
                accent: {
                    DEFAULT: "var(--accent)",
                    hover: "var(--accent-hover)",
                    light: "var(--accent-light)",
                    border: "var(--accent-border)",
                    foreground: "var(--accent-fg)",
                },
                success: {
                    DEFAULT: "var(--success)",
                    light: "var(--success-light)",
                    border: "var(--success-border)",
                },
                error: {
                    DEFAULT: "var(--error)",
                    light: "var(--error-light)",
                    border: "var(--error-border)",
                },
                warning: {
                    DEFAULT: "var(--warning)",
                    light: "var(--warning-light)",
                    border: "var(--warning-border)",
                },
                info: {
                    DEFAULT: "var(--info)",
                    light: "var(--info-light)",
                },
                human: {
                    DEFAULT: "var(--human-fg)",
                    bg: "var(--human-bg)",
                    border: "var(--human-border)",
                },
                agent: {
                    DEFAULT: "var(--agent-fg)",
                    bg: "var(--agent-bg)",
                    border: "var(--agent-border)",
                },
                skill: {
                    DEFAULT: "var(--skill-fg)",
                    bg: "var(--skill-bg)",
                    border: "var(--skill-border)",
                },
                link: "var(--link)",
                /* Dark surface utility */
                surface: {
                    dark: "var(--surface-dark)",
                    "dark-subtle": "var(--surface-dark-subtle)",
                    "dark-fg": "var(--surface-dark-fg)",
                    "dark-muted": "var(--surface-dark-muted)",
                },
            },
            fontFamily: {
                sans: ["Geist Mono", "ui-monospace", "Cascadia Mono", "Fira Code", "Consolas", "monospace"],
                heading: ["Geist Mono", "ui-monospace", "Cascadia Mono", "monospace"],
                mono: ["Geist Mono", "ui-monospace", "Cascadia Mono", "Fira Code", "Consolas", "monospace"],
            },
            fontSize: {
                xs: "var(--text-xs)",
                sm: "var(--text-sm)",
                base: "var(--text-base)",
                md: "var(--text-md)",
                lg: "var(--text-lg)",
                xl: "var(--text-xl)",
                "2xl": "var(--text-2xl)",
                "3xl": "var(--text-3xl)",
            },
            borderRadius: {
                DEFAULT: "var(--radius-base)",
                sm: "var(--radius-sm)",
                md: "var(--radius-md)",
                lg: "var(--radius-lg)",
                xl: "var(--radius-xl)",
                full: "var(--radius-full)",
                button: "var(--radius-button)",
            },
            boxShadow: {
                xs: "var(--shadow-xs)",
                sm: "var(--shadow-sm)",
                md: "var(--shadow-md)",
                lg: "var(--shadow-lg)",
                accent: "var(--shadow-accent)",
            },
            spacing: {
                1: "var(--space-1)",
                2: "var(--space-2)",
                3: "var(--space-3)",
                4: "var(--space-4)",
                5: "var(--space-5)",
                6: "var(--space-6)",
                8: "var(--space-8)",
                10: "var(--space-10)",
                12: "var(--space-12)",
                16: "var(--space-16)",
            },
            zIndex: {
                dropdown: "var(--z-dropdown)",
                sticky: "var(--z-sticky)",
                overlay: "var(--z-overlay)",
                modal: "var(--z-modal)",
                toast: "var(--z-toast)",
            },
            transitionDuration: {
                fast: "var(--duration-fast)",
                base: "var(--duration-base)",
                slow: "var(--duration-slow)",
            },
        },
    },
    plugins: [tailwindcssAnimate],
}
