import { Outlet, Link } from "@tanstack/react-router"
import { useAuth } from "@/context/AuthContext"
import { useState, useEffect, useRef } from "react"

export function PublicLayout() {
    const { isAuthenticated, logout, user } = useAuth()
    const [menuOpen, setMenuOpen] = useState(false)
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
                    <div className="topbar-right">
                        {isAuthenticated ? (
                            <>
                                <Link to="/dashboard">Dashboard</Link>
                                <div className="user-menu" ref={menuRef}>
                                    <button className="user-menu-btn" onClick={() => setMenuOpen(v => !v)}>
                                        @{handle} ▾
                                    </button>
                                    {menuOpen && (
                                        <div className="user-dropdown visible">
                                            <a href="#">Profile</a>
                                            <a href="#">Settings</a>
                                            <a className="logout" onClick={() => logout()} style={{ cursor: "pointer" }}>Log out</a>
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
