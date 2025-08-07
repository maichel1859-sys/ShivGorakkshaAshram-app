'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import { createNotification } from '@/lib/actions';
import { toast } from 'sonner';

const createNotificationSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  message: z.string().min(1, 'Message is required').max(500, 'Message too long'),
  type: z.enum(['system', 'appointment', 'queue', 'general'], {
    required_error: 'Please select a notification type',
  }),
  priority: z.enum(['low', 'medium', 'high', 'critical'], {
    required_error: 'Please select a priority',
  }),
  sendToAll: z.boolean().default(false),
  userId: z.string().optional(),
});

type CreateNotificationForm = z.infer<typeof createNotificationSchema>;

export default function CreateNotificationModal() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(true);
  const [isPending, startTransition] = useTransition();

  const form = useForm<CreateNotificationForm>({
    resolver: zodResolver(createNotificationSchema),
    defaultValues: {
      title: '',
      message: '',
      type: 'general',
      priority: 'medium',
      sendToAll: true,
      userId: '',
    },
  });

  const handleClose = () => {
    setIsOpen(false);
    router.back();
  };

  const onSubmit = (data: CreateNotificationForm) => {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append('title', data.title);
        formData.append('message', data.message);
        formData.append('type', data.type);
        formData.append('priority', data.priority);
        formData.append('sendToAll', data.sendToAll.toString());
        if (data.userId && !data.sendToAll) {
          formData.append('userId', data.userId);
        }
        
        const result = await createNotification(formData);
        if (result.success) {
          toast.success('Notification created successfully');
          handleClose();
        } else {
          toast.error(result.error || 'Failed to create notification');
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to create notification');
      }
    });
  };

  const sendToAll = form.watch('sendToAll');

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Create Notification</DialogTitle>
          <DialogDescription>
            Send a notification to users in the system.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter notification title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter notification message" 
                      rows={4}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="system">System</SelectItem>
                        <SelectItem value="appointment">Appointment</SelectItem>
                        <SelectItem value="queue">Queue</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="sendToAll"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Send to All Users</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Send this notification to all users in the system
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {!sendToAll && (
              <FormField
                control={form.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>User ID (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter specific user ID" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClose}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isPending}
              >
                {isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Notification
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}