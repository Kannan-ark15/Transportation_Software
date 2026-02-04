import React from 'react';
import Sidebar from './Sidebar';
import { Search, Bell, Settings, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { SidebarProvider, SidebarTrigger, SidebarInset, useSidebar } from "@/components/ui/sidebar";

const LayoutContent = ({ children }) => {
    const { state } = useSidebar();
    const isCollapsed = state === "collapsed";

    return (
        <SidebarInset
            className="flex flex-col min-h-screen transition-all duration-300 ease-in-out bg-slate-50"
            style={{
                paddingLeft: isCollapsed ? '100px' : '225px'
            }}
        >
            <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 h-16 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4 flex-1">
                    <SidebarTrigger className="text-slate-500 hover:text-slate-900" />

                    <div className="relative max-w-md w-full hidden sm:block">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            type="text"
                            placeholder="Search..."
                            className="pl-10 bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-full h-9"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="h-6 w-px bg-slate-200 mx-2"></div>

                    <Button variant="ghost" className="flex items-center gap-2 px-2 hover:bg-slate-50 rounded-full">
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold shadow-inner">
                            A
                        </div>
                        <div className="text-left hidden md:block">
                            <p className="text-sm font-medium text-slate-900 leading-none">Admin User</p>
                            <p className="text-xs text-slate-500 mt-1">Administrator</p>
                        </div>
                    </Button>
                </div>
            </header>

            <main className="p-8 flex-1">
                {children}
            </main>
        </SidebarInset>
    );
};

const Layout = ({ children }) => {
    return (
        <SidebarProvider>
            <Sidebar />
            <LayoutContent>
                {children}
            </LayoutContent>
        </SidebarProvider>
    );
};

export default Layout;
