"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CardSpinner, PageSpinner } from "@/components/ui/global-spinner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Heart,
  Plus,
  Search,
  Edit,
  Trash2,
  Copy,
  Send,
  AlertTriangle,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useRemedyTemplates,
  useCreateRemedyTemplate,
  useUpdateRemedyTemplate,
  useDeleteRemedyTemplate,
} from "@/hooks/queries";

interface RemedyTemplate {
  id: string;
  name: string;
  type: "HOMEOPATHIC" | "AYURVEDIC" | "SPIRITUAL" | "LIFESTYLE" | "DIETARY";
  category: string;
  description: string | null;
  instructions: string;
  dosage: string | null;
  duration: string | null;
  language: string;
  isActive: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const remedySchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum([
    "HOMEOPATHIC",
    "AYURVEDIC",
    "SPIRITUAL",
    "LIFESTYLE",
    "DIETARY",
  ]),
  category: z.string().min(1, "Category is required"),
  description: z.string().optional(),
  instructions: z.string().min(1, "Instructions are required"),
  dosage: z.string().optional(),
  duration: z.string().optional(),
  language: z.string().default("en"),
  tags: z.string().optional(),
});

type RemedyFormData = z.infer<typeof remedySchema>;

export default function RemediesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<RemedyTemplate | null>(
    null
  );

  // Use React Query for data fetching and mutations
  const { data: templatesData, isLoading, error } = useRemedyTemplates();
  const createTemplateMutation = useCreateRemedyTemplate();
  const updateTemplateMutation = useUpdateRemedyTemplate();
  const deleteTemplateMutation = useDeleteRemedyTemplate();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<RemedyFormData>({
    resolver: zodResolver(remedySchema),
  });

  const isSubmitting =
    createTemplateMutation.isPending || updateTemplateMutation.isPending;

  const templates = useMemo(
    () => templatesData?.templates || [],
    [templatesData?.templates]
  );
  const filteredTemplates = useMemo(() => {
    let filtered = templates;

    if (searchTerm) {
      filtered = filtered.filter(
        (template) =>
          template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          template.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
          template.tags.some((tag) =>
            tag.toLowerCase().includes(searchTerm.toLowerCase())
          )
      );
    }

    if (filterType !== "all") {
      filtered = filtered.filter((template) => template.type === filterType);
    }

    if (filterCategory !== "all") {
      filtered = filtered.filter(
        (template) => template.category === filterCategory
      );
    }

    return filtered;
  }, [templates, searchTerm, filterType, filterCategory]);

  if (isLoading) {
    return <CardSpinner message="Loading remedy templates..." />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-red-600">
            Error loading remedy templates
          </h3>
          <p className="text-sm text-muted-foreground mt-2">
            {error instanceof Error ? error.message : "An error occurred"}
          </p>
        </div>
      </div>
    );
  }

  const onSubmit = async (data: RemedyFormData) => {
    const tagsArray = data.tags
      ? data.tags.split(",").map((tag) => tag.trim())
      : [];

    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("type", data.type);
    formData.append("category", data.category);
    if (data.description) formData.append("description", data.description);
    formData.append("instructions", data.instructions);
    if (data.dosage) formData.append("dosage", data.dosage);
    if (data.duration) formData.append("duration", data.duration);
    formData.append("language", data.language);
    formData.append("tags", JSON.stringify(tagsArray));
    formData.append("isActive", "true");

    if (editingTemplate) {
      formData.append("templateId", editingTemplate.id);
      updateTemplateMutation.mutate(formData, {
        onSuccess: () => {
          setIsDialogOpen(false);
          setEditingTemplate(null);
          reset();
        },
      });
    } else {
      createTemplateMutation.mutate(formData, {
        onSuccess: () => {
          setIsDialogOpen(false);
          setEditingTemplate(null);
          reset();
        },
      });
    }
  };

  const handleEdit = (template: RemedyTemplate) => {
    setEditingTemplate(template);
    setValue("name", template.name);
    setValue("type", template.type);
    setValue("category", template.category);
    setValue("description", template.description || "");
    setValue("instructions", template.instructions);
    setValue("dosage", template.dosage || "");
    setValue("duration", template.duration || "");
    setValue("language", template.language);
    setValue("tags", template.tags.join(", "));
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    const formData = new FormData();
    formData.append("templateId", id);
    deleteTemplateMutation.mutate(formData);
  };

  const handleDuplicate = async (template: RemedyTemplate) => {
    setValue("name", `${template.name} (Copy)`);
    setValue("type", template.type);
    setValue("category", template.category);
    setValue("description", template.description || "");
    setValue("instructions", template.instructions);
    setValue("dosage", template.dosage || "");
    setValue("duration", template.duration || "");
    setValue("language", template.language);
    setValue("tags", template.tags.join(", "));
    setEditingTemplate(null);
    setIsDialogOpen(true);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "HOMEOPATHIC":
        return "bg-blue-100 text-blue-700";
      case "AYURVEDIC":
        return "bg-green-100 text-green-700";
      case "SPIRITUAL":
        return "bg-purple-100 text-purple-700";
      case "LIFESTYLE":
        return "bg-orange-100 text-orange-700";
      case "DIETARY":
        return "bg-yellow-100 text-yellow-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const categories = [...new Set(templates.map((t) => t.category))];

  if (isLoading) {
    return <PageSpinner message="Loading..." />;
  }

  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Remedy Templates
            </h2>
            <p className="text-muted-foreground">
              Manage and create remedy templates for prescriptions
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setEditingTemplate(null);
                  reset();
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingTemplate
                    ? "Edit Remedy Template"
                    : "Create Remedy Template"}
                </DialogTitle>
                <DialogDescription>
                  {editingTemplate
                    ? "Update the remedy template details"
                    : "Create a new remedy template for prescriptions"}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Template Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Stress Relief Meditation"
                      {...register("name")}
                    />
                    {errors.name && (
                      <p className="text-sm text-destructive">
                        {errors.name.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="type">Remedy Type</Label>
                    <Select
                      onValueChange={(value) =>
                        setValue(
                          "type",
                          value as
                            | "HOMEOPATHIC"
                            | "AYURVEDIC"
                            | "SPIRITUAL"
                            | "LIFESTYLE"
                            | "DIETARY"
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="HOMEOPATHIC">Homeopathic</SelectItem>
                        <SelectItem value="AYURVEDIC">Ayurvedic</SelectItem>
                        <SelectItem value="SPIRITUAL">Spiritual</SelectItem>
                        <SelectItem value="LIFESTYLE">Lifestyle</SelectItem>
                        <SelectItem value="DIETARY">Dietary</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.type && (
                      <p className="text-sm text-destructive">
                        {errors.type.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      placeholder="e.g., Mental Health, Digestive"
                      {...register("category")}
                    />
                    {errors.category && (
                      <p className="text-sm text-destructive">
                        {errors.category.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    <Select
                      onValueChange={(value) => setValue("language", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="hi">Hindi</SelectItem>
                        <SelectItem value="sa">Sanskrit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description of the remedy..."
                    {...register("description")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instructions">Instructions</Label>
                  <Textarea
                    id="instructions"
                    placeholder="Detailed instructions for the remedy..."
                    className="min-h-[100px]"
                    {...register("instructions")}
                  />
                  {errors.instructions && (
                    <p className="text-sm text-destructive">
                      {errors.instructions.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dosage">Dosage (Optional)</Label>
                    <Input
                      id="dosage"
                      placeholder="e.g., 2 tablets twice daily"
                      {...register("dosage")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration (Optional)</Label>
                    <Input
                      id="duration"
                      placeholder="e.g., 7-14 days"
                      {...register("duration")}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tags">Tags (Optional)</Label>
                  <Input
                    id="tags"
                    placeholder="anxiety, stress, meditation (comma separated)"
                    {...register("tags")}
                  />
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting
                      ? "Saving..."
                      : editingTemplate
                        ? "Update"
                        : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search templates..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="HOMEOPATHIC">Homeopathic</SelectItem>
                  <SelectItem value="AYURVEDIC">Ayurvedic</SelectItem>
                  <SelectItem value="SPIRITUAL">Spiritual</SelectItem>
                  <SelectItem value="LIFESTYLE">Lifestyle</SelectItem>
                  <SelectItem value="DIETARY">Dietary</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Templates Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template: RemedyTemplate) => (
            <Card
              key={template.id}
              className="hover:shadow-md transition-shadow"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(template.type)}`}
                      >
                        {template.type}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {template.category}
                      </span>
                    </div>
                  </div>
                </div>
                {template.description && (
                  <CardDescription className="line-clamp-2">
                    {template.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {template.dosage && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Dosage
                      </p>
                      <p className="text-sm">{template.dosage}</p>
                    </div>
                  )}

                  {template.duration && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Duration
                      </p>
                      <p className="text-sm">{template.duration}</p>
                    </div>
                  )}

                  {template.tags.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        Tags
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {template.tags.slice(0, 3).map((tag, index) => (
                          <span
                            key={index}
                            className="px-2 py-0.5 bg-muted rounded text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                        {template.tags.length > 3 && (
                          <span className="px-2 py-0.5 bg-muted rounded text-xs">
                            +{template.tags.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <Separator />

                  <div className="flex justify-between">
                    <div className="flex space-x-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(template)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDuplicate(template)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(template.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <Button size="sm" asChild>
                      <a href={`/guruji/remedies/prescribe/${template.id}`}>
                        <Send className="mr-1 h-3 w-3" />
                        Use
                      </a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredTemplates.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Templates Found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || filterType !== "all" || filterCategory !== "all"
                  ? "Try adjusting your search or filters"
                  : "Create your first remedy template to get started"}
              </p>
              {!searchTerm &&
                filterType === "all" &&
                filterCategory === "all" && (
                  <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Template
                  </Button>
                )}
            </CardContent>
          </Card>
        )}
      </div>
  );
}
