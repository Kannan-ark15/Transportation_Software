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
            className="flex flex-col min-h-screen transition-all duration-300 ease-in-out bg-transparent"
            style={{
                paddingLeft: isCollapsed ? '100px' : '225px'
            }}
        >
            <header className="sticky top-4 z-40 mx-4 mt-4 md:mx-8 md:mt-6 rounded-full bg-white/70 backdrop-blur-md border border-border/60 px-6 h-14 flex items-center justify-between shadow-soft">
                <div className="flex items-center gap-4 flex-1">
                    <SidebarTrigger className="text-muted-foreground hover:text-foreground" />

                    <div className="relative max-w-md w-full hidden sm:block">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Search..."
                            className="pl-10 bg-white/80 border-border/60 focus:bg-white transition-all rounded-full h-9 shadow-soft-inset placeholder:text-muted-foreground"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="h-6 w-px bg-border/80 mx-2"></div>

                    <Button variant="ghost" className="flex items-center gap-2 px-2 hover:bg-muted/60 rounded-full">
                        <div className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center text-sm font-semibold shadow-soft-inset">
                            A
                        </div>
                        <div className="text-left hidden md:block">
                            <p className="text-sm font-medium text-foreground leading-none">Admin User</p>
                            <p className="text-xs text-muted-foreground mt-1">Administrator</p>
                        </div>
                    </Button>
                </div>
            </header>

            <main className="p-8 pt-6 flex-1">
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
