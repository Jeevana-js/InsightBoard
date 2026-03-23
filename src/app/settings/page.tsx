
"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronLeft, Shield, Users, Settings as SettingsIcon, Trash2, UserPlus, Copy, Check, Hash, Loader2, DoorOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Member } from "@/types/task"
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { doc, updateDoc, arrayUnion, getDoc, collection, query, where, getDocs, arrayRemove } from "firebase/firestore"

export default function SettingsPage() {
  const [members, setMembers] = React.useState<Member[]>([])
  const [hasCopied, setHasCopied] = React.useState(false)
  const [joinCode, setJoinCode] = React.useState("")
  const [isJoining, setIsJoining] = React.useState(false)
  const [isMembersLoading, setIsMembersLoading] = React.useState(false)
  const [activeBoardId, setActiveBoardId] = React.useState<string | null>(null)
  
  const { user } = useUser()
  const db = useFirestore()
  const { toast } = useToast()

  const profileRef = useMemoFirebase(() => {
    if (!user) return null
    return doc(db, "users", user.uid)
  }, [user, db])

  const { data: profile, isLoading: isProfileLoading } = useDoc(profileRef)

  const isAdmin = profile?.role === 'admin'

  // Find which board this user is part of (either owner or member)
  React.useEffect(() => {
    const findActiveBoard = async () => {
      if (!user) return
      
      // 1. Check if user owns a board
      const ownBoardRef = doc(db, "boards", user.uid)
      const ownBoardSnap = await getDoc(ownBoardRef)
      if (ownBoardSnap.exists()) {
        setActiveBoardId(user.uid)
        return
      }

      // 2. Check if user is a member of a board
      const q = query(collection(db, "boards"), where("memberIds", "array-contains", user.uid))
      const memberSnap = await getDocs(q)
      if (!memberSnap.empty) {
        setActiveBoardId(memberSnap.docs[0].id)
      }
    }
    findActiveBoard()
  }, [user, db])

  // Fetch all board members - ONLY FOR ADMINS
  React.useEffect(() => {
    const loadBoardAndMembers = async () => {
      if (!user || !profile || !isAdmin || !activeBoardId) return;
      
      setIsMembersLoading(true)
      try {
        const boardRef = doc(db, "boards", activeBoardId);
        const boardSnap = await getDoc(boardRef);
        
        if (boardSnap.exists()) {
          const bData = boardSnap.data();
          const allMemberIds = Array.from(new Set([bData.ownerId, ...(bData.memberIds || [])]));
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
                status: 'Active'
              });
            }
          }
          setMembers(memberProfiles);
        }
      } catch (err) {
        // Silently handle
      } finally {
        setIsMembersLoading(false)
      }
    };

    loadBoardAndMembers();
  }, [user, profile, isAdmin, db, activeBoardId]);

  const roomInviteCode = activeBoardId || user?.uid || ""

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomInviteCode)
    setHasCopied(true)
    toast({
      title: "Code Copied",
      description: "Room code ready to share with students.",
    })
    setTimeout(() => setHasCopied(false), 2000)
  }

  const handleJoinRoom = async () => {
    const code = joinCode.trim()
    if (!code) {
      toast({
        variant: "destructive",
        title: "Invalid Code",
        description: "Please enter a valid room invitation code.",
      })
      return
    }

    setIsJoining(true)
    try {
      const boardRef = doc(db, "boards", code)
      const boardSnap = await getDoc(boardRef)
      
      if (!boardSnap.exists()) {
        toast({
          variant: "destructive",
          title: "Not Found",
          description: "Could not find a workspace with that code. Please check with your teacher.",
        })
        setIsJoining(false)
        return
      }

      await updateDoc(boardRef, {
        memberIds: arrayUnion(user?.uid)
      })
      
      toast({
        title: "Workspace Joined",
        description: "You have successfully joined the teacher's board.",
      })
      setJoinCode("")
      window.location.reload(); 
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

  const handleUpdateRole = async (memberId: string, newRole: 'Admin' | 'Member') => {
    if (!isAdmin) return;
    
    try {
      // 1. Persist the role change to the user's document
      const userRef = doc(db, "users", memberId);
      await updateDoc(userRef, {
        role: newRole.toLowerCase(),
        updatedAt: new Date().toISOString()
      });

      // 2. Update local state
      setMembers(members.map(m => m.id === memberId ? { ...m, role: newRole } : m))
      
      toast({
        title: "Role Updated",
        description: `${newRole} permissions have been synchronized across the workspace.`,
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message,
      })
    }
  }

  const handleDeleteMember = async (memberId: string) => {
    if (!isAdmin || !activeBoardId) return;
    
    if (memberId === user?.uid) {
      toast({
        variant: "destructive",
        title: "Action Restricted",
        description: "You cannot remove yourself from the board.",
      })
      return
    }

    try {
      // 1. Remove from the board's member list in Firestore
      const boardRef = doc(db, "boards", activeBoardId);
      await updateDoc(boardRef, {
        memberIds: arrayRemove(memberId),
        updatedAt: new Date().toISOString()
      });

      // 2. Update local state
      setMembers(members.filter(m => m.id !== memberId))
      
      toast({
        variant: "destructive",
        title: "Member Removed",
        description: "The user no longer has access to this workspace.",
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Removal Failed",
        description: error.message,
      })
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-white px-6 py-4 grid grid-cols-3 items-center sticky top-0 z-50">
        <div className="flex justify-start">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Board
            </Link>
          </Button>
        </div>
        <div className="flex justify-center">
          <h1 className="text-xl font-bold tracking-tight whitespace-nowrap text-center text-slate-900">Board Settings</h1>
        </div>
        <div className="flex justify-end">
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-8">
        <Tabs defaultValue="general" className="flex flex-col gap-8">
          <div className="sticky top-[73px] z-40 w-full mb-10">
            <div className="relative mx-auto max-w-4xl p-2 rounded-2xl bg-white/40 backdrop-blur-3xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.08)] flex justify-center transition-all duration-500">
              <TabsList className="bg-transparent h-auto p-0 gap-2 flex flex-wrap justify-center border-none">
                <TabsTrigger 
                  value="general" 
                  className="gap-2 px-8 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl transition-all duration-300 font-semibold text-sm"
                >
                  <SettingsIcon className="h-4 w-4" />
                  General
                </TabsTrigger>
                
                {isAdmin && (
                  <>
                    <TabsTrigger 
                      value="members" 
                      className="gap-2 px-8 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl transition-all duration-300 font-semibold text-sm"
                    >
                      <Users className="h-4 w-4" />
                      Member Access
                    </TabsTrigger>
                    <TabsTrigger 
                      value="admin" 
                      className="gap-2 px-8 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl transition-all duration-300 font-semibold text-sm"
                    >
                      <Shield className="h-4 w-4" />
                      Admin Controls
                    </TabsTrigger>
                  </>
                )}
              </TabsList>
            </div>
          </div>

          <div className="max-w-4xl w-full mx-auto">
            <TabsContent value="general" className="mt-0 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Card className="border-none shadow-sm ring-1 ring-border">
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
                      className="bg-muted/30 border-none font-medium h-11 text-slate-900"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Your System Role</Label>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="h-8 px-4 text-sm capitalize bg-primary/10 text-primary border-primary/20">
                        {profile?.role || "Member"}
                      </Badge>
                      <p className="text-[11px] text-muted-foreground italic">
                        Roles are managed at the system level and represent your workspace permissions.
                      </p>
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
                      Share this unique code with students. They will use it during signup to join as Members.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 pb-6">
                    <div className="flex gap-2">
                      <Input 
                        readOnly 
                        value={roomInviteCode} 
                        className="bg-white border-dashed font-code text-sm tracking-wider text-center py-6 h-12 text-slate-950 font-bold"
                      />
                      <Button variant="outline" size="icon" onClick={handleCopyCode} className="shrink-0 bg-white h-12 w-12">
                        {hasCopied ? <Check className="h-5 w-5 text-emerald-500" /> : <Copy className="h-5 w-5" />}
                      </Button>
                    </div>
                    <div className="rounded-lg bg-white/50 p-3 border border-accent/10">
                      <p className="text-[11px] text-accent font-medium leading-relaxed">
                        <strong>Teacher Security:</strong> Users signing up with this code are restricted to the <strong>Student Member</strong> role.
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
                      Enter a room invitation code provided by your teacher to join their board.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 pb-6">
                    <div className="flex gap-2">
                      <Input 
                        placeholder="Enter room code..." 
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value)}
                        className="bg-white border font-code text-sm tracking-wider text-center h-12 text-slate-950"
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

            {isAdmin && (
              <>
                <TabsContent value="members" className="mt-0 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <Card className="border-none shadow-sm ring-1 ring-border">
                    <CardHeader>
                      <CardTitle>Team Members</CardTitle>
                      <CardDescription>
                        Manage who has access to this board and their permission levels.
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
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {members.map((member) => (
                              <TableRow key={member.id}>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <div>
                                      <p className="font-medium text-slate-900">{member.name}</p>
                                      <p className="text-xs text-muted-foreground">{member.email}</p>
                                    </div>
                                    {member.role === 'Admin' && (
                                      <Badge variant="outline" className="text-[9px] h-4 px-1 uppercase tracking-tighter opacity-70">Admin</Badge>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
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
                                </TableCell>
                                <TableCell>
                                  <Badge variant={member.status === 'Active' ? 'default' : 'secondary'} className="text-[10px]">
                                    {member.status}
                                  </Badge>
                                </TableCell>
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
                              </TableRow>
                            ))}
                            {members.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
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

                <TabsContent value="admin" className="mt-0 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <Card className="border-none shadow-sm ring-1 ring-destructive/20">
                    <CardHeader className="bg-destructive/5">
                      <CardTitle className="text-destructive hover:text-destructive">Danger Zone</CardTitle>
                      <CardDescription>
                        Irreversible actions that affect the entire board.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">Reset Board State</p>
                          <p className="text-xs text-muted-foreground">Clear all current tasks and restore initial demo content.</p>
                        </div>
                        <Button variant="outline">Reset Board</Button>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-destructive">Delete Permanently</p>
                          <p className="text-xs text-muted-foreground">Destroy this board and all its associated data forever.</p>
                        </div>
                        <Button variant="destructive" className="hover:bg-destructive hover:text-destructive-foreground">Delete Board</Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </>
            )}
          </div>
        </Tabs>
      </main>
    </div>
  )
}
