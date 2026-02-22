import { Outlet, Navigate, Link } from "@tanstack/react-router"
import { useAuth } from "@/context/AuthContext"
import { useState, useEffect, useRef } from "react"

export function AuthenticatedLayout() {
    const { isAuthenticated, isLoading, logout, user } = useAuth()
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

    if (isLoading) {
        return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>Loading...</div>
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" />
    }

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
                        <Link to="/dashboard">Dashboard</Link>
                        <div className="user-menu" ref={menuRef}>
                            <button className="user-menu-btn" onClick={() => setMenuOpen(v => !v)}>
                                @{handle} ▾
                            </button>
                            {menuOpen && (
                                <div className="user-dropdown">
                                    <a href="#">Profile</a>
                                    <a href="#">Settings</a>
                                    <a className="logout" onClick={() => logout()} style={{ cursor: "pointer" }}>Log out</a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="page-container">
                <Outlet />
            </div>

            <div className="footer">
                <span>ClawQuest v0.1 beta</span>
                <a href="#">API Docs</a>
                <a href="#">Telegram Bot</a>
                <a href="#">OpenClaw</a>
            </div>
        </div>
    )
}
