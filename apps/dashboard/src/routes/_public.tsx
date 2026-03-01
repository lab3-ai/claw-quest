import { Outlet, Link } from "@tanstack/react-router"
import { useAuth } from "@/context/AuthContext"
import { useState, useEffect, useRef } from "react"

export function PublicLayout() {
    const { isAuthenticated, logout, user } = useAuth()
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

    const handle = user?.email?.split("@")[0] ?? "user"

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
                        {isAuthenticated ? (
                            <>
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
                            </>
                        ) : (
                            <Link to="/login" className="btn btn-primary" style={{ padding: "6px 14px", fontSize: "13px" }}>
                                Log in
                            </Link>
                        )}
                    </div>
                </div>
            </div>
            {mobileOpen && (
                <div className="topbar-mobile-nav open">
                    <Link to="/quests" onClick={() => setMobileOpen(false)}>Quests</Link>
                    {isAuthenticated ? (
                        <>
                            <Link to="/dashboard" onClick={() => setMobileOpen(false)}>Dashboard</Link>
                            <Link to="/account" onClick={() => setMobileOpen(false)}>Account</Link>
                            <button className="logout" onClick={() => { logout(); setMobileOpen(false) }}>Log out</button>
                        </>
                    ) : (
                        <Link to="/login" onClick={() => setMobileOpen(false)}>Log in</Link>
                    )}
                </div>
            )}

            <div className="page-container">
                <Outlet />
            </div>

            <div className="footer">
                <span>ClawQuest v0.1 beta</span>
                <a href="/privacy.html">Privacy</a>
                <a href="/terms.html">Terms</a>
                <a href="https://api.clawquest.ai/docs" target="_blank" rel="noopener noreferrer">API Docs</a>
                <a href="https://t.me/ClawQuest_aibot" target="_blank" rel="noopener noreferrer">Telegram Bot</a>
            </div>
        </div>
    )
}
