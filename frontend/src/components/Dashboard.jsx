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
            color: "text-blue-600",
            bg: "bg-blue-100",
            trend: "+12.5% from last month",
            trendColor: "text-green-600"
        },
        {
            label: 'Daily Transactions',
            value: '520',
            icon: <ClipboardList className="w-6 h-6" />,
            color: "text-purple-600",
            bg: "bg-purple-100",
            trend: "+4.2% from last week",
            trendColor: "text-green-600"
        },
        {
            label: 'Fuel Efficiency',
            value: '94%',
            icon: <Zap className="w-6 h-6" />,
            color: "text-amber-600",
            bg: "bg-amber-100",
            trend: "-0.8% from yesterday",
            trendColor: "text-red-600"
        }
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard Overview</h1>
                <p className="text-slate-500 mt-2">Welcome back! Here's what's happening with your transport fleet today.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((stat, index) => (
                    <Card key={index} className="border-none shadow-sm hover:shadow-md transition-shadow duration-200">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div className={cn("p-3 rounded-xl", stat.bg, stat.color)}>
                                    {stat.icon}
                                </div>
                                <div className={cn("flex items-center gap-1 text-xs font-medium", stat.trendColor)}>
                                    {stat.trend}
                                    <ArrowUpRight className="w-3 h-3" />
                                </div>
                            </div>
                            <div className="mt-4">
                                <h3 className="text-slate-500 text-sm font-medium">{stat.label}</h3>
                                <div className="text-3xl font-bold text-slate-900 mt-1">{stat.value}</div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card className="border-none shadow-sm">
                <CardHeader>
                    <CardTitle className="text-xl font-bold">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Button
                            variant="outline"
                            className="h-32 flex flex-col gap-3 group border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all"
                            onClick={() => navigate('/masters/company')}
                        >
                            <div className="p-3 bg-slate-100 rounded-full group-hover:bg-blue-100 transition-colors">
                                <Building2 className="w-6 h-6 text-slate-600 group-hover:text-blue-600" />
                            </div>
                            <span className="font-semibold text-slate-700 group-hover:text-blue-700">Company Master</span>
                        </Button>

                        <Button
                            variant="outline"
                            className="h-32 flex flex-col gap-3 group border-slate-200 hover:border-purple-500 hover:bg-purple-50 transition-all"
                        >
                            <div className="p-3 bg-slate-100 rounded-full group-hover:bg-purple-100 transition-colors">
                                <ClipboardList className="w-6 h-6 text-slate-600 group-hover:text-purple-600" />
                            </div>
                            <span className="font-semibold text-slate-700 group-hover:text-purple-700">New Transaction</span>
                        </Button>

                        <Button
                            variant="outline"
                            className="h-32 flex flex-col gap-3 group border-slate-200 hover:border-amber-500 hover:bg-amber-50 transition-all"
                        >
                            <div className="p-3 bg-slate-100 rounded-full group-hover:bg-amber-100 transition-colors">
                                <BarChart3 className="w-6 h-6 text-slate-600 group-hover:text-amber-600" />
                            </div>
                            <span className="font-semibold text-slate-700 group-hover:text-amber-700">View Reports</span>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default Dashboard;
