"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Search, Plus, LayoutGrid, List, SlidersHorizontal, User as UserIcon, LogOut, ShieldCheck } from "lucide-react"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { KanbanColumn } from "./KanbanColumn"
import { TaskListView } from "./TaskListView"
import { TaskDialog } from "@/components/task/TaskDialog"
import { Task, TaskStatus, COLUMNS, TEAM_MEMBERS } from "@/types/task"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { useAuth } from "@/firebase"
import { signOut } from "firebase/auth"
import { Badge } from "@/components/ui/badge"

const INITIAL_TASKS: Task[] = [
  {
    id: "SYN-101",
    title: "Project Discovery and Architecture Design",
    description: "Initial research phase for the SprintSync platform including tech stack evaluation.",
    status: "Resolved",
    assignee: "Alex Rivera",
    dueDate: "2024-05-20",
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
    dueDate: "2024-06-15",
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
    dueDate: "2024-07-01",
    acceptanceCriteria: ["Prompt engineering done", "UI button integrated"],
    subTasks: ["Write Genkit flows", "Add loading states"],
    createdAt: new Date().toISOString()
  }
]

type ViewMode = 'board' | 'list';

interface KanbanBoardProps {
  userRole?: string
  username?: string | null
}

export function KanbanBoard({ userRole, username }: KanbanBoardProps) {
  const [tasks, setTasks] = React.useState<Task[]>([])
  const [searchQuery, setSearchQuery] = React.useState("")
  const [assigneeFilter, setAssigneeFilter] = React.useState("all")
  const [viewMode, setViewMode] = React.useState<ViewMode>('board')
  const [isTaskDialogOpen, setIsTaskDialogOpen] = React.useState(false)
  const [selectedTask, setSelectedTask] = React.useState<Task | undefined>()
  const [activeStatus, setActiveStatus] = React.useState<TaskStatus | undefined>()
  
  const auth = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  React.useEffect(() => {
    setTasks(INITIAL_TASKS)
  }, [])

  const isAdmin = userRole === 'admin'
  const boardTitle = isAdmin ? "All Members Board" : "My Workspace"

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

  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.push("/login")
    } catch (error: any) {
      toast({ variant: "destructive", title: "Logout Failed", description: error.message })
    }
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {/* Top Header/Toolbar */}
      <header className="border-b bg-white px-6 py-4 flex flex-col gap-4 shadow-sm relative z-20">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center shadow-lg transform -rotate-3">
              <LayoutGrid className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-primary tracking-tight">{boardTitle}</h1>
                {isAdmin ? (
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20 gap-1">
                    <ShieldCheck className="h-3 w-3" />
                    Teacher Admin
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px] h-4">
                    Student Member
                  </Badge>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
                {isAdmin ? "Global Oversight View" : "Personal Contributor Workspace"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={() => handleAddTask('New')} className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full bg-muted/50 border">
                  <UserIcon className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="font-bold">{username || "User"}</span>
                    <span className="text-[10px] text-muted-foreground uppercase">{userRole}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="cursor-pointer">
                    <SlidersHorizontal className="h-4 w-4 mr-2" />
                    Board Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search tasks or IDs..." 
              className="pl-10 h-9 bg-muted/30 border-none focus-visible:ring-1"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <UserIcon className="h-4 w-4 text-muted-foreground" />
            <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
              <SelectTrigger className="w-[180px] h-9 bg-muted/30 border-none">
                <SelectValue placeholder="All Assignees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Members</SelectItem>
                {TEAM_MEMBERS.map(m => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex bg-muted/30 p-1 rounded-md ml-auto border">
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
      <main className="flex-1 overflow-auto p-6 scrollbar-thin scrollbar-thumb-muted-foreground/20">
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
