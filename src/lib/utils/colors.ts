// Centralized color utilities for consistent styling across the application

export const getTypeColor = (type: string): string => {
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

export const getStatusColor = (status: string): string => {
  switch (status) {
    case "ACTIVE":
    case "CONFIRMED":
    case "IN_PROGRESS":
      return "bg-green-100 text-green-700";
    case "COMPLETED":
    case "FINISHED":
      return "bg-blue-100 text-blue-700";
    case "CANCELLED":
    case "FAILED":
      return "bg-red-100 text-red-700";
    case "PENDING":
    case "WAITING":
      return "bg-yellow-100 text-yellow-700";
    case "INACTIVE":
      return "bg-gray-100 text-gray-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

export const getPriorityColor = (priority: string): string => {
  switch (priority) {
    case "URGENT":
      return "bg-red-100 text-red-700";
    case "HIGH":
      return "bg-orange-100 text-orange-700";
    case "NORMAL":
      return "bg-blue-100 text-blue-700";
    case "LOW":
      return "bg-gray-100 text-gray-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

export const getNotificationTypeColor = (type: string): string => {
  switch (type) {
    case "appointment":
      return "bg-blue-100 text-blue-700";
    case "remedy":
      return "bg-green-100 text-green-700";
    case "queue":
      return "bg-purple-100 text-purple-700";
    case "system":
      return "bg-gray-100 text-gray-700";
    case "reminder":
      return "bg-yellow-100 text-yellow-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

export const getNotificationPriorityColor = (priority: string): string => {
  switch (priority) {
    case "HIGH":
      return "bg-red-100 text-red-700";
    case "MEDIUM":
      return "bg-yellow-100 text-yellow-700";
    case "LOW":
      return "bg-gray-100 text-gray-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}; 