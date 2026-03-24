"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, Sparkles, Trash2, MessageSquareQuote } from "lucide-react"
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
import { useUser } from "@/firebase"

const taskSchema = z.object({
  title: z.string().min(1, "Title is required").min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  status: z.string().min(1, "Status is required"),
  assignee: z.string().min(1, "Assignee is required"),
  dueDate: z.string().min(1, "Due Date is required"),
  teacherComment: z.string().optional(),
})

interface TaskDialogProps {
  task?: Task
  tasks?: Task[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (task: Task) => void
  onDelete?: (taskId: string) => void
  defaultStatus?: TaskStatus
  currentUsername?: string
  userRollNumber?: string
  columnOptions?: string[]
  memberOptions?: string[]
  isAdmin?: boolean
}

export function TaskDialog({ 
  task,
  tasks = [],
  open, 
  onOpenChange, 
  onSave, 
  onDelete,
  defaultStatus, 
  currentUsername,
  userRollNumber,
  columnOptions = INITIAL_COLUMNS,
  memberOptions = [],
  isAdmin = false
}: TaskDialogProps) {
  const [isAiGenerating, setIsAiGenerating] = React.useState(false)
  const { user } = useUser()

  const form = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task?.title || "",
      description: task?.description || "",
      status: task?.status || defaultStatus || columnOptions[0] || 'New',
      assignee: task?.assignee || currentUsername || "",
      dueDate: task?.dueDate ? format(new Date(task.dueDate), "yyyy-MM-dd") : "",
      teacherComment: task?.teacherComment || "",
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
        teacherComment: task?.teacherComment || "",
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

  const generateRollId = () => {
    const baseId = userRollNumber || "225001";
    // Filter tasks that belong to this user (based on the baseId prefix)
    const userTasks = tasks.filter(t => t.id.startsWith(baseId));
    
    // Find the highest suffix number used so far
    let maxNum = 0;
    userTasks.forEach(t => {
      const parts = t.id.split('-');
      if (parts.length > 1) {
        const num = parseInt(parts[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });

    const nextNum = maxNum + 1;
    return `${baseId}-${nextNum.toString().padStart(2, '0')}`;
  }

  const onSubmit = (values: z.infer<typeof taskSchema>) => {
    if (!user) return;
    
    const newTask: Task = {
      id: task?.id || generateRollId(),
      title: values.title,
      description: values.description || "",
      status: values.status,
      assignee: values.assignee,
      dueDate: values.dueDate ? new Date(values.dueDate).toISOString() : undefined,
      createdAt: task?.createdAt || new Date().toISOString(),
      teacherComment: values.teacherComment || "",
      creatorId: task?.creatorId || user.uid,
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
              <span className="text-foreground">{task ? "Edit Task" : "Create New Task"}</span>
              <span className="text-xs font-normal text-muted-foreground ml-2">ID: {task?.id || 'NEW'}</span>
            </div>
            {task && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors md:hidden" 
                onClick={handleDelete}
              >
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
                      <FormLabel className="text-foreground">Title *</FormLabel>
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
                      <FormLabel className="text-foreground">Status *</FormLabel>
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
                      <FormLabel className="text-foreground">Assignee *</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        disabled={!isAdmin}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select assignee" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {memberOptions && memberOptions.length > 0 ? (
                            memberOptions.map((name) => (
                                <SelectItem key={name} value={name}>{name}</SelectItem>
                            ))
                          ) : (
                            <SelectItem value={currentUsername || "User"}>{currentUsername || "User"}</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      {!isAdmin && (
                        <p className="text-[10px] text-muted-foreground italic px-1">
                          Only administrators can reassign tasks.
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Due Date *</FormLabel>
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
                    <FormLabel className="text-foreground">Detailed Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="What needs to be done?" className="min-h-[160px] resize-none" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="teacherComment"
                render={({ field }) => (
                  <FormItem className="bg-amber-50/50 dark:bg-amber-950/20 p-4 rounded-xl border border-amber-100 dark:border-amber-900/50 space-y-3">
                    <FormLabel className="text-amber-900 dark:text-amber-400 flex items-center gap-2 font-bold">
                      <MessageSquareQuote className="h-4 w-4" />
                      Teacher&apos;s Feedback & Comments
                    </FormLabel>
                    <FormControl>
                      {isAdmin ? (
                        <Textarea 
                          placeholder="Add feedback for the student..." 
                          className="min-h-[120px] resize-none bg-white dark:bg-card border-amber-200 dark:border-amber-900/50 focus-visible:ring-amber-400" 
                          {...field} 
                        />
                      ) : (
                        <div className="p-3 bg-white/80 dark:bg-card/80 rounded-lg border border-amber-100 dark:border-amber-900/50 min-h-[80px] text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap italic">
                          {field.value || "No feedback provided yet."}
                        </div>
                      )}
                    </FormControl>
                    <p className="text-[10px] text-amber-700/70 dark:text-amber-400/70 italic px-1">
                      {isAdmin ? "Only you can edit this section." : "Only your teacher can edit this section."}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <DialogFooter className="sticky bottom-0 z-10 -mx-6 mt-auto p-6 border-t bg-background/80 backdrop-blur-md">
              <div className="flex items-center justify-end gap-3 w-full">
                {task && (
                  <Button 
                    type="button" 
                    variant="ghost" 
                    className="mr-auto text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors"
                    onClick={handleDelete}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Task
                  </Button>
                )}
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