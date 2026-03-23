
"use client"

import * as React from "react"
import { Search, Plus, LayoutGrid, List, SlidersHorizontal, User, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"
import { KanbanColumn } from "./KanbanColumn"
import { TaskListView } from "./TaskListView"
import { TaskDialog } from "@/components/task/TaskDialog"
import { Task, TaskStatus, COLUMNS, TEAM_MEMBERS } from "@/types/task"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

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

type ViewMode = 'board' | 'list';

export function KanbanBoard() {
  const [tasks, setTasks] = React.useState<Task[]>([])
  const [boardName, setBoardName] = React.useState("SprintSync Board")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [assigneeFilter, setAssigneeFilter] = React.useState("all")
  const [viewMode, setViewMode] = React.useState<ViewMode>('board')
  const [isTaskDialogOpen, setIsTaskDialogOpen] = React.useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false)
  const [selectedTask, setSelectedTask] = React.useState<Task | undefined>()
  const [activeStatus, setActiveStatus] = React.useState<TaskStatus | undefined>()
  const { toast } = useToast()

  React.useEffect(() => {
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

  const handleResetBoard = () => {
    setTasks(INITIAL_TASKS)
    toast({
      title: "Board Reset",
      description: "The board has been restored to its initial state.",
    })
    setIsSettingsOpen(false)
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
            <h1 className="text-xl font-headline font-bold text-primary tracking-tight">{boardName}</h1>
          </div>
          <div className="flex items-center gap-3">
             <Button 
               variant="outline" 
               size="sm" 
               className="hidden sm:flex"
               onClick={() => setIsSettingsOpen(true)}
             >
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
            <Button 
              variant="ghost" 
              size="sm" 
              className={cn(
                "h-7 px-2 rounded-sm transition-all",
                viewMode === 'board' ? "bg-white shadow-sm text-primary" : "text-muted-foreground"
              )}
              onClick={() => setViewMode('board')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className={cn(
                "h-7 px-2 rounded-sm transition-all",
                viewMode === 'list' ? "bg-white shadow-sm text-primary" : "text-muted-foreground"
              )}
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto p-6 scrollbar-thin scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/40">
        {viewMode === 'board' ? (
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
        ) : (
          <div className="max-w-6xl mx-auto">
            <TaskListView tasks={filteredTasks} onTaskClick={handleEditTask} />
          </div>
        )}
      </main>

      {/* Settings Sheet */}
      <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Board Settings</SheetTitle>
            <SheetDescription>
              Manage your workspace and board configuration.
            </SheetDescription>
          </SheetHeader>
          <div className="py-6 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="board-name">Board Name</Label>
              <Input 
                id="board-name" 
                value={boardName} 
                onChange={(e) => setBoardName(e.target.value)}
                placeholder="Enter board name..."
              />
            </div>
            
            <div className="pt-4 border-t">
              <h3 className="text-sm font-semibold mb-3">Statistics</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Total Tasks</p>
                  <p className="text-xl font-bold">{tasks.length}</p>
                </div>
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Filtered</p>
                  <p className="text-xl font-bold">{filteredTasks.length}</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <h3 className="text-sm font-semibold text-destructive mb-3">Danger Zone</h3>
              <Button 
                variant="destructive" 
                className="w-full justify-start"
                onClick={handleResetBoard}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset to Default Tasks
              </Button>
            </div>
          </div>
          <SheetFooter>
            <Button className="w-full" onClick={() => setIsSettingsOpen(false)}>Close</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

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
