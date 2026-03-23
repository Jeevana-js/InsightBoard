"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { CalendarIcon, Loader2, Sparkles, Plus, Trash2 } from "lucide-react"
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
  FormDescription,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Task, TaskStatus, TEAM_MEMBERS, COLUMNS } from "@/types/task"
import { generateTaskDetails } from "@/ai/flows/ai-task-description-generator"

const taskSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  status: z.enum(['New', 'In Development', 'Resolved', 'Closed']),
  assignee: z.string().optional(),
  dueDate: z.date().optional(),
})

interface TaskDialogProps {
  task?: Task
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (task: Task) => void
  defaultStatus?: TaskStatus
}

export function TaskDialog({ task, open, onOpenChange, onSave, defaultStatus }: TaskDialogProps) {
  const [isAiGenerating, setIsAiGenerating] = React.useState(false)
  const [subTasks, setSubTasks] = React.useState<string[]>(task?.subTasks || [])
  const [acceptanceCriteria, setAcceptanceCriteria] = React.useState<string[]>(task?.acceptanceCriteria || [])

  const form = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task?.title || "",
      description: task?.description || "",
      status: task?.status || defaultStatus || 'New',
      assignee: task?.assignee || "",
      dueDate: task?.dueDate ? new Date(task.dueDate) : undefined,
    },
  })

  React.useEffect(() => {
    if (open) {
      form.reset({
        title: task?.title || "",
        description: task?.description || "",
        status: task?.status || defaultStatus || 'New',
        assignee: task?.assignee || "",
        dueDate: task?.dueDate ? new Date(task.dueDate) : undefined,
      })
      setSubTasks(task?.subTasks || [])
      setAcceptanceCriteria(task?.acceptanceCriteria || [])
    }
  }, [open, task, defaultStatus, form])

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
      setSubTasks(result.suggestedSubTasks)
      setAcceptanceCriteria(result.acceptanceCriteria)
    } catch (error) {
      console.error("AI Generation failed", error)
    } finally {
      setIsAiGenerating(false)
    }
  }

  const onSubmit = (values: z.infer<typeof taskSchema>) => {
    const newTask: Task = {
      id: task?.id || Math.random().toString(36).substr(2, 9),
      title: values.title,
      description: values.description || "",
      status: values.status,
      assignee: values.assignee,
      dueDate: values.dueDate?.toISOString(),
      acceptanceCriteria,
      subTasks,
      createdAt: task?.createdAt || new Date().toISOString(),
    }
    onSave(newTask)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {task ? "Edit Task" : "Create New Task"}
            <span className="text-xs font-normal text-muted-foreground ml-2">ID: {task?.id || 'NEW'}</span>
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Title</FormLabel>
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
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {COLUMNS.map((status) => (
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
                    <FormLabel>Assignee</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TEAM_MEMBERS.map((member) => (
                          <SelectItem key={member} value={member}>{member}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Due Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date("1900-01-01")}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
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
                    <Textarea 
                      placeholder="What needs to be done?" 
                      className="min-h-[120px] resize-none" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-semibold">Acceptance Criteria</h3>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setAcceptanceCriteria([...acceptanceCriteria, ""])}>
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
                <div className="space-y-2">
                  {acceptanceCriteria.map((item, index) => (
                    <div key={index} className="flex gap-2">
                      <Input 
                        value={item} 
                        onChange={(e) => {
                          const newCriteria = [...acceptanceCriteria]
                          newCriteria[index] = e.target.value
                          setAcceptanceCriteria(newCriteria)
                        }}
                        className="text-sm"
                        placeholder="Criteria statement..."
                      />
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setAcceptanceCriteria(acceptanceCriteria.filter((_, i) => i !== index))}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  {acceptanceCriteria.length === 0 && <p className="text-xs text-muted-foreground italic">No criteria defined.</p>}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-semibold">Sub-Tasks</h3>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setSubTasks([...subTasks, ""])}>
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
                <div className="space-y-2">
                  {subTasks.map((item, index) => (
                    <div key={index} className="flex gap-2">
                      <Input 
                        value={item} 
                        onChange={(e) => {
                          const newSub = [...subTasks]
                          newSub[index] = e.target.value
                          setSubTasks(newSub)
                        }}
                        className="text-sm"
                        placeholder="Subtask description..."
                      />
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setSubTasks(subTasks.filter((_, i) => i !== index))}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  {subTasks.length === 0 && <p className="text-xs text-muted-foreground italic">No sub-tasks defined.</p>}
                </div>
              </div>
            </div>

            <DialogFooter className="pt-4 sticky bottom-0 bg-background">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit">{task ? "Update Task" : "Create Task"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}