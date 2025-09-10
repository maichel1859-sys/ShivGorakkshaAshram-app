"use client";

import { useState } from "react";
import {
  useUsers,
  useDeleteUser,
  useToggleUserStatus,
} from "@/hooks/queries/use-users";
import { useAppStore } from "@/store/app-store";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MoreHorizontal,
  Edit,
  Trash2,
  Shield,
  Search,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface UsersTableProps {
  initialFilters?: {
    role?: "USER" | "COORDINATOR" | "GURUJI" | "ADMIN";
    active?: boolean;
    search?: string;
  };
}

export function UsersTable({ initialFilters }: UsersTableProps) {
  // UI State (Zustand)
  const { setError: setAppError } = useAppStore();

  // Local state for filters
  const [filters, setFilters] = useState({
    role: initialFilters?.role || undefined,
    active: initialFilters?.active,
    search: initialFilters?.search || "",
    limit: 50,
    offset: 0,
  });

  // Remote Data (React Query)
  const { data: usersData, isLoading, error, refetch } = useUsers(filters);

  // Mutations (React Query)
  const deleteUserMutation = useDeleteUser();
  const toggleStatusMutation = useToggleUserStatus();

  // Handle filter changes
  const handleFilterChange = (key: string, value: unknown) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  // Handle user deletion
  const handleDeleteUser = async (userId: string) => {
    if (
      confirm(
        "Are you sure you want to delete this user? This action cannot be undone."
      )
    ) {
      try {
        await deleteUserMutation.mutateAsync(userId);
        toast.success("User deleted successfully");
      } catch (error) {
        toast.error("Failed to delete user");
        setAppError(error instanceof Error ? error.message : "Unknown error");
      }
    }
  };

  // Handle status toggle
  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await toggleStatusMutation.mutateAsync(userId);
      toast.success(
        `User ${!currentStatus ? "activated" : "deactivated"} successfully`
      );
    } catch (error) {
      toast.error("Failed to update user status");
      setAppError(error instanceof Error ? error.message : "Unknown error");
    }
  };

  // Loading states from React Query mutations
  const isDeleting = deleteUserMutation.isPending;
  const isToggling = toggleStatusMutation.isPending;

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive mb-4">
          Failed to load users: {error.message}
        </p>
        <Button onClick={() => refetch()} variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  const users = usersData?.users || [];
  const totalUsers = usersData?.total || 0;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users by name or email..."
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <Select
          value={filters.role}
          onValueChange={(value) => handleFilterChange("role", value)}
        >
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="USER">Users</SelectItem>
            <SelectItem value="COORDINATOR">Coordinators</SelectItem>
            <SelectItem value="GURUJI">Gurujis</SelectItem>
            <SelectItem value="ADMIN">Admins</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filters.active?.toString()}
          onValueChange={(value) =>
            handleFilterChange(
              "active",
              value === "true" ? true : value === "false" ? false : undefined
            )
          }
        >
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="true">Active Only</SelectItem>
            <SelectItem value="false">Inactive Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-48" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-8 w-20" />
                    </TableCell>
                  </TableRow>
                ))
              : users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{user.name}</div>
                        {user.phone && (
                          <div className="text-xs text-muted-foreground">
                            {user.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          user.role === "ADMIN" ? "destructive" : "secondary"
                        }
                      >
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.isActive ? "default" : "secondary"}>
                        {user.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            disabled={isDeleting || isToggling}
                          >
                            {isDeleting || isToggling ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <MoreHorizontal className="h-4 w-4" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit User
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() =>
                              handleToggleStatus(user.id, user.isActive)
                            }
                            disabled={isToggling}
                          >
                            <Shield className="mr-2 h-4 w-4" />
                            {user.isActive ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDeleteUser(user.id)}
                            disabled={isDeleting}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
        {users.length === 0 && !isLoading && (
          <div className="text-center py-8 text-muted-foreground">
            No users found matching your criteria
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="text-sm text-muted-foreground">
        Showing {users.length} of {totalUsers} users
      </div>
    </div>
  );
}
