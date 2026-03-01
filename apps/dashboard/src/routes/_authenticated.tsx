import { Outlet, Navigate, Link } from "@tanstack/react-router"
import { useAuth } from "@/context/AuthContext"
import { useState, useEffect, useRef } from "react"

export function AuthenticatedLayout() {
    const { isAuthenticated, isLoading, logout, user } = useAuth()
    const [menuOpen, setMenuOpen] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false)
            }
        }
        document.addEventListener("mousedown", handler)
        return () => document.removeEventListener("mousedown", handler)
    }, [])

    if (isLoading) {
        return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>Loading...</div>
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" />
    }

    const handle = (user as any)?.username ?? user?.email?.split("@")[0] ?? "user"

    return (
        <div>
            <div className="topbar">
                <div className="topbar-inner">
                    <Link to="/quests" className="topbar-logo">
                        Claw<span>Quest</span>
                    </Link>
                    <div className="topbar-nav">
                        <Link to="/quests">Quests</Link>
                    </div>
                    <button
                        className="topbar-hamburger"
                        onClick={() => setMobileOpen(v => !v)}
                        aria-label="Menu"
                        aria-expanded={mobileOpen}
                    >
                        {mobileOpen ? "\u2715" : "\u2630"}
                    </button>
                    <div className="topbar-right">
                        <Link to="/dashboard">Dashboard</Link>
                        <div className="user-menu" ref={menuRef}>
                            <button
                                className="user-menu-btn"
                                onClick={() => setMenuOpen(v => !v)}
                                aria-expanded={menuOpen}
                                aria-haspopup="menu"
                            >
                                @{handle} ▾
                            </button>
                            {menuOpen && (
                                <div className="user-dropdown visible" role="menu">
                                    <Link to="/account" role="menuitem" onClick={() => setMenuOpen(false)}>Account</Link>
                                    <button className="logout" role="menuitem" onClick={() => logout()}>Log out</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            {mobileOpen && (
                <div className="topbar-mobile-nav open">
                    <Link to="/quests" onClick={() => setMobileOpen(false)}>Quests</Link>
                    <Link to="/dashboard" onClick={() => setMobileOpen(false)}>Dashboard</Link>
                    <Link to="/account" onClick={() => setMobileOpen(false)}>Account</Link>
                    <button className="logout" onClick={() => { logout(); setMobileOpen(false) }}>Log out</button>
                </div>
            )}

            <div className="page-container">
                <Outlet />
            </div>

            <div className="footer">
                <span>ClawQuest v0.1 beta</span>
                <a href="https://api.clawquest.ai/docs" target="_blank" rel="noopener noreferrer">API Docs</a>
                <a href="https://t.me/ClawQuest_aibot" target="_blank" rel="noopener noreferrer">Telegram Bot</a>
                <a href="https://openclaw.ai" target="_blank" rel="noopener noreferrer">OpenClaw</a>
            </div>
        </div>
    )
}
