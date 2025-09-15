"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/common/StatusBadge";
import {
  Plus,
  Search,
  FileText,
  Edit,
  Trash2,
  Eye,
  Heart,
  Users,
  Calendar,
} from "lucide-react";
import toast from "react-hot-toast";
import { useRemedyTemplates } from "@/hooks/queries/use-remedies";
import type { RemedyTemplate as RemedyTemplateModel } from "@prisma/client";

interface RemedyTemplateUI {
  id: string;
  name: string;
  type: string;
  category: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  usageCount: number;
}

interface Prescription {
  id: string;
  templateName: string;
  devoteeName: string;
  gurujiName: string;
  status: string;
  createdAt: string;
}

export default function AdminRemediesPage() {
  const [templates, setTemplates] = useState<RemedyTemplateUI[]>([]);
  const [prescriptions] = useState<Prescription[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const { data, isLoading, error } = useRemedyTemplates();

  if (error) {
    toast.error("Failed to load remedies data");
  }

  // Map server data into UI shape when available
  useEffect(() => {
    if (data?.templates) {
      const formattedTemplates: RemedyTemplateUI[] = (data.templates as RemedyTemplateModel[]).map(
        (template) => ({
          id: template.id,
          name: template.name,
          type: template.type,
          category: template.category,
          description: template.description || "",
          isActive: template.isActive,
          createdAt: new Date(template.createdAt).toISOString().split("T")[0],
          usageCount: 0,
        })
      );
      setTemplates(formattedTemplates);
    }
  }, [data?.templates]);

  // Removed duplicate color functions - now using centralized utilities

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === "all" || template.type === filterType;
    return matchesSearch && matchesFilter;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Remedies Management</h2>
          <p className="text-muted-foreground">
            Manage remedy templates and monitor prescriptions
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Template
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Templates
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{templates.length}</div>
              <p className="text-xs text-muted-foreground">
                {templates.filter((t) => t.isActive).length} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Prescriptions
              </CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{prescriptions.length}</div>
              <p className="text-xs text-muted-foreground">
                {prescriptions.filter((p) => p.status === "ACTIVE").length}{" "}
                active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">24</div>
              <p className="text-xs text-muted-foreground">
                +12% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Gurujis
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">8</div>
              <p className="text-xs text-muted-foreground">
                Prescribing remedies
              </p>
            </CardContent>
          </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="templates" className="space-y-4">
          <TabsList>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="space-y-4">
            {/* Filters */}
            <div className="flex items-center space-x-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="AYURVEDIC">Ayurvedic</SelectItem>
                  <SelectItem value="HOMEOPATHIC">Homeopathic</SelectItem>
                  <SelectItem value="SPIRITUAL">Spiritual</SelectItem>
                  <SelectItem value="LIFESTYLE">Lifestyle</SelectItem>
                  <SelectItem value="DIETARY">Dietary</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Templates List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((template) => (
                <Card key={template.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <Badge
                        variant={template.isActive ? "default" : "secondary"}
                      >
                        {template.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <CardDescription>{template.category}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <StatusBadge value={template.type} type="type" />
                    </div>

                    {template.description && (
                      <p className="text-sm text-muted-foreground">
                        {template.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Used {template.usageCount} times
                      </span>
                      <span className="text-muted-foreground">
                        {template.createdAt}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button variant="outline" size="sm">
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="prescriptions" className="space-y-4">
            {/* Prescriptions Table */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Prescriptions</CardTitle>
                <CardDescription>
                  Monitor all remedy prescriptions across the system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {prescriptions.map((prescription) => (
                    <div
                      key={prescription.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="space-y-1">
                        <p className="font-medium">
                          {prescription.templateName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Devotee: {prescription.devoteeName} • Guruji:{" "}
                          {prescription.gurujiName}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <StatusBadge
                          value={prescription.status}
                          type="status"
                        />
                        <span className="text-sm text-muted-foreground">
                          {prescription.createdAt}
                        </span>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
      </Tabs>
    </div>
  );
}
