"use client"

import * as React from "react"
import { Search, Filter, Plus, LayoutGrid, List, SlidersHorizontal, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { KanbanColumn } from "./KanbanColumn"
import { TaskDialog } from "@/components/task/TaskDialog"
import { Task, TaskStatus, COLUMNS, TEAM_MEMBERS } from "@/types/task"
import { useToast } from "@/hooks/use-toast"

const INITIAL_TASKS: Task[] = [
  {
    id: "SYN-101",
    title: "Project Discovery and Architecture Design",
    description: "Initial research phase for the SprintSync platform including tech stack evaluation.",
    status: "Resolved",
    assignee: "Alex Rivera",
    dueDate: "2024-05-20T00:00:00Z",
    acceptanceCriteria: ["Tech stack finalized", "System diagram approved"],
    subTasks: ["Research Genkit", "Define API schema"],
    createdAt: new Date().toISOString()
  },
  {
    id: "SYN-102",
    title: "Implement Core Kanban UI",
    description: "Create the responsive grid layout for the board columns and task cards.",
    status: "In Development",
    assignee: "Jordan Smith",
    dueDate: "2024-06-15T00:00:00Z",
    acceptanceCriteria: ["Drag and drop works", "Responsive layout"],
    subTasks: ["Column component", "Card component"],
    createdAt: new Date().toISOString()
  },
  {
    id: "SYN-103",
    title: "AI Task Elaboration Service",
    description: "Integrate Gemini models to help users flesh out thin task descriptions.",
    status: "New",
    assignee: "Taylor Chen",
    dueDate: "2024-07-01T00:00:00Z",
    acceptanceCriteria: ["Prompt engineering done", "UI button integrated"],
    subTasks: ["Write Genkit flows", "Add loading states"],
    createdAt: new Date().toISOString()
  }
]

export function KanbanBoard() {
  const [tasks, setTasks] = React.useState<Task[]>([])
  const [searchQuery, setSearchQuery] = React.useState("")
  const [assigneeFilter, setAssigneeFilter] = React.useState("all")
  const [isTaskDialogOpen, setIsTaskDialogOpen] = React.useState(false)
  const [selectedTask, setSelectedTask] = React.useState<Task | undefined>()
  const [activeStatus, setActiveStatus] = React.useState<TaskStatus | undefined>()
  const { toast } = useToast()

  React.useEffect(() => {
    // Simulate loading
    setTasks(INITIAL_TASKS)
  }, [])

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          task.id.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesAssignee = assigneeFilter === "all" || task.assignee === assigneeFilter
    return matchesSearch && matchesAssignee
  })

  const handleAddTask = (status: TaskStatus) => {
    setSelectedTask(undefined)
    setActiveStatus(status)
    setIsTaskDialogOpen(true)
  }

  const handleEditTask = (task: Task) => {
    setSelectedTask(task)
    setIsTaskDialogOpen(true)
  }

  const handleSaveTask = (newTask: Task) => {
    if (selectedTask) {
      setTasks(tasks.map(t => t.id === newTask.id ? newTask : t))
      toast({ title: "Task Updated", description: `${newTask.id} has been saved successfully.` })
    } else {
      setTasks([...tasks, newTask])
      toast({ title: "Task Created", description: `${newTask.title} added to ${newTask.status}.` })
    }
    setIsTaskDialogOpen(false)
  }

  const handleDropTask = (taskId: string, targetStatus: TaskStatus) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task || task.status === targetStatus) return

    setTasks(tasks.map(t => t.id === taskId ? { ...t, status: targetStatus } : t))
    toast({ 
      title: "Task Moved", 
      description: `Moved ${taskId} to ${targetStatus}`,
    })
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {/* Top Header/Toolbar */}
      <header className="border-b bg-white px-6 py-4 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
              <LayoutGrid className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl font-headline font-bold text-primary tracking-tight">SprintSync Board</h1>
          </div>
          <div className="flex items-center gap-3">
             <Button variant="outline" size="sm" className="hidden sm:flex">
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button onClick={() => handleAddTask('New')} className="bg-accent hover:bg-accent/90">
              <Plus className="h-4 w-4 mr-2" />
              New Item
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Filter by title or ID..." 
              className="pl-10 h-9 bg-muted/30"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
              <SelectTrigger className="w-[180px] h-9 bg-muted/30">
                <SelectValue placeholder="All Assignees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assignees</SelectItem>
                {TEAM_MEMBERS.map(m => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex bg-muted/30 p-1 rounded-md ml-auto">
            <Button variant="ghost" size="sm" className="h-7 px-2 rounded-sm bg-white shadow-sm text-primary">
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 px-2 rounded-sm text-muted-foreground">
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Kanban Scroll Area - Changed to allow vertical scrolling */}
      <main className="flex-1 overflow-auto p-6 scrollbar-thin scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/40">
        <div className="flex gap-6 h-full min-w-max">
          {COLUMNS.map((status) => (
            <KanbanColumn 
              key={status}
              status={status}
              tasks={filteredTasks.filter(t => t.status === status)}
              onAddTask={handleAddTask}
              onTaskClick={handleEditTask}
              onDropTask={handleDropTask}
            />
          ))}
        </div>
      </main>

      <TaskDialog 
        open={isTaskDialogOpen} 
        onOpenChange={setIsTaskDialogOpen} 
        task={selectedTask}
        onSave={handleSaveTask}
        defaultStatus={activeStatus}
      />
    </div>
  )
}
