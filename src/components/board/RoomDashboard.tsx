"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Plus,
  LayoutGrid,
  Hash,
  Users,
  Copy,
  Check,
  Loader2,
  DoorOpen,
  LogOut,
  SlidersHorizontal,
  ShieldCheck,
  Trash2,
  Clock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import { Board, generateInviteCode } from "@/types/task"
import { useAuth, useUser, useFirestore } from "@/firebase"
import { signOut } from "firebase/auth"
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  deleteDoc,
  writeBatch,
} from "firebase/firestore"
import { INITIAL_COLUMNS } from "@/types/task"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface RoomDashboardProps {
  userRole?: string
  username?: string | null
  onSelectBoard: (boardId: string) => void
}

export function RoomDashboard({ userRole, username, onSelectBoard }: RoomDashboardProps) {
  const [boards, setBoards] = React.useState<Board[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isCreating, setIsCreating] = React.useState(false)
  const [isJoining, setIsJoining] = React.useState(false)
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false)
  const [newRoomName, setNewRoomName] = React.useState("")
  const [joinCode, setJoinCode] = React.useState("")
  const [copiedCode, setCopiedCode] = React.useState<string | null>(null)

  const auth = useAuth()
  const { user } = useUser()
  const db = useFirestore()
  const router = useRouter()
  const { toast } = useToast()

  const isAdmin = userRole === "admin"

  // Real-time listener for boards
  React.useEffect(() => {
    if (!user) return

    const unsubscribes: (() => void)[] = []

    if (isAdmin) {
      // Teachers: listen to boards they own
      const q = query(collection(db, "boards"), where("ownerId", "==", user.uid))
      const unsub = onSnapshot(q, (snap) => {
        const owned = snap.docs.map((d) => ({ ...d.data(), id: d.id } as Board))
        setBoards(owned)
        setIsLoading(false)
      })
      unsubscribes.push(unsub)
    } else {
      // Students: listen to boards they're a member of
      const q = query(collection(db, "boards"), where("memberIds", "array-contains", user.uid))
      const unsub = onSnapshot(q, (snap) => {
        const joined = snap.docs.map((d) => ({ ...d.data(), id: d.id } as Board))
        setBoards(joined)
        setIsLoading(false)
      })
      unsubscribes.push(unsub)
    }

    return () => unsubscribes.forEach((u) => u())
  }, [user, db, isAdmin])

  const handleCreateRoom = async () => {
    if (!user || !newRoomName.trim()) return
    setIsCreating(true)

    try {
      const inviteCode = generateInviteCode()

      // Ensure uniqueness 
      const existing = await getDocs(
        query(collection(db, "boards"), where("inviteCode", "==", inviteCode))
      )
      const finalCode = existing.empty ? inviteCode : generateInviteCode()

      const boardData = {
        title: newRoomName.trim(),
        ownerId: user.uid,
        inviteCode: finalCode,
        memberIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const docRef = await addDoc(collection(db, "boards"), boardData)

      toast({
        title: "Room Created",
        description: `"${newRoomName.trim()}" is ready! Invite code: ${finalCode}`,
      })

      setNewRoomName("")
      setCreateDialogOpen(false)
      onSelectBoard(docRef.id)
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Creation Failed",
        description: error.message || "Could not create room.",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleJoinRoom = async () => {
    const code = joinCode.trim().toLowerCase()
    if (!code || !user) return
    setIsJoining(true)

    try {
      // Search by inviteCode field
      const q = query(collection(db, "boards"), where("inviteCode", "==", code))
      const snap = await getDocs(q)

      if (snap.empty) {
        toast({
          variant: "destructive",
          title: "Room Not Found",
          description: "No room matches that invite code. Check with your teacher.",
        })
        setIsJoining(false)
        return
      }

      const boardDoc = snap.docs[0]
      const boardData = boardDoc.data()

      if (boardData.memberIds?.includes(user.uid)) {
        toast({ title: "Already Joined", description: "You're already a member of this room." })
        setJoinCode("")
        setIsJoining(false)
        onSelectBoard(boardDoc.id)
        return
      }

      if (boardData.ownerId === user.uid) {
        toast({ title: "You Own This Room", description: "You are the teacher of this room." })
        setJoinCode("")
        setIsJoining(false)
        onSelectBoard(boardDoc.id)
        return
      }

      await updateDoc(doc(db, "boards", boardDoc.id), {
        memberIds: arrayUnion(user.uid),
        updatedAt: new Date().toISOString(),
      })

      toast({
        title: "Joined Room",
        description: `You've joined "${boardData.title}".`,
      })
      setJoinCode("")
      onSelectBoard(boardDoc.id)
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Join Failed",
        description: error.message || "Could not join room.",
      })
    } finally {
      setIsJoining(false)
    }
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    toast({ title: "Code Copied", description: "Invite code copied to clipboard." })
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const handleDeleteRoom = async (boardId: string, boardTitle: string) => {
    if (!user) return
    if (!window.confirm(`Are you sure you want to permanently delete "${boardTitle}"? All tasks will be lost.`)) return

    try {
      const batch = writeBatch(db)

      // Delete all tasks in all columns
      for (const colName of INITIAL_COLUMNS) {
        const tasksSnap = await getDocs(
          collection(db, "boards", boardId, "columns", colName, "tasks")
        )
        for (const taskDoc of tasksSnap.docs) {
          batch.delete(taskDoc.ref)
        }
      }

      // Delete the board document
      batch.delete(doc(db, "boards", boardId))
      await batch.commit()

      toast({
        variant: "destructive",
        title: "Room Deleted",
        description: `"${boardTitle}" has been permanently deleted.`,
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: error.message || "Could not delete room.",
      })
    }
  }

  const handleLeaveRoom = async (boardId: string, boardTitle: string) => {
    if (!user) return
    if (!window.confirm(`Are you sure you want to leave "${boardTitle}"?`)) return

    try {
      await updateDoc(doc(db, "boards", boardId), {
        memberIds: arrayRemove(user.uid),
        updatedAt: new Date().toISOString(),
      })

      toast({
        title: "Left Room",
        description: `You have left "${boardTitle}".`,
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Leave Failed",
        description: error.message || "Could not leave room.",
      })
    }
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.push("/login")
    } catch (error: any) {
      toast({ variant: "destructive", title: "Logout Failed", description: error.message })
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground font-medium animate-pulse">Loading your rooms...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4 shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center shadow-lg transform -rotate-3">
              <LayoutGrid className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary tracking-tight">InsightBoard</h1>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
                {isAdmin ? "Teacher Dashboard" : "Student Dashboard"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isAdmin && (
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="shadow-md">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Room
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create New Room</DialogTitle>
                    <DialogDescription>
                      Give your classroom a name. A unique invite code will be generated automatically.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="roomName">Room Name</Label>
                      <Input
                        id="roomName"
                        placeholder="e.g. CS101 - Data Structures"
                        value={newRoomName}
                        onChange={(e) => setNewRoomName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleCreateRoom()}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateRoom} disabled={isCreating || !newRoomName.trim()}>
                      {isCreating ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Plus className="h-4 w-4 mr-2" />
                      )}
                      Create
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full bg-muted/50 border hover:bg-muted/80 transition-colors"
                >
                  <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-sm">
                    {(username || "U")[0].toUpperCase()}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="font-bold">{username || "User"}</span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      {userRole}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer font-medium">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-6 md:p-8 space-y-8">
        {/* Join Room (Students only) */}
        {!isAdmin && (
          <Card className="border-none bg-primary/5 overflow-hidden shadow-sm ring-1 ring-primary/20">
            <div className="h-1 bg-primary w-full" />
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <DoorOpen className="h-5 w-5 text-primary" />
                Join a Room
              </CardTitle>
              <CardDescription>
                Enter the invite code your teacher shared with you.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter invite code..."
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleJoinRoom()}
                  className="bg-card border font-mono text-sm tracking-wider h-12"
                />
                <Button
                  onClick={handleJoinRoom}
                  disabled={isJoining || !joinCode.trim()}
                  className="h-12 px-6"
                >
                  {isJoining ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <DoorOpen className="h-4 w-4 mr-2" />
                  )}
                  Join
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Rooms Grid */}
        <div>
          <h2 className="text-lg font-bold mb-4">
            {isAdmin ? "Your Rooms" : "My Rooms"}
            <Badge variant="secondary" className="ml-2 text-xs">
              {boards.length}
            </Badge>
          </h2>

          {boards.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <LayoutGrid className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-1">
                  {isAdmin ? "No rooms yet" : "No rooms joined"}
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  {isAdmin
                    ? 'Click "Create Room" to set up your first classroom.'
                    : "Enter an invite code from your teacher to join a room."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {boards.map((board) => (
                <Card
                  key={board.id}
                  className="group cursor-pointer hover:shadow-lg hover:border-primary/30 transition-all duration-200 overflow-hidden"
                  onClick={() => onSelectBoard(board.id)}
                >
                  <div className="h-1.5 bg-primary w-full" />
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base group-hover:text-primary transition-colors line-clamp-1">
                        {board.title}
                      </CardTitle>
                      {isAdmin && board.ownerId === user?.uid && (
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[9px] shrink-0">
                          <ShieldCheck className="h-2.5 w-2.5 mr-1" />
                          Owner
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      <span>{(board.memberIds?.length || 0)} student{(board.memberIds?.length || 0) !== 1 ? "s" : ""}</span>
                    </div>

                    {isAdmin && (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-muted/50 border rounded-md px-3 py-1.5 font-mono text-xs tracking-wider">
                          <span className="text-muted-foreground">#</span> {board.inviteCode}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCopyCode(board.inviteCode)
                          }}
                        >
                          {copiedCode === board.inviteCode ? (
                            <Check className="h-3.5 w-3.5 text-green-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Created {new Date(board.createdAt).toLocaleDateString()}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "h-7 px-2 text-[10px] gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
                          isAdmin
                            ? "text-destructive hover:text-destructive hover:bg-destructive/10"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (isAdmin) {
                            handleDeleteRoom(board.id, board.title)
                          } else {
                            handleLeaveRoom(board.id, board.title)
                          }
                        }}
                      >
                        {isAdmin ? (
                          <><Trash2 className="h-3 w-3" /> Delete</>
                        ) : (
                          <><LogOut className="h-3 w-3" /> Leave</>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
