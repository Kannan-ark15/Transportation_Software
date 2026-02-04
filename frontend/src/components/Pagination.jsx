import React from 'react';
import {
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from '@/lib/utils';

const Pagination = ({
    currentPage,
    totalItems,
    itemsPerPage,
    onPageChange,
    onItemsPerPageChange
}) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    if (totalItems === 0) return null;

    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
    }

    // Windowing logic for pagination buttons
    let visiblePages = pages;
    if (totalPages > 7) {
        if (currentPage <= 4) {
            visiblePages = [...pages.slice(0, 5), '...', totalPages];
        } else if (currentPage >= totalPages - 3) {
            visiblePages = [1, '...', ...pages.slice(totalPages - 5)];
        } else {
            visiblePages = [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
        }
    }

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2 bg-slate-50/30 rounded-lg">
            <div className="text-sm font-medium text-slate-500">
                Showing <span className="text-slate-900">{Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)}</span> to <span className="text-slate-900">{Math.min(currentPage * itemsPerPage, totalItems)}</span> of <span className="text-slate-900">{totalItems}</span> entries
            </div>

            <div className="flex items-center gap-6">
                <div className="flex items-center gap-1">
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        disabled={currentPage === 1}
                        onClick={() => onPageChange(1)}
                    >
                        <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        disabled={currentPage === 1}
                        onClick={() => onPageChange(currentPage - 1)}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <div className="flex items-center gap-1 mx-2">
                        {visiblePages.map((page, index) => (
                            page === '...' ? (
                                <span key={index} className="px-2 text-slate-400">...</span>
                            ) : (
                                <Button
                                    key={index}
                                    variant={page === currentPage ? "default" : "outline"}
                                    size="sm"
                                    className={cn(
                                        "h-8 w-8 p-0 transition-all font-medium",
                                        page === currentPage ? "bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-200" : "text-slate-600"
                                    )}
                                    onClick={() => onPageChange(page)}
                                >
                                    {page}
                                </Button>
                            )
                        ))}
                    </div>

                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        disabled={currentPage === totalPages}
                        onClick={() => onPageChange(currentPage + 1)}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        disabled={currentPage === totalPages}
                        onClick={() => onPageChange(totalPages)}
                    >
                        <ChevronsRight className="h-4 w-4" />
                    </Button>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500 font-medium">Show</span>
                    <Select
                        value={itemsPerPage.toString()}
                        onValueChange={(val) => onItemsPerPageChange(parseInt(val))}
                    >
                        <SelectTrigger className="h-8 w-[70px] bg-white border-slate-200">
                            <SelectValue placeholder={itemsPerPage} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="25">25</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                            <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
    );
};

export default Pagination;
