import { Outlet } from '@tanstack/react-router';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export function AppLayout() {
    return (
        <div className="flex min-h-screen bg-background text-foreground">
            <Sidebar />
            <div className="flex-1 flex flex-col ml-0 sm:ml-56 min-h-screen border-l border-border/50">
                <TopBar />
                <main className="flex-1 p-3 sm:p-6 md:p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
