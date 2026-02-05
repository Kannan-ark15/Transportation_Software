import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Truck,
    ClipboardList,
    Zap,
    ChevronRight,
    Building2,
    BarChart3,
    ArrowUpRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const Dashboard = () => {
    const navigate = useNavigate();

    const stats = [
        {
            label: 'Active Vehicles',
            value: '510',
            icon: <Truck className="w-6 h-6" />,
            iconColor: "text-foreground",
            iconBg: "bg-muted",
            trend: "+12.5% from last month",
            trendColor: "text-accent"
        },
        {
            label: 'Daily Transactions',
            value: '520',
            icon: <ClipboardList className="w-6 h-6" />,
            iconColor: "text-background",
            iconBg: "bg-background/10",
            trend: "+4.2% from last week",
            trendColor: "text-accent",
            variant: "dark"
        },
        {
            label: 'Fuel Efficiency',
            value: '94%',
            icon: <Zap className="w-6 h-6" />,
            iconColor: "text-accent",
            iconBg: "bg-accent/15",
            trend: "-0.8% from yesterday",
            trendColor: "text-destructive"
        }
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold text-foreground tracking-tight">Dashboard Overview</h1>
                <p className="text-muted-foreground mt-2">Welcome back! Here's what's happening with your transport fleet today.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((stat, index) => {
                    const isDark = stat.variant === "dark";
                    return (
                        <Card
                            key={index}
                            className={cn(
                                "border-none shadow-soft transition-all duration-200 hover:shadow-soft-lg",
                                isDark ? "bg-foreground text-background" : "bg-card"
                            )}
                        >
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div className={cn("p-3 rounded-2xl", stat.iconBg, stat.iconColor)}>
                                    {stat.icon}
                                </div>
                                <div className={cn("flex items-center gap-1 text-xs font-medium", stat.trendColor)}>
                                    {stat.trend}
                                    <ArrowUpRight className="w-3 h-3" />
                                </div>
                            </div>
                            <div className="mt-4">
                                <h3 className={cn("text-sm font-medium", isDark ? "text-background/70" : "text-muted-foreground")}>
                                    {stat.label}
                                </h3>
                                <div className={cn("text-3xl font-bold mt-1", isDark ? "text-background" : "text-foreground")}>
                                    {stat.value}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    );
                })}
            </div>

            <Card className="border-none shadow-soft">
                <CardHeader>
                    <CardTitle className="text-xl font-bold">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Button
                            variant="outline"
                            className="h-32 rounded-2xl flex flex-col gap-3 group border-border/60 bg-white/60 hover:bg-muted/70 transition-all shadow-soft"
                            onClick={() => navigate('/masters/company')}
                        >
                            <div className="p-3 bg-muted/70 rounded-2xl group-hover:bg-white transition-colors shadow-soft-inset">
                                <Building2 className="w-6 h-6 text-muted-foreground group-hover:text-foreground" />
                            </div>
                            <span className="font-semibold text-foreground/80 group-hover:text-foreground">Company Master</span>
                        </Button>

                        <Button
                            variant="outline"
                            className="h-32 rounded-2xl flex flex-col gap-3 group border-border/60 bg-white/60 hover:bg-muted/70 transition-all shadow-soft"
                        >
                            <div className="p-3 bg-muted/70 rounded-2xl group-hover:bg-white transition-colors shadow-soft-inset">
                                <ClipboardList className="w-6 h-6 text-muted-foreground group-hover:text-foreground" />
                            </div>
                            <span className="font-semibold text-foreground/80 group-hover:text-foreground">New Transaction</span>
                        </Button>

                        <Button
                            variant="outline"
                            className="h-32 rounded-2xl flex flex-col gap-3 group border-border/60 bg-white/60 hover:bg-muted/70 transition-all shadow-soft"
                        >
                            <div className="p-3 bg-muted/70 rounded-2xl group-hover:bg-white transition-colors shadow-soft-inset">
                                <BarChart3 className="w-6 h-6 text-muted-foreground group-hover:text-foreground" />
                            </div>
                            <span className="font-semibold text-foreground/80 group-hover:text-foreground">View Reports</span>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default Dashboard;
