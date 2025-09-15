"use client";

import { useRouter } from "next/navigation";
import { DataPagination } from "@/components/ui/data-pagination";

interface UsersPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  searchParams: Record<string, string | undefined>;
}

export function UsersPagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  searchParams,
}: UsersPaginationProps) {
  const router = useRouter();

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams();
    
    // Preserve existing search params
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value && key !== 'page') {
        params.set(key, value);
      }
    });
    
    // Set new page
    params.set('page', page.toString());
    
    router.push(`/admin/users?${params.toString()}`);
  };

  const handlePageSizeChange = (pageSize: number) => {
    const params = new URLSearchParams();
    
    // Preserve existing search params
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value && key !== 'page' && key !== 'pageSize') {
        params.set(key, value);
      }
    });
    
    // Reset to page 1 when changing page size
    params.set('page', '1');
    params.set('pageSize', pageSize.toString());
    
    router.push(`/admin/users?${params.toString()}`);
  };

  return (
    <DataPagination
      currentPage={currentPage}
      totalPages={totalPages}
      totalItems={totalItems}
      itemsPerPage={itemsPerPage}
      onPageChange={handlePageChange}
      onPageSizeChange={handlePageSizeChange}
      className="mt-6"
    />
  );
}