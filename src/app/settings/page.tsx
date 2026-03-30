
"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { 
  ChevronLeft, 
  Shield, 
  Users, 
  Settings as SettingsIcon, 
  Trash2, 
  UserPlus, 
  Copy, 
  Check, 
  Hash, 
  Loader2, 
  DoorOpen, 
  Star,
  Moon,
  Sun,
  Monitor,
  AlertCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Member, INITIAL_COLUMNS } from "@/types/task"
import { useUser, useFirestore, useDoc, useMemoFirebase, useAuth } from "@/firebase"
import { doc, updateDoc, arrayUnion, getDoc, collection, query, where, getDocs, arrayRemove, onSnapshot, deleteDoc, setDoc, writeBatch } from "firebase/firestore"
import { signOut } from "firebase/auth"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"
import { cn } from "@/lib/utils"
import { useTheme } from "next-themes"
import { Suspense } from "react"

function SettingsContent() {
  const [members, setMembers] = React.useState<Member[]>([])
  const [hasCopied, setHasCopied] = React.useState(false)
  const [joinCode, setJoinCode] = React.useState("")
  const [isJoining, setIsJoining] = React.useState(false)
  const [isMembersLoading, setIsMembersLoading] = React.useState(false)
  const [boardData, setBoardData] = React.useState<any>(null)
  const [isAccessRevoked, setIsAccessRevoked] = React.useState(false)
  const [isResetting, setIsResetting] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)
  
  const { user } = useUser()
  const auth = useAuth()
  const db = useFirestore()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { theme, setTheme } = useTheme()

  // Get boardId from query params or sessionStorage
  const activeBoardId = searchParams.get("board") || (typeof window !== 'undefined' ? sessionStorage.getItem("activeBoardId") : null)

  // Prevent hydration mismatch
  React.useEffect(() => {
    setMounted(true)
  }, [])

  const profileRef = useMemoFirebase(() => {
    if (!user) return null
    return doc(db, "users", user.uid)
  }, [user, db])

  const { data: profile, isLoading: isProfileLoading } = useDoc(profileRef)

  const isAdmin = profile?.role === 'admin'

  // Real-time board listener for live membership updates & access revocation
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
    })
    return () => unsub()
  }, [activeBoardId, db, user])

  // Fetch all board members (re-runs when boardData changes in real-time)
  React.useEffect(() => {
    const loadMembers = async () => {
      if (!user || !profile || !activeBoardId || !boardData || isAccessRevoked) return;
      
      setIsMembersLoading(true)
      try {
        const allMemberIds = Array.from(new Set([boardData.ownerId, ...(boardData.memberIds || [])]));
        const memberProfiles: Member[] = [];
        
        for (const mId of allMemberIds) {
          const uDoc = await getDoc(doc(db, "users", mId));
          if (uDoc.exists()) {
            const uData = uDoc.data();
            memberProfiles.push({
              id: uData.id,
              name: uData.username || "User",
              email: uData.email || "",
              role: uData.role === 'admin' ? 'Admin' : 'Member',
              status: 'Active',
              rating: uData.rating || 0
            });
          }
        }
        setMembers(memberProfiles);
      } catch (err) {
        // Silently handle
      } finally {
        setIsMembersLoading(false)
      }
    };

    loadMembers();
  }, [user, profile, db, activeBoardId, boardData, isAccessRevoked]);

  const roomInviteCode = boardData?.inviteCode || activeBoardId || ""

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomInviteCode)
    setHasCopied(true)
    toast({
      title: "Code Copied",
      description: "Room code ready to share with members.",
    })
    setTimeout(() => setHasCopied(false), 2000)
  }

  const handleJoinRoom = async () => {
    const code = joinCode.trim().toLowerCase()
    if (!code) {
      toast({ variant: "destructive", title: "Invalid Code", description: "Please enter a valid room invitation code." })
      return
    }

    setIsJoining(true)
    try {
      // Search by inviteCode field
      const q = query(collection(db, "boards"), where("inviteCode", "==", code))
      const snap = await getDocs(q)
      
      if (snap.empty) {
        toast({
          variant: "destructive",
          title: "Not Found",
          description: "Could not find a workspace with that code. Please check with your admin.",
        })
        setIsJoining(false)
        return
      }

      const boardDoc = snap.docs[0]
      const boardRef = doc(db, "boards", boardDoc.id)

      updateDoc(boardRef, {
        memberIds: arrayUnion(user?.uid),
        updatedAt: new Date().toISOString()
      }).then(() => {
        toast({
          title: "Workspace Joined",
          description: "You have successfully joined the admin's board.",
        })
        setJoinCode("")
        // Store and navigate to the joined board
        sessionStorage.setItem("activeBoardId", boardDoc.id)
        router.push("/")
      }).catch(async (err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: boardRef.path,
          operation: 'update',
          requestResourceData: { memberIds: [user?.uid] }
        }));
      });

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Join Failed",
        description: error.message || "Permission denied or network error.",
      })
    } finally {
      setIsJoining(false)
    }
  }

  const handleUpdateRole = (memberId: string, newRole: 'Admin' | 'Member') => {
    if (!isAdmin) return;
    
    const userRef = doc(db, "users", memberId);
    const updateData = {
      role: newRole.toLowerCase(),
      updatedAt: new Date().toISOString()
    };

    updateDoc(userRef, updateData)
      .then(() => {
        setMembers(members.map(m => m.id === memberId ? { ...m, role: newRole } : m))
        toast({
          title: "Role Updated",
          description: `${newRole} permissions have been synchronized across the workspace.`,
        })
      })
      .catch(async (error: any) => {
        const permissionError = new FirestorePermissionError({
          path: userRef.path,
          operation: 'update',
          requestResourceData: updateData
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  }

  const handleUpdateRating = (memberId: string, rating: number) => {
    if (!isAdmin) return;

    const userRef = doc(db, "users", memberId);
    const updateData = {
      rating,
      updatedAt: new Date().toISOString()
    };

    updateDoc(userRef, updateData)
      .then(() => {
        setMembers(members.map(m => m.id === memberId ? { ...m, rating } : m))
        toast({
          title: "Rating Updated",
          description: `Member rating updated to ${rating} stars.`,
        })
      })
      .catch(async (error: any) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: userRef.path,
          operation: 'update',
          requestResourceData: updateData
        }));
      });
  }

  const handleDeleteMember = (memberId: string) => {
    if (!isAdmin || !activeBoardId) return;
    
    if (memberId === user?.uid) {
      toast({
        variant: "destructive",
        title: "Action Restricted",
        description: "You cannot remove yourself from the board.",
      })
      return
    }

    const boardRef = doc(db, "boards", activeBoardId);
    updateDoc(boardRef, {
      memberIds: arrayRemove(memberId),
      updatedAt: new Date().toISOString()
    })
    .then(() => {
      setMembers(prev => prev.filter(m => m.id !== memberId))
      toast({
        variant: "destructive",
        title: "Member Removed",
        description: "The user no longer has access to this workspace.",
      })
    })
    .catch(async (error: any) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: boardRef.path,
        operation: 'update'
      }));
    });
  }

  const handleResetBoard = async () => {
    if (!activeBoardId || !isAdmin) return
    if (!window.confirm("Are you sure? This will move ALL tasks to the \"New\" column.")) return

    setIsResetting(true)
    try {
      const batch = writeBatch(db)
      
      for (const colName of INITIAL_COLUMNS) {
        if (colName === 'New') continue
        const tasksSnap = await getDocs(collection(db, "boards", activeBoardId, "columns", colName, "tasks"))
        for (const taskDoc of tasksSnap.docs) {
          const taskData = taskDoc.data()
          // Create in "New" column
          const newRef = doc(db, "boards", activeBoardId, "columns", "New", "tasks", taskDoc.id)
          batch.set(newRef, { ...taskData, status: 'New', updatedAt: new Date().toISOString() })
          // Delete from old column
          batch.delete(taskDoc.ref)
        }
      }
      
      await batch.commit()
      toast({ title: "Board Reset", description: "All tasks have been moved to the New column." })
    } catch (error: any) {
      toast({ variant: "destructive", title: "Reset Failed", description: error.message || "Could not reset board." })
    } finally {
      setIsResetting(false)
    }
  }

  const handleDeleteBoard = async () => {
    if (!activeBoardId || !isAdmin) return
    if (!window.confirm("Are you sure? This will permanently delete ALL tasks on this board. This cannot be undone.")) return

    setIsDeleting(true)
    try {
      const batch = writeBatch(db)
      
      for (const colName of INITIAL_COLUMNS) {
        const tasksSnap = await getDocs(collection(db, "boards", activeBoardId, "columns", colName, "tasks"))
        for (const taskDoc of tasksSnap.docs) {
          batch.delete(taskDoc.ref)
        }
      }
      
      await batch.commit()
      toast({ title: "Board Cleared", description: "All tasks have been permanently deleted." })
    } catch (error: any) {
      toast({ variant: "destructive", title: "Delete Failed", description: error.message || "Could not delete tasks." })
    } finally {
      setIsDeleting(false)
    }
  }

  const StarRating = ({ value, onChange, readOnly = false }: { value: number, onChange?: (val: number) => void, readOnly?: boolean }) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              "h-4 w-4 transition-colors",
              star <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30",
              !readOnly ? "cursor-pointer" : "cursor-default"
            )}
            onClick={() => !readOnly && onChange?.(star)}
          />
        ))}
      </div>
    )
  }

  // Auto-redirect removed members to login with notification
  React.useEffect(() => {
    if (!isAccessRevoked) return
    toast({
      variant: "destructive",
      title: "Access Revoked",
      description: "You are no longer a member of this room. Please contact your admin.",
    })
    signOut(auth).then(() => {
      router.push("/login")
    }).catch(() => {
      router.push("/login")
    })
  }, [isAccessRevoked, auth, router, toast])

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card px-6 py-4 grid grid-cols-3 items-center sticky top-0 z-50">
        <div className="flex justify-start">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Board
            </Link>
          </Button>
        </div>
        <div className="flex justify-center">
          <h1 className="text-xl font-bold tracking-tight whitespace-nowrap text-center">Board Settings</h1>
        </div>
        <div className="flex justify-end">
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-8">
        <Tabs defaultValue="general" className="flex flex-col gap-8">
          <div className="sticky top-[73px] z-40 w-full mb-10">
            <div className="relative mx-auto max-w-4xl p-2 rounded-2xl bg-card/40 backdrop-blur-3xl border border-border shadow-[0_8px_32px_rgba(0,0,0,0.08)] flex justify-center transition-all duration-500">
              <TabsList className="bg-transparent h-auto p-0 gap-2 flex flex-wrap justify-center border-none">
                <TabsTrigger 
                  value="general" 
                  className="gap-2 px-8 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg rounded-xl transition-all duration-300 font-semibold text-sm"
                >
                  <SettingsIcon className="h-4 w-4" />
                  General
                </TabsTrigger>
                
                <TabsTrigger 
                  value="members" 
                  className="gap-2 px-8 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg rounded-xl transition-all duration-300 font-semibold text-sm"
                >
                  <Users className="h-4 w-4" />
                  {isAdmin ? "Member Access" : "Team Members"}
                </TabsTrigger>

                {isAdmin && (
                  <TabsTrigger 
                    value="admin" 
                    className="gap-2 px-8 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg rounded-xl transition-all duration-300 font-semibold text-sm"
                  >
                    <Shield className="h-4 w-4" />
                    Admin Controls
                  </TabsTrigger>
                )}
              </TabsList>
            </div>
          </div>

          <div className="max-w-4xl w-full mx-auto">
            <TabsContent value="general" className="mt-0 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Details</CardTitle>
                  <CardDescription>
                    Your account information within this workspace.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input 
                      id="username" 
                      value={isProfileLoading ? "Loading..." : (profile?.username || user?.displayName || "")} 
                      readOnly
                      className="bg-muted/30 border-none font-medium h-11"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Your System Role</Label>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="h-8 px-4 text-sm capitalize bg-primary/10 text-primary border-primary/20">
                          {profile?.role || "Member"}
                        </Badge>
                      </div>
                    </div>
                    {profile?.role === 'member' && (
                      <div className="space-y-2">
                        <Label>Admin's Rating</Label>
                        <div className="flex items-center h-8">
                          <StarRating value={profile?.rating || 0} readOnly />
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Appearance</CardTitle>
                  <CardDescription>
                    Customize how InsightBoard looks for you.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <Label>Theme Mode</Label>
                    <div className="grid grid-cols-3 gap-4">
                      <Button 
                        variant={mounted && theme === 'light' ? 'default' : 'outline'} 
                        className="h-20 flex-col gap-2"
                        onClick={() => setTheme('light')}
                      >
                        <Sun className="h-5 w-5" />
                        <span className="text-xs">Light</span>
                      </Button>
                      <Button 
                        variant={mounted && theme === 'dark' ? 'default' : 'outline'} 
                        className="h-20 flex-col gap-2"
                        onClick={() => setTheme('dark')}
                      >
                        <Moon className="h-5 w-5" />
                        <span className="text-xs">Dark</span>
                      </Button>
                      <Button 
                        variant={mounted && theme === 'system' ? 'default' : 'outline'} 
                        className="h-20 flex-col gap-2"
                        onClick={() => setTheme('system')}
                      >
                        <Monitor className="h-5 w-5" />
                        <span className="text-xs">System</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {isAdmin ? (
                <Card className="border-none bg-accent/5 overflow-hidden shadow-sm ring-1 ring-accent/20">
                  <div className="h-1 bg-accent w-full" />
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Hash className="h-5 w-5 text-accent" />
                      Room Invitation Code
                    </CardTitle>
                    <CardDescription>
                      Share this unique code with members. They will use it during signup to join as Members.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 pb-6">
                    <div className="flex gap-2">
                      <Input 
                        readOnly 
                        value={roomInviteCode} 
                        className="bg-card border-dashed font-code text-sm tracking-wider text-center py-6 h-12 font-bold"
                      />
                      <Button variant="outline" size="icon" onClick={handleCopyCode} className="shrink-0 bg-card h-12 w-12">
                        {hasCopied ? <Check className="h-5 w-5 text-emerald-500" /> : <Copy className="h-5 w-5" />}
                      </Button>
                    </div>
                    <div className="rounded-lg bg-card/50 p-3 border border-accent/10">
                      <p className="text-[11px] text-accent font-medium leading-relaxed">
                        <strong>Admin Security:</strong> Users signing up with this code are restricted to the <strong>Member</strong> role.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-none bg-primary/5 overflow-hidden shadow-sm ring-1 ring-primary/20">
                  <div className="h-1 bg-primary w-full" />
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DoorOpen className="h-5 w-5 text-primary" />
                      Join a Workspace
                    </CardTitle>
                    <CardDescription>
                      Enter a room invitation code provided by your admin to join their board.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 pb-6">
                    <div className="flex gap-2">
                      <Input 
                        placeholder="Enter room code..." 
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value)}
                        className="bg-card border font-code text-sm tracking-wider text-center h-12"
                      />
                      <Button onClick={handleJoinRoom} disabled={isJoining || !joinCode} className="h-12 px-6">
                        {isJoining ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
                        Join Room
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="members" className="mt-0 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Card>
                <CardHeader>
                  <CardTitle>{isAdmin ? "Team Management" : "Team Members"}</CardTitle>
                  <CardDescription>
                    {isAdmin ? "Manage who has access to this board and their permission levels." : "View the participants of this workspace."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isMembersLoading ? (
                    <div className="flex items-center justify-center p-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Rating</TableHead>
                          {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {members.map((member) => (
                          <TableRow key={member.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div>
                                  <p className="font-medium">{member.name}</p>
                                  <p className="text-xs text-muted-foreground">{member.email}</p>
                                </div>
                                {member.role === 'Admin' && (
                                  <Badge variant="outline" className="text-[9px] h-4 px-1 uppercase tracking-tighter opacity-70">Admin</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {isAdmin ? (
                                <Select 
                                  value={member.role} 
                                  onValueChange={(v) => handleUpdateRole(member.id, v as any)}
                                >
                                  <SelectTrigger className="w-[110px] h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Admin">Admin</SelectItem>
                                    <SelectItem value="Member">Member</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Badge variant="secondary" className="capitalize">
                                  {member.role.toLowerCase()}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {member.role === 'Member' ? (
                                <StarRating 
                                  value={member.rating || 0} 
                                  onChange={(val) => handleUpdateRating(member.id, val)}
                                  readOnly={!isAdmin}
                                />
                              ) : (
                                <span className="text-[10px] text-muted-foreground italic">N/A</span>
                              )}
                            </TableCell>
                            {isAdmin && (
                              <TableCell className="text-right">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors"
                                  onClick={() => handleDeleteMember(member.id)}
                                  disabled={member.id === user?.uid}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                        {members.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={isAdmin ? 4 : 3} className="text-center py-8 text-muted-foreground">
                                    No members found for this workspace.
                                </TableCell>
                            </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {isAdmin && (
              <TabsContent value="admin" className="mt-0 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Card className="ring-1 ring-destructive/20 border-none">
                  <CardHeader className="bg-destructive/5 rounded-t-lg">
                    <CardTitle className="text-destructive">Danger Zone</CardTitle>
                    <CardDescription>
                      Irreversible actions that affect the entire board.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">Reset Board State</p>
                        <p className="text-xs text-muted-foreground">Move all tasks back to the "New" column.</p>
                      </div>
                      <Button variant="outline" disabled={isResetting} onClick={handleResetBoard}>
                        {isResetting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Resetting...</> : "Reset Board"}
                      </Button>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-destructive">Delete Permanently</p>
                        <p className="text-xs text-muted-foreground">Destroy all tasks on this board forever.</p>
                      </div>
                      <Button variant="destructive" disabled={isDeleting} onClick={handleDeleteBoard}>
                        {isDeleting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Deleting...</> : "Delete Board"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </div>
        </Tabs>
      </main>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    }>
      <SettingsContent />
    </Suspense>
  )
}
