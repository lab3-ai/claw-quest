import { Outlet } from "@tanstack/react-router"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

export function PublicLayout() {
    return (
        <div className="flex min-h-screen flex-col pb-[49px] lg:pb-0">
            <Navbar />

            <div className="max-w-6xl mx-auto w-full py-5 px-6 flex-1">
                <Outlet />
            </div>

            <Footer />
        </div>
    )
}
