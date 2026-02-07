import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Settings,
    ChevronRight,
    Database,
    FileText,
    ClipboardList,
    BarChart3,
    Truck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    Sidebar as ShadcnSidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarGroupContent,
} from "@/components/ui/sidebar";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";

const Sidebar = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const menuItems = [
        {
            id: 'dashboard',
            label: 'Dashboard',
            icon: <LayoutDashboard className="w-5 h-5" />,
            path: '/'
        },
        {
            id: 'masters',
            label: 'Masters',
            icon: <Database className="w-5 h-5" />,
            hasSubmenu: true,
            submenu: [
                { label: 'Company Master', path: '/masters/company' },
                { label: 'Owner Master', path: '/masters/owners' },
                { label: 'Vehicle Master', path: '/masters/vehicles' },
                { label: 'Driver Master', path: '/masters/drivers' },
                { label: 'Pump Master', path: '/masters/pumps' },
                { label: 'Product Master', path: '/masters/products' },
                { label: 'Place Master', path: '/masters/places' },
                { label: 'Dealer Master', path: '/masters/dealers' },
                { label: 'Bank Master', path: '/masters/banks' },
                { label: 'User', path: '/masters/users' },
                { label: 'Rate Card Master', path: '/masters/rate-cards' }
            ]
        },
        {
            id: 'transactions',
            label: 'Transactions',
            icon: <ClipboardList className="w-5 h-5" />,
            path: '#'
        },
        {
            id: 'templates',
            label: 'Templates',
            icon: <FileText className="w-5 h-5" />,
            path: '/templates'
        },
        {
            id: 'reports',
            label: 'Reports',
            icon: <BarChart3 className="w-5 h-5" />,
            path: '#'
        },
        {
            id: 'settings',
            label: 'Settings',
            icon: <Settings className="w-5 h-5" />,
            path: '#'
        }
    ];

    const isActive = (path) => {
        return location.pathname === path;
    };

    const isSubmenuActive = (submenu) => {
        return submenu.some(item => location.pathname === item.path);
    };

    return (
        <ShadcnSidebar
            collapsible="icon"
            className="border border-white/10 bg-[#2f343d] text-white shadow-soft rounded-3xl m-6 overflow-hidden"
        >
            <SidebarHeader className="p-6 border-b border-white/10">
                <div className="flex items-center gap-3">
                    <Truck className="w-8 h-8 text-accent" />
                    <span className="text-xl font-bold text-white tracking-tight group-data-[collapsible=icon]:hidden">
                        Transport
                    </span>
                </div>
            </SidebarHeader>

            <SidebarContent className="py-6">
                <SidebarGroup>
                    <SidebarGroupLabel className="text-white/60 px-4 group-data-[collapsible=icon]:hidden">
                        Main Menu
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {menuItems.map((item) => (
                                <SidebarMenuItem key={item.id}>
                                    {item.hasSubmenu ? (
                                        <Collapsible
                                            defaultOpen={isSubmenuActive(item.submenu)}
                                            className="group/collapsible w-full"
                                        >
                                            <CollapsibleTrigger asChild>
                                            <SidebarMenuButton
                                                tooltip={item.label}
                                                className={cn(
                                                    "w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 text-sm font-medium",
                                                    isSubmenuActive(item.submenu)
                                                        ? "text-white bg-white/10 shadow-soft-inset"
                                                        : "text-white/70 hover:bg-white/10 hover:text-white"
                                                )}
                                            >
                                                {item.icon}
                                                <span>{item.label}</span>
                                                <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                            </SidebarMenuButton>
                                        </CollapsibleTrigger>
                                        <CollapsibleContent>
                                            <SidebarMenuSub className="border-l border-white/10 ml-6 mt-1">
                                                {item.submenu.map((subItem) => (
                                                    <SidebarMenuSubItem key={subItem.path}>
                                                        <SidebarMenuSubButton
                                                            asChild
                                                            isActive={isActive(subItem.path)}
                                                        >
                                                            <a
                                                                href={subItem.path}
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    navigate(subItem.path);
                                                                }}
                                                                className={cn(
                                                                    "w-full text-sm py-2 px-3 rounded-lg transition-colors",
                                                                    isActive(subItem.path)
                                                                        ? "text-accent font-semibold bg-accent/15"
                                                                        : "text-white/60 hover:text-white hover:bg-white/10"
                                                                )}
                                                            >
                                                                {subItem.label}
                                                            </a>
                                                        </SidebarMenuSubButton>
                                                        </SidebarMenuSubItem>
                                                    ))}
                                                </SidebarMenuSub>
                                            </CollapsibleContent>
                                        </Collapsible>
                                    ) : (
                                        <SidebarMenuButton
                                            asChild
                                            isActive={isActive(item.path)}
                                            tooltip={item.label}
                                            className={cn(
                                                "w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 text-sm font-medium",
                                                isActive(item.path)
                                                    ? "bg-white/10 text-white shadow-soft"
                                                    : "text-white/70 hover:bg-white/10 hover:text-white"
                                            )}
                                        >
                                            <a
                                                href={item.path}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    if (item.path !== '#') navigate(item.path);
                                                }}
                                            >
                                                {item.icon}
                                                <span>{item.label}</span>
                                            </a>
                                        </SidebarMenuButton>
                                    )}
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter className="p-4 border-t border-white/10">
                <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
                    <div className="w-8 h-8 rounded-full bg-white text-[#2f343d] flex items-center justify-center text-sm font-semibold shadow-soft-inset">
                        A
                    </div>
                    <div className="text-left group-data-[collapsible=icon]:hidden">
                        <p className="text-sm font-medium text-white leading-none">Admin User</p>
                        <p className="text-xs text-white/60 mt-1">Administrator</p>
                    </div>
                </div>
            </SidebarFooter>
        </ShadcnSidebar>
    );
};

export default Sidebar;
