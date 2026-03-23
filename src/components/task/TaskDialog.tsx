"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, Sparkles, Trash2 } from "lucide-react"
import { format } from "date-fns"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Task, TaskStatus, INITIAL_COLUMNS } from "@/types/task"
import { generateTaskDetails } from "@/ai/flows/ai-task-description-generator"

const taskSchema = z.object({
  title: z.string().min(1, "Title is required").min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  status: z.string().min(1, "Status is required"),
  assignee: z.string().min(1, "Assignee is required"),
  dueDate: z.string().min(1, "Due Date is required"),
})

interface TaskDialogProps {
  task?: Task
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (task: Task) => void
  onDelete?: (taskId: string) => void
  defaultStatus?: TaskStatus
  currentUsername?: string
  columnOptions?: string[]
}

export function TaskDialog({ 
  task, 
  open, 
  onOpenChange, 
  onSave, 
  onDelete,
  defaultStatus, 
  currentUsername,
  columnOptions = INITIAL_COLUMNS
}: TaskDialogProps) {
  const [isAiGenerating, setIsAiGenerating] = React.useState(false)

  const form = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task?.title || "",
      description: task?.description || "",
      status: task?.status || defaultStatus || columnOptions[0] || 'New',
      assignee: task?.assignee || currentUsername || "",
      dueDate: task?.dueDate ? format(new Date(task.dueDate), "yyyy-MM-dd") : "",
    },
  })

  React.useEffect(() => {
    if (open) {
      form.reset({
        title: task?.title || "",
        description: task?.description || "",
        status: task?.status || defaultStatus || columnOptions[0] || 'New',
        assignee: task?.assignee || currentUsername || "",
        dueDate: task?.dueDate ? format(new Date(task.dueDate), "yyyy-MM-dd") : "",
      })
    }
  }, [open, task, defaultStatus, form, currentUsername, columnOptions])

  const handleAiGenerate = async () => {
    const title = form.getValues("title")
    if (!title || title.length < 3) {
      form.setError("title", { message: "Enter a title first for AI to work with" })
      return
    }

    setIsAiGenerating(true)
    try {
      const result = await generateTaskDetails({ taskTitle: title })
      form.setValue("description", result.detailedDescription)
    } catch (error) {
      console.error("AI Generation failed", error)
    } finally {
      setIsAiGenerating(false)
    }
  }

  const onSubmit = (values: z.infer<typeof taskSchema>) => {
    const newTask: Task = {
      id: task?.id || Math.random().toString(36).substr(2, 9).toUpperCase(),
      title: values.title,
      description: values.description || "",
      status: values.status,
      assignee: values.assignee,
      dueDate: values.dueDate ? new Date(values.dueDate).toISOString() : undefined,
      createdAt: task?.createdAt || new Date().toISOString(),
    }
    onSave(newTask)
    onOpenChange(false)
  }

  const handleDelete = () => {
    if (task && onDelete) {
      onDelete(task.id)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {task ? "Edit Task" : "Create New Task"}
              <span className="text-xs font-normal text-muted-foreground ml-2">ID: {task?.id || 'NEW'}</span>
            </div>
            {task && (
              <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={handleDelete}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-y-auto px-6 py-2">
            <div className="space-y-6 pb-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Title *</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input placeholder="e.g. Implement OAuth2 Login" {...field} />
                        </FormControl>
                        <Button 
                          type="button" 
                          variant="secondary" 
                          className="shrink-0 font-headline"
                          onClick={handleAiGenerate}
                          disabled={isAiGenerating}
                        >
                          {isAiGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4 text-accent" />}
                          Magic Build
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {columnOptions.map((status) => (
                            <SelectItem key={status} value={status}>{status}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="assignee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assignee *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} className="w-full" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Detailed Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="What needs to be done?" className="min-h-[240px] resize-none" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <DialogFooter className="sticky bottom-0 z-10 -mx-6 mt-auto p-6 border-t bg-background/80 backdrop-blur-md">
              <div className="flex justify-end gap-3 w-full">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button type="submit">{task ? "Update Task" : "Create Task"}</Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
