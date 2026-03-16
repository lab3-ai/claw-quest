import { Outlet, useRouterState } from "@tanstack/react-router"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

export function PublicLayout() {
    const pathname = useRouterState({ select: s => s.location.pathname })

    return (
        <div className="flex min-h-screen flex-col pb-[49px] lg:pb-0">
            <Navbar />

            <div key={pathname} className="max-w-6xl mx-auto w-full py-5 px-4 md:px-6 flex-1 page-fade-in">
                <Outlet />
            </div>

            <Footer />
        </div>
    )
}
