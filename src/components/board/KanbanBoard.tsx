
"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Search, Plus, LayoutGrid, List, SlidersHorizontal, User as UserIcon, LogOut, ShieldCheck, Share2, Copy, Check, Hash, Loader2 } from "lucide-react"
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
import { useAuth, useUser, useFirestore } from "@/firebase"
import { signOut } from "firebase/auth"
import { Badge } from "@/components/ui/badge"
import { doc, getDoc, collection, query, where, getDocs, onSnapshot, setDoc, deleteDoc, updateDoc } from "firebase/firestore"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"

interface WorkspaceMember {
  id: string
  name: string
  role: string
}

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
  const [workspaceMembers, setWorkspaceMembers] = React.useState<WorkspaceMember[]>([])
  const [activeBoardId, setActiveBoardId] = React.useState<string | null>(null)
  const [boardData, setBoardData] = React.useState<any>(null)
  
  const auth = useAuth()
  const { user } = useUser()
  const db = useFirestore()
  const router = useRouter()
  const { toast } = useToast()

  const isAdmin = userRole === 'admin'
  const boardTitle = isAdmin ? "All Members Board" : "Project reviewer"
  
  const roomInviteCode = user?.uid || ""

  // 1. Find the active board ID
  React.useEffect(() => {
    const findBoard = async () => {
      if (!user) return
      if (isAdmin) {
        setActiveBoardId(user.uid)
      } else {
        // Students find boards they are members of
        const q = query(collection(db, "boards"), where("memberIds", "array-contains", user.uid))
        const snap = await getDocs(q)
        if (!snap.empty) {
          setActiveBoardId(snap.docs[0].id)
        }
      }
    }
    findBoard()
  }, [user, isAdmin, db])

  // 2. Fetch Board Data for denormalization
  React.useEffect(() => {
    if (!activeBoardId) return
    const unsub = onSnapshot(doc(db, "boards", activeBoardId), (snap) => {
      if (snap.exists()) {
        setBoardData(snap.data())
      }
    })
    return () => unsub()
  }, [activeBoardId, db])

  // 3. Sync Tasks from all columns in real-time with QAP-compliant filters
  React.useEffect(() => {
    if (!activeBoardId || !user) return

    const unsubscribes: (() => void)[] = []

    columns.forEach(colId => {
      const baseCol = collection(db, "boards", activeBoardId, "columns", colId, "tasks")
      
      // Query-Accurate Permissions (QAP): 
      // Firestore rules require queries to have filters that match the authorization logic 
      // when rules depend on resource data fields.
      const q = isAdmin 
        ? query(baseCol, where("ownerId", "==", user.uid))
        : query(baseCol, where("memberIds", "array-contains", user.uid))

      const unsub = onSnapshot(q, 
        (snap) => {
          const colTasks = snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Task))
          setTasks(prev => {
            const otherTasks = prev.filter(t => t.status !== colId)
            return [...otherTasks, ...colTasks].sort((a, b) => 
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )
          })
        },
        async (serverError) => {
          // Handle permission error via central error architecture
          const permissionError = new FirestorePermissionError({
            path: `boards/${activeBoardId}/columns/${colId}/tasks`,
            operation: 'list',
          });
          errorEmitter.emit('permission-error', permissionError);
        }
      )
      unsubscribes.push(unsub)
    })

    return () => unsubscribes.forEach(unsub => unsub())
  }, [activeBoardId, columns, db, isAdmin, user])

  // 4. Fetch workspace members for filtering (Admin only)
  React.useEffect(() => {
    const loadMembers = async () => {
      if (!activeBoardId || !isAdmin) return
      
      try {
        const boardRef = doc(db, "boards", activeBoardId)
        const boardSnap = await getDoc(boardRef)
        
        if (boardSnap.exists()) {
          const bData = boardSnap.data()
          const allMemberIds = Array.from(new Set([bData.ownerId, ...(bData.memberIds || [])]))
          const membersList: WorkspaceMember[] = []
          
          for (const mId of allMemberIds) {
            const uDoc = await getDoc(doc(db, "users", mId))
            if (uDoc.exists()) {
              const uData = uDoc.data()
              membersList.push({
                id: uData.id,
                name: uData.username || "User",
                role: uData.role || "member"
              })
            }
          }
          setWorkspaceMembers(membersList)
        }
      } catch (err) {
        // Error handling for members list if needed
      }
    }

    loadMembers()
  }, [activeBoardId, isAdmin, db])

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

  const handleSaveTask = async (newTask: Task) => {
    if (!activeBoardId || !boardData) return

    const taskRef = doc(db, "boards", activeBoardId, "columns", newTask.status, "tasks", newTask.id)
    
    // If updating and status changed, we need to delete from the old column subcollection
    if (selectedTask && selectedTask.status !== newTask.status) {
      const oldRef = doc(db, "boards", activeBoardId, "columns", selectedTask.status, "tasks", selectedTask.id)
      deleteDoc(oldRef).catch(async (err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: oldRef.path,
          operation: 'delete'
        }));
      });
    }

    const taskData = {
      ...newTask,
      ownerId: boardData.ownerId,
      memberIds: boardData.memberIds || []
    }

    setDoc(taskRef, taskData, { merge: true })
      .catch(async (err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: taskRef.path,
          operation: 'write',
          requestResourceData: taskData
        }));
      });
    
    toast({ 
      title: selectedTask ? "Task Updated" : "Task Created", 
      description: `${newTask.title} has been synchronized.` 
    })
    setIsTaskDialogOpen(false)
  }

  const handleDeleteTask = (taskId: string) => {
    if (!activeBoardId || !selectedTask) return
    
    const taskRef = doc(db, "boards", activeBoardId, "columns", selectedTask.status, "tasks", taskId)
    deleteDoc(taskRef)
      .catch(async (err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: taskRef.path,
          operation: 'delete'
        }));
      });
    
    toast({ 
      variant: "destructive",
      title: "Task Deleted", 
      description: `Task ${taskId} has been removed from Firestore.`,
    })
    setIsTaskDialogOpen(false)
  }

  const handleDropTask = (taskId: string, targetStatus: TaskStatus) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task || !activeBoardId || task.status === targetStatus) return

    const oldRef = doc(db, "boards", activeBoardId, "columns", task.status, "tasks", taskId)
    const newRef = doc(db, "boards", activeBoardId, "columns", targetStatus, "tasks", taskId)

    const updatedTask = { ...task, status: targetStatus }
    
    // Move between subcollections
    setDoc(newRef, updatedTask).catch(async (err) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: newRef.path,
        operation: 'create',
        requestResourceData: updatedTask
      }));
    });

    deleteDoc(oldRef).catch(async (err) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: oldRef.path,
        operation: 'delete'
      }));
    });

    toast({ 
      title: "Task Moved", 
      description: `Moved ${taskId} to ${targetStatus}`,
    })
  }

  const handleEditColumn = (oldName: string, newName: string) => {
    setColumns(columns.map(c => c === oldName ? newName : c))
    toast({ title: "Column Renamed", description: `"${oldName}" is now "${newName}".` })
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
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.push("/login")
    } catch (error: any) {
      toast({ variant: "destructive", title: "Logout Failed", description: error.message })
    }
  }

  const memberNames = workspaceMembers.map(m => m.name)

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
                  <Button variant="outline" className="border-accent text-accent hover:bg-accent hover:text-accent-foreground transition-all shadow-sm">
                    <Share2 className="h-4 w-4 mr-2" />
                    Invite Students
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-5 shadow-2xl border-accent/20 bg-white/95 backdrop-blur-sm">
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <h4 className="text-sm font-bold flex items-center gap-2 text-slate-900">
                        <Hash className="h-4 w-4 text-accent" />
                        Room Invite Code
                      </h4>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Students using this code are forced to join as <strong>Members</strong> only.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Input 
                        readOnly 
                        value={roomInviteCode} 
                        className="h-10 text-xs bg-muted/30 border border-accent/20 font-code text-center font-bold text-slate-900 selection:bg-primary/20"
                      />
                      <Button size="icon" variant="secondary" className="h-10 w-10 shrink-0 shadow-sm" onClick={copyInviteCode}>
                        {hasCopied ? <Check className="h-5 w-5 text-emerald-500" /> : <Copy className="h-5 w-5" />}
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}

            <Button onClick={() => handleAddTask(columns[0] || 'New')} className="bg-primary hover:bg-primary/90 shadow-md">
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full bg-muted/50 border hover:bg-muted/80 transition-colors">
                  <UserIcon className="h-5 w-5 text-primary" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-900">{username || "User"}</span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{userRole}</span>
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
                <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer font-medium">
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
              className="pl-10 h-9 bg-muted/30 border-none focus-visible:ring-1 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          {isAdmin && (
            <div className="flex items-center gap-2">
              <UserIcon className="h-4 w-4 text-muted-foreground" />
              <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                <SelectTrigger className="w-[200px] h-9 bg-muted/30 border-none">
                  <SelectValue placeholder="All Assignees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Members</SelectItem>
                  {workspaceMembers.map(m => (
                    <SelectItem key={m.id} value={m.name}>
                      <div className="flex items-center justify-between w-full gap-2">
                        <span>{m.name}</span>
                        {m.role === 'admin' && (
                          <Badge variant="outline" className="text-[9px] h-4 px-1 uppercase tracking-tighter opacity-70">Admin</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex bg-muted/30 p-1 rounded-md ml-auto border shadow-sm">
            <Button 
              variant="ghost" 
              size="sm" 
              className={cn(
                "h-7 px-2 rounded-sm transition-all",
                viewMode === 'board' ? "bg-white shadow-sm text-primary font-bold" : "text-muted-foreground"
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
                viewMode === 'list' ? "bg-white shadow-sm text-primary font-bold" : "text-muted-foreground"
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
        memberOptions={memberNames}
      />
    </div>
  )
}

interface KanbanBoardProps {
  userRole?: string
  username?: string | null
}
