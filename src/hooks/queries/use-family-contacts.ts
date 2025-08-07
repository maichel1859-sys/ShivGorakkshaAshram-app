import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addFamilyContact, deleteFamilyContact } from '@/lib/actions/auth-actions';
import { toast } from 'sonner';

// Query keys
export const familyContactKeys = {
  all: ['familyContacts'] as const,
  lists: () => [...familyContactKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...familyContactKeys.lists(), filters] as const,
  details: () => [...familyContactKeys.all, 'detail'] as const,
  detail: (id: string) => [...familyContactKeys.details(), id] as const,
};

// Hook for adding family contact
export function useAddFamilyContact() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const result = await addFamilyContact(formData);
      if (!result.success) {
        throw new Error(result.error || 'Failed to add family contact');
      }
      return result;
    },
    onSuccess: () => {
      toast.success('Family contact added successfully');
      // Invalidate and refetch family contacts list
      queryClient.invalidateQueries({ queryKey: familyContactKeys.lists() });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to add family contact');
    },
  });
}

// Hook for deleting family contact
export function useDeleteFamilyContact() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (contactId: string) => {
      const result = await deleteFamilyContact(contactId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete family contact');
      }
      return result;
    },
    onSuccess: (_, contactId) => {
      toast.success('Family contact deleted successfully');
      // Optimistically remove the contact from the list
      queryClient.setQueryData(familyContactKeys.lists(), (oldData: unknown) => {
        if (!oldData || !Array.isArray(oldData)) return oldData;
        return oldData.filter((contact: { id: string }) => contact.id !== contactId);
      });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete family contact');
    },
  });
} 