"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Search, Plus, LayoutGrid, List, SlidersHorizontal, User as UserIcon, LogOut, ShieldCheck, Share2, Copy, Check, Hash, Loader2, AlertCircle, Users, ChevronLeft, BarChart3 } from "lucide-react"
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
import { doc, getDoc, collection, query, where, getDocs, onSnapshot, setDoc, deleteDoc } from "firebase/firestore"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AnalyticsDashboard } from "./AnalyticsDashboard"
import Link from "next/link"

interface WorkspaceMember {
  id: string
  name: string
  role: string
}

interface KanbanBoardProps {
  boardId: string
  userRole?: string
  username?: string | null
  rollNumber?: string
  onBack?: () => void
}

export function KanbanBoard({ boardId, userRole, username, rollNumber, onBack }: KanbanBoardProps) {
  const [tasks, setTasks] = React.useState<Task[]>([])
  const [columns, setColumns] = React.useState<string[]>(INITIAL_COLUMNS)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [assigneeFilter, setAssigneeFilter] = React.useState("all")
  const [viewMode, setViewMode] = React.useState<'board' | 'list' | 'analytics'>('board')
  const [isTaskDialogOpen, setIsTaskDialogOpen] = React.useState(false)
  const [selectedTask, setSelectedTask] = React.useState<Task | undefined>()
  const [activeStatus, setActiveStatus] = React.useState<TaskStatus | undefined>()
  const [hasCopied, setHasCopied] = React.useState(false)
  const [workspaceMembers, setWorkspaceMembers] = React.useState<WorkspaceMember[]>([])
  const [boardData, setBoardData] = React.useState<any>(null)
  const [isAccessRevoked, setIsAccessRevoked] = React.useState(false)
  
  const activeBoardId = boardId

  const auth = useAuth()
  const { user } = useUser()
  const db = useFirestore()
  const router = useRouter()
  const { toast } = useToast()

  const isAdmin = userRole === 'admin'
  const isBoardOwner = boardData?.ownerId === user?.uid
  const boardTitle = boardData?.title || (isBoardOwner ? "All Members Board" : "My workspace")
  
  const roomInviteCode = boardData?.inviteCode || activeBoardId || ""

  // Sync board data and handle access revocation
  React.useEffect(() => {
    if (!activeBoardId || !user) return
    const unsub = onSnapshot(doc(db, "boards", activeBoardId), (snap) => {
      if (snap.exists()) {
        const data = snap.data()
        setBoardData(data)
        
        const isOwner = data.ownerId === user.uid
        const isMember = data.memberIds?.includes(user.uid)
        
        if (!isOwner && !isMember) {
          setIsAccessRevoked(true)
        } else {
          setIsAccessRevoked(false)
        }
      } else {
        setIsAccessRevoked(true)
      }
    }, (err) => {
       console.error("Board sync failed", err);
    })
    return () => unsub()
  }, [activeBoardId, db, user])

  // Ref-based task map to merge results from multiple listeners without race conditions
  const taskMapRef = React.useRef<Map<string, Task>>(new Map())

  const rebuildTasksFromMap = React.useCallback(() => {
    const allTasks = Array.from(taskMapRef.current.values())
    allTasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    setTasks(allTasks)
  }, [])

  // Sync tasks with privacy logic
  React.useEffect(() => {
    if (!activeBoardId || !user || isAccessRevoked || !boardData) return

    // Clear task map when dependencies change
    taskMapRef.current.clear()
    setTasks([])

    const unsubscribes: (() => void)[] = []

    columns.forEach(colId => {
      const baseCol = collection(db, "boards", activeBoardId, "columns", colId, "tasks")
      
      if (boardData.ownerId === user.uid || isAdmin) {
        // Admin (board owner or promoted admin) sees all tasks on the board
        const q = query(baseCol, where("ownerId", "==", boardData.ownerId))
        const unsub = onSnapshot(q, 
          (snap) => {
            // Remove old tasks from this column first
            for (const [id, t] of taskMapRef.current) {
              if (t.status === colId) taskMapRef.current.delete(id)
            }
            snap.docs.forEach(d => {
              taskMapRef.current.set(d.id, { ...d.data(), id: d.id } as Task)
            })
            rebuildTasksFromMap()
          },
          async () => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
              path: `boards/${activeBoardId}/columns/${colId}/tasks`,
              operation: 'list',
            }));
          }
        )
        unsubscribes.push(unsub)
      } else {
        // Member: query tasks they created
        const qCreated = query(baseCol, where("creatorId", "==", user.uid))
        const unsub1 = onSnapshot(qCreated, 
          (snap) => {
            snap.docs.forEach(d => {
              taskMapRef.current.set(d.id, { ...d.data(), id: d.id } as Task)
            })
            // Remove tasks from this column+query that no longer exist
            const createdIds = new Set(snap.docs.map(d => d.id))
            for (const [id, t] of taskMapRef.current) {
              if (t.status === colId && t.creatorId === user.uid && !createdIds.has(id)) {
                // Only remove if not also assigned to this user
                if (t.assigneeId !== user.uid) taskMapRef.current.delete(id)
              }
            }
            rebuildTasksFromMap()
          },
          async () => {}
        )
        unsubscribes.push(unsub1)

        // Member: query tasks assigned to them
        const qAssigned = query(baseCol, where("assigneeId", "==", user.uid))
        const unsub2 = onSnapshot(qAssigned, 
          (snap) => {
            console.log(`[DEBUG] assigneeId query for col=${colId}, uid=${user.uid}, found=${snap.docs.length}`, snap.docs.map(d => ({id: d.id, assigneeId: d.data().assigneeId, assignee: d.data().assignee})))
            snap.docs.forEach(d => {
              taskMapRef.current.set(d.id, { ...d.data(), id: d.id } as Task)
            })
            // Remove tasks from this column+query that no longer exist
            const assignedIds = new Set(snap.docs.map(d => d.id))
            for (const [id, t] of taskMapRef.current) {
              if (t.status === colId && t.assigneeId === user.uid && !assignedIds.has(id)) {
                // Only remove if not also created by this user
                if (t.creatorId !== user.uid) taskMapRef.current.delete(id)
              }
            }
            rebuildTasksFromMap()
          },
          async (err) => { console.error('[DEBUG] assigneeId query ERROR:', colId, err) }
        )
        unsubscribes.push(unsub2)
      }
    })

    return () => unsubscribes.forEach(unsub => unsub())
  }, [activeBoardId, columns, db, user, isAccessRevoked, boardData, rebuildTasksFromMap])

  // Backfill assigneeId for older tasks that only have assignee name (admin only)
  React.useEffect(() => {
    if (!activeBoardId || !boardData || !user || (boardData.ownerId !== user.uid && !isAdmin)) return
    if (workspaceMembers.length === 0 || tasks.length === 0) return

    tasks.forEach(task => {
      if (task.assignee && !task.assigneeId) {
        const member = workspaceMembers.find(m => m.name === task.assignee)
        console.log(`[DEBUG] Backfill: task=${task.id}, assignee="${task.assignee}", foundMember=`, member)
        if (member) {
          const taskRef = doc(db, "boards", activeBoardId, "columns", task.status, "tasks", task.id)
          setDoc(taskRef, { assigneeId: member.id }, { merge: true }).catch((err) => console.error('[DEBUG] Backfill write error:', err))
        }
      } else {
        console.log(`[DEBUG] Task ${task.id}: assignee="${task.assignee}", assigneeId="${task.assigneeId}" (no backfill needed)`)
      }
    })
  }, [tasks, workspaceMembers, activeBoardId, boardData, user, db])

  // Load workspace members
  React.useEffect(() => {
    if (!boardData || !db || isAccessRevoked) return
    
    const loadMembers = async () => {
      try {
        const allMemberIds = Array.from(new Set([boardData.ownerId, ...(boardData.memberIds || [])]))
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
      } catch (err) {
      }
    }

    loadMembers()
  }, [boardData, db, isAccessRevoked])

  const copyInviteCode = () => {
    if (!roomInviteCode) return
    navigator.clipboard.writeText(roomInviteCode)
    setHasCopied(true)
    toast({
      title: "Invite Code Copied",
      description: "Members can now use this code to join your room during signup.",
    })
    setTimeout(() => setHasCopied(false), 2000)
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.push("/login")
    } catch (error: any) {
      toast({ variant: "destructive", title: "Logout Failed", description: error.message })
    }
  }

  // Auto-redirect removed members back to dashboard
  React.useEffect(() => {
    if (!isAccessRevoked) return
    toast({
      variant: "destructive",
      title: "Access Revoked",
      description: "You are no longer a member of this room.",
    })
    if (onBack) {
      onBack()
    } else {
      signOut(auth).then(() => {
        router.push("/login")
      }).catch(() => {
        router.push("/login")
      })
    }
  }, [isAccessRevoked, auth, router, toast, onBack])

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
    if (!activeBoardId || !boardData || !user) return

    const taskRef = doc(db, "boards", activeBoardId, "columns", newTask.status, "tasks", newTask.id)
    
    // Handle status change by moving the document
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
      memberIds: boardData.memberIds || [],
      creatorId: selectedTask?.creatorId || user.uid,
      assigneeId: newTask.assigneeId || workspaceMembers.find(m => m.name === newTask.assignee)?.id || user.uid,
      updatedAt: new Date().toISOString()
    }

    console.log('[DEBUG] Saving task:', { id: taskData.id, assignee: taskData.assignee, assigneeId: taskData.assigneeId, creatorId: taskData.creatorId, ownerId: taskData.ownerId })

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
      description: `Task ${taskId} has been removed.`,
    })
    setIsTaskDialogOpen(false)
  }

  const handleDropTask = (taskId: string, targetStatus: TaskStatus) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task || !activeBoardId || !boardData || task.status === targetStatus) return

    const oldRef = doc(db, "boards", activeBoardId, "columns", task.status, "tasks", taskId)
    const newRef = doc(db, "boards", activeBoardId, "columns", targetStatus, "tasks", taskId)

    const updatedTask = { 
      ...task, 
      status: targetStatus,
      ownerId: boardData.ownerId,
      memberIds: boardData.memberIds || [],
      creatorId: task.creatorId || user?.uid,
      assigneeId: task.assigneeId || workspaceMembers.find(m => m.name === task.assignee)?.id || user?.uid,
      updatedAt: new Date().toISOString()
    }
    
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

    toast({ title: "Task Moved", description: `Moved ${taskId} to ${targetStatus}` })
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

  const memberNames = workspaceMembers.map(m => ({ id: m.id, name: m.name }))

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <header className="border-b bg-card px-6 py-4 flex flex-col gap-4 shadow-sm relative z-20">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            {onBack && (
              <Button variant="ghost" size="icon" onClick={onBack} className="h-9 w-9">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            )}
            <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center shadow-lg transform -rotate-3">
              <LayoutGrid className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-primary tracking-tight">{boardTitle}</h1>
                {isAdmin && isBoardOwner ? (
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20 gap-1">
                    <ShieldCheck className="h-3 w-3" />
                    Admin
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px] h-4">
                    Member
                  </Badge>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
                {isBoardOwner ? "Global Oversight View" : "Personal Contributor Workspace"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isBoardOwner && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="border-accent text-accent hover:bg-accent hover:text-accent-foreground transition-all shadow-sm">
                    <Share2 className="h-4 w-4 mr-2" />
                    Invite Members
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-5 shadow-2xl border-accent/20 bg-popover backdrop-blur-sm">
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <h4 className="text-sm font-bold flex items-center gap-2">
                        <Hash className="h-4 w-4 text-accent" />
                        Room Invite Code
                      </h4>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Members using this code join as <strong>Members</strong>.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Input 
                        readOnly 
                        value={roomInviteCode} 
                        className="h-10 text-xs bg-muted/30 border border-accent/20 font-code text-center font-bold"
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
                    <span className="font-bold">{username || "User"}</span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{userRole}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`/settings?board=${activeBoardId}`} className="cursor-pointer">
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
              className="pl-10 h-10 bg-muted/30 border-none focus-visible:ring-1"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3 ml-auto">
          {isBoardOwner && (
            <div className="w-[240px]">
              <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                <SelectTrigger className="h-10 bg-background shadow-sm border-muted">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Filter by Member" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Members</SelectItem>
                  {workspaceMembers.map(member => (
                    <SelectItem key={member.id} value={member.name} className="group">
                      <div className="flex items-center justify-between w-full gap-4">
                        <span className="truncate">{member.name}</span>
                        {member.role === 'admin' && (
                          <span className="text-[9px] font-bold text-primary group-focus:text-primary-foreground border border-primary/20 group-focus:border-white/40 bg-primary/10 group-focus:bg-white/20 px-1.5 py-0.5 rounded uppercase flex items-center gap-1 shrink-0 transition-colors">
                            <ShieldCheck className="h-2.5 w-2.5" />
                            Admin
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          <div className="flex bg-muted/30 p-1 rounded-md border shadow-sm h-10 items-center">
            <Button 
              variant="ghost" 
              size="sm" 
              className={cn(
                "h-8 px-2 rounded-sm transition-all",
                viewMode === 'board' ? "bg-background shadow-sm text-primary font-bold" : "text-muted-foreground"
              )}
              onClick={() => setViewMode('board')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className={cn(
                "h-8 px-2 rounded-sm transition-all",
                viewMode === 'list' ? "bg-background shadow-sm text-primary font-bold" : "text-muted-foreground"
              )}
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
            {isBoardOwner && (
              <Button 
                variant="ghost" 
                size="sm" 
                className={cn(
                  "h-8 px-2 rounded-sm transition-all",
                  viewMode === 'analytics' ? "bg-background shadow-sm text-primary font-bold" : "text-muted-foreground"
                )}
                onClick={() => setViewMode('analytics')}
              >
                <BarChart3 className="h-4 w-4" />
              </Button>
            )}
          </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-6">
        {viewMode === 'analytics' && isBoardOwner ? (
          <AnalyticsDashboard tasks={tasks} members={workspaceMembers} />
        ) : viewMode === 'board' ? (
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
        tasks={tasks}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
        defaultStatus={activeStatus}
        currentUsername={username || undefined}
        userRollNumber={rollNumber}
        columnOptions={columns}
        memberOptions={memberNames}
        isAdmin={isBoardOwner}
      />
    </div>
  )
}
