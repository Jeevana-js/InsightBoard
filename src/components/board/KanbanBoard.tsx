
"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Search, Plus, LayoutGrid, List, SlidersHorizontal, User as UserIcon, LogOut, ShieldCheck, Share2, Copy, Check, Hash } from "lucide-react"
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { KanbanColumn } from "./KanbanColumn"
import { TaskListView } from "./TaskListView"
import { TaskDialog } from "@/components/task/TaskDialog"
import { Task, TaskStatus, INITIAL_COLUMNS } from "@/types/task"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { useAuth, useUser } from "@/firebase"
import { signOut } from "firebase/auth"
import { Badge } from "@/components/ui/badge"

export function KanbanBoard({ userRole, username }: KanbanBoardProps) {
  const [tasks, setTasks] = React.useState<Task[]>([])
  const [columns, setColumns] = React.useState<string[]>(INITIAL_COLUMNS)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [assigneeFilter, setAssigneeFilter] = React.useState("all")
  const [viewMode, setViewMode] = React.useState<'board' | 'list'>('board')
  const [isTaskDialogOpen, setIsTaskDialogOpen] = React.useState(false)
  const [selectedTask, setSelectedTask] = React.useState<Task | undefined>()
  const [activeStatus, setActiveStatus] = React.useState<TaskStatus | undefined>()
  const [hasCopied, setHasCopied] = React.useState(false)
  
  const auth = useAuth()
  const { user } = useUser()
  const router = useRouter()
  const { toast } = useToast()

  const isAdmin = userRole === 'admin'
  const boardTitle = isAdmin ? "All Members Board" : "Project reviewer"
  
  const roomInviteCode = user?.uid || ""

  const copyInviteCode = () => {
    navigator.clipboard.writeText(roomInviteCode)
    setHasCopied(true)
    toast({
      title: "Invite Code Copied",
      description: "Students can now use this code to join your room during signup.",
    })
    setTimeout(() => setHasCopied(false), 2000)
  }

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
    setIsTaskDialogOpen(true)
    setSelectedTask(task)
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

  const handleDeleteTask = (taskId: string) => {
    setTasks(tasks.filter(t => t.id !== taskId))
    toast({ 
      variant: "destructive",
      title: "Task Deleted", 
      description: `Task ${taskId} has been removed.`,
    })
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

  const handleEditColumn = (oldName: string, newName: string) => {
    setColumns(columns.map(c => c === oldName ? newName : c))
    setTasks(tasks.map(t => t.status === oldName ? { ...t, status: newName } : t))
    toast({
      title: "Column Renamed",
      description: `"${oldName}" is now "${newName}".`,
    })
  }

  const handleDeleteColumn = (name: string) => {
    const columnTasks = tasks.filter(t => t.status === name)
    if (columnTasks.length > 0) {
      toast({
        variant: "destructive",
        title: "Cannot Delete Column",
        description: `Please move or delete the ${columnTasks.length} task(s) in "${name}" first.`,
      })
      return
    }
    setColumns(columns.filter(c => c !== name))
    toast({
      variant: "destructive",
      title: "Column Removed",
      description: `"${name}" has been deleted.`,
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

  const availableAssignees = React.useMemo(() => {
    const names = new Set<string>()
    if (username) names.add(username)
    tasks.forEach(t => { if (t.assignee) names.add(t.assignee) })
    return Array.from(names)
  }, [tasks, username])

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
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
            {isAdmin && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="border-accent text-accent hover:bg-accent hover:text-white transition-all">
                    <Share2 className="h-4 w-4 mr-2" />
                    Invite Students
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4 shadow-xl border-accent/20">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold flex items-center gap-2">
                        <Hash className="h-3 w-3" />
                        Room Invite Code
                      </h4>
                      <p className="text-[10px] text-muted-foreground">
                        Students using this code are forced to join as <strong>Members</strong> only.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Input 
                        readOnly 
                        value={roomInviteCode} 
                        className="h-8 text-[10px] bg-muted/50 border-none font-code text-center"
                      />
                      <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={copyInviteCode}>
                        {hasCopied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}

            <Button onClick={() => handleAddTask(columns[0] || 'New')} className="bg-primary hover:bg-primary/90">
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
          
          {isAdmin && (
            <div className="flex items-center gap-2">
              <UserIcon className="h-4 w-4 text-muted-foreground" />
              <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                <SelectTrigger className="w-[180px] h-9 bg-muted/30 border-none">
                  <SelectValue placeholder="All Assignees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Members</SelectItem>
                  {availableAssignees.map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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

      <main className="flex-1 overflow-auto p-6">
        {viewMode === 'board' ? (
          <div className="flex gap-6 h-full min-w-max">
            {columns.map((status, index) => (
              <KanbanColumn 
                key={status}
                status={status}
                tasks={filteredTasks.filter(t => t.status === status)}
                onAddTask={handleAddTask}
                onTaskClick={handleEditTask}
                onDropTask={handleDropTask}
                onEditColumn={handleEditColumn}
                onDeleteColumn={handleDeleteColumn}
                showAddButton={index === 0}
              />
            ))}
            {columns.length < 10 && (
              <Button 
                variant="ghost" 
                className="h-fit py-4 px-8 border-2 border-dashed border-muted text-muted-foreground hover:border-accent hover:text-accent transition-all rounded-xl"
                onClick={() => {
                  const newName = `Phase ${columns.length + 1}`
                  setColumns([...columns, newName])
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Column
              </Button>
            )}
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
        onDelete={handleDeleteTask}
        defaultStatus={activeStatus}
        currentUsername={username || undefined}
        columnOptions={columns}
      />
    </div>
  )
}

interface KanbanBoardProps {
  userRole?: string
  username?: string | null
}
