import { Suspense } from "react";
import Link from "next/link";
import { getUsers } from "@/lib/actions";
// import { Role } from "@prisma/client"; // Temporarily unused
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Search, Filter, Users, UserPlus } from "lucide-react";
import { AlertTriangle } from "lucide-react";
import { UsersPagination } from "@/components/admin/users-pagination";

// Server Component for User List
async function UserListServer({
  searchParams,
}: {
  searchParams: { 
    search?: string; 
    role?: string; 
    active?: string;
    page?: string;
    pageSize?: string;
  };
}) {
  const { search, role, active, page = "1", pageSize = "20" } = searchParams;

  const currentPage = Math.max(1, parseInt(page));
  const currentPageSize = Math.max(1, Math.min(100, parseInt(pageSize)));

  const options = {
    search: search || undefined,
    role: role || undefined,
    active: active === "true" ? true : active === "false" ? false : undefined,
    limit: currentPageSize,
    offset: (currentPage - 1) * currentPageSize,
  };

  const result = await getUsers(options);

  if (!result.success) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load users: {result.error}
        </AlertDescription>
      </Alert>
    );
  }

  const { users = [], total = 0 } = result;
  const totalPages = Math.ceil(total / currentPageSize);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Users ({total})</h2>
          <p className="text-muted-foreground">
            Manage user accounts and permissions
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/users/create">
            <UserPlus className="mr-2 h-4 w-4" />
            Add User
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex gap-4">
            <div className="flex-1">
              <Input
                name="search"
                placeholder="Search by name, email, or phone..."
                defaultValue={search}
              />
            </div>
            <Select name="role" defaultValue={role}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="USER">User</SelectItem>
                <SelectItem value="COORDINATOR">Coordinator</SelectItem>
                <SelectItem value="GURUJI">Guruji</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
            <Select name="active" defaultValue={active}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit">
              <Search className="mr-2 h-4 w-4" />
              Search
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* User List */}
      <div className="grid gap-4">
        {users.map((user) => (
          <Card key={user.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold">{user.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {user.email}
                    </p>
                    {user.phone && (
                      <p className="text-sm text-muted-foreground">
                        {user.phone}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <Badge variant={user.isActive ? "default" : "secondary"}>
                      {user.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <div className="mt-1">
                      <Badge variant="outline" className="text-xs">
                        {user.role}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/admin/users/${user.id}/edit`}>Edit</Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/admin/users/${user.id}`}>View</Link>
                    </Button>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    Joined: {new Date(user.createdAt).toLocaleDateString()}
                  </span>
                  <span>
                    Last updated:{" "}
                    {new Date(user.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {users.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No users found</h3>
            <p className="text-muted-foreground mb-4">
              {search || role || active
                ? "Try adjusting your search criteria"
                : "Get started by creating your first user"}
            </p>
            {!search && !role && !active && (
              <Button asChild>
                <Link href="/admin/users/create">
                  <Plus className="mr-2 h-4 w-4" />
                  Create User
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {users.length > 0 && (
        <UsersPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={total}
          itemsPerPage={currentPageSize}
          searchParams={searchParams}
        />
      )}
    </div>
  );
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ 
    search?: string; 
    role?: string; 
    active?: string;
    page?: string;
    pageSize?: string;
  }>;
}) {
  const params = await searchParams;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground">
          Manage user accounts, roles, and permissions across the system.
        </p>
      </div>

      <Suspense fallback={<div>Loading users...</div>}>
        <UserListServer searchParams={params} />
      </Suspense>
    </div>
  );
}
