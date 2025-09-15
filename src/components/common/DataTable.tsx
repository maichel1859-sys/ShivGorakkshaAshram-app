import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Download, Plus, MoreVertical } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Column<T> {
  key: keyof T;
  header: string;
  render?: (value: unknown, item: T) => React.ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  mobileHide?: boolean; // Hide this column on mobile
  mobileLabel?: string; // Custom mobile label
}

interface DataTableProps<T> {
  title: string;
  description?: string;
  data: T[];
  columns: Column<T>[];
  searchKey?: keyof T;
  filterOptions?: {
    key: keyof T;
    label: string;
    options: { value: string; label: string }[];
  }[];
  onSearch?: (term: string) => void;
  onFilter?: (key: keyof T, value: string) => void;
  onExport?: () => void;
  onAdd?: () => void;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function DataTable<T extends Record<string, unknown>>({
  title,
  description,
  data,
  columns,
  searchKey,
  filterOptions,
  onSearch,
  onFilter,
  onExport,
  onAdd,
  loading = false,
  emptyMessage = "No data available",
  className = "",
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const isMobile = useIsMobile();

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    onSearch?.(value);
  };

  const handleFilter = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilter?.(key as keyof T, value);
  };

  const filteredData = data.filter((item) => {
    // Search filter
    if (searchTerm && searchKey) {
      const searchValue = String(item[searchKey]).toLowerCase();
      if (!searchValue.includes(searchTerm.toLowerCase())) {
        return false;
      }
    }

    // Column filters
    for (const [key, value] of Object.entries(filters)) {
      if (value && value !== "all") {
        if (String(item[key as keyof T]) !== value) {
          return false;
        }
      }
    }

    return true;
  });

  const renderCell = (column: Column<T>, item: T) => {
    const value = item[column.key];

    if (column.render) {
      return column.render(value, item);
    }

    // Default rendering based on value type
    if (typeof value === "boolean") {
      return (
        <Badge variant={value ? "default" : "secondary"}>
          {value ? "Yes" : "No"}
        </Badge>
      );
    }

    if (typeof value === "string") {
      return <span className="truncate">{value}</span>;
    }

    return <span>{String(value)}</span>;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          <div className="flex items-center space-x-2">
            {onAdd && (
              <Button onClick={onAdd} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            )}
            {onExport && (
              <Button variant="outline" onClick={onExport} size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
          {searchKey && (
            <div className="relative flex-1 max-w-full sm:max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-8 w-full"
              />
            </div>
          )}
          {filterOptions && filterOptions.length > 0 && (
            <div className="flex flex-wrap gap-2 sm:gap-4">
              {filterOptions.map((filter) => (
                <select
                  key={String(filter.key)}
                  value={filters[String(filter.key)] || "all"}
                  onChange={(e) => handleFilter(String(filter.key), e.target.value)}
                  className="px-3 py-2 border border-input bg-background rounded-md text-sm min-w-[120px] touch-target"
                  aria-label={`Filter by ${filter.label}`}
                >
                  <option value="all">{filter.label}</option>
                  {filter.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ))}
            </div>
          )}
        </div>

        {/* Table/Cards */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {emptyMessage}
            </div>
          ) : isMobile ? (
            /* Mobile Card View */
            <div className="space-y-3">
              {filteredData.map((item, index) => (
                <Card key={index} className="p-4 hover:shadow-md transition-shadow">
                  <div className="space-y-3">
                    {columns.filter(col => !col.mobileHide).map((column) => (
                      <div key={String(column.key)} className="flex justify-between items-start gap-3">
                        <span className="text-sm font-medium text-muted-foreground min-w-0 flex-shrink-0">
                          {column.mobileLabel || column.header}:
                        </span>
                        <div className="text-sm text-right min-w-0 flex-1">
                          {renderCell(column, item)}
                        </div>
                      </div>
                    ))}
                    
                    {/* Mobile Actions */}
                    <div className="flex justify-end pt-2 border-t">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 touch-target">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>View Details</DropdownMenuItem>
                          <DropdownMenuItem>Edit</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            /* Desktop Table View */
            <div className="space-y-2">
              {/* Table Header */}
              <div className="hidden sm:flex items-center px-4 py-2 border-b bg-muted/30 rounded-t-lg">
                {columns.map((column) => (
                  <div key={String(column.key)} className="flex-1 px-2 text-sm font-medium">
                    {column.header}
                  </div>
                ))}
              </div>
              
              {/* Table Rows */}
              {filteredData.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  {columns.map((column) => (
                    <div key={String(column.key)} className="flex-1 px-2">
                      {renderCell(column, item)}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
