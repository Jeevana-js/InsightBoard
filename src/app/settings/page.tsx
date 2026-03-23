"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronLeft, Shield, Users, Settings as SettingsIcon, Trash2, Save, UserPlus, Copy, Check, Link as LinkIcon, Loader2 } from "lucide-react"
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
import { Member } from "@/types/task"
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { doc } from "firebase/firestore"

export default function SettingsPage() {
  const [members, setMembers] = React.useState<Member[]>([])
  const [hasCopied, setHasCopied] = React.useState(false)
  
  const { user } = useUser()
  const db = useFirestore()
  const { toast } = useToast()

  // Fetch the logged-in user's profile
  const profileRef = useMemoFirebase(() => {
    if (!user) return null
    return doc(db, "users", user.uid)
  }, [user, db])

  const { data: profile, isLoading: isProfileLoading } = useDoc(profileRef)

  // Populate the members list with the logged-in user when profile is loaded
  React.useEffect(() => {
    if (profile) {
      const currentUserMember: Member = {
        id: profile.id,
        name: profile.username || user?.displayName || "User",
        email: profile.email || user?.email || "",
        role: profile.role === 'admin' ? 'Admin' : 'Member',
        status: 'Active'
      }
      setMembers([currentUserMember])
    }
  }, [profile, user])

  const roomInviteLink = React.useMemo(() => {
    if (typeof window === "undefined") return ""
    const origin = window.location.origin
    return `${origin}/signup?boardId=${user?.uid || 'main-room'}`
  }, [user])

  const handleCopyLink = () => {
    navigator.clipboard.writeText(roomInviteLink)
    setHasCopied(true)
    toast({
      title: "Link Copied",
      description: "Invitation link ready to share with students.",
    })
    setTimeout(() => setHasCopied(false), 2000)
  }

  const handleUpdateRole = (memberId: string, newRole: 'Admin' | 'Member') => {
    setMembers(members.map(m => m.id === memberId ? { ...m, role: newRole } : m))
    toast({
      title: "Role Updated",
      description: "Member permissions have been modified.",
    })
  }

  const handleDeleteMember = (memberId: string) => {
    if (memberId === user?.uid) {
      toast({
        variant: "destructive",
        title: "Action Restricted",
        description: "You cannot remove yourself from the board.",
      })
      return
    }
    setMembers(members.filter(m => m.id !== memberId))
    toast({
      variant: "destructive",
      title: "Member Removed",
      description: "The user no longer has access to this board.",
    })
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Board
            </Link>
          </Button>
          <div className="h-4 w-[1px] bg-border mx-2" />
          <h1 className="text-xl font-bold tracking-tight">Board Settings</h1>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-8">
        <Tabs defaultValue="general" className="flex flex-col gap-8">
          <TabsList className="flex h-auto bg-transparent border-none p-0 gap-4 w-fit mx-auto sticky top-24 z-10 bg-background/80 backdrop-blur-sm rounded-full px-6 py-2 border shadow-sm">
            <TabsTrigger 
              value="general" 
              className="gap-2 px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-white rounded-full transition-all"
            >
              <SettingsIcon className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger 
              value="members" 
              className="gap-2 px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-white rounded-full transition-all"
            >
              <Users className="h-4 w-4" />
              Member Access
            </TabsTrigger>
            <TabsTrigger 
              value="admin" 
              className="gap-2 px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-white rounded-full transition-all"
            >
              <Shield className="h-4 w-4" />
              Admin Controls
            </TabsTrigger>
          </TabsList>

          <div className="max-w-4xl w-full mx-auto">
            <TabsContent value="general" className="mt-0 space-y-6 animate-in fade-in slide-in-from-bottom-2">
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
                      className="bg-muted/30 border-none font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Your System Role</Label>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="h-7 px-3 text-sm capitalize bg-primary/10 text-primary border-primary/20">
                        {profile?.role || "Member"}
                      </Badge>
                      <p className="text-[11px] text-muted-foreground italic">
                        Roles are managed at the system level and represent your workspace permissions.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {profile?.role === 'admin' && (
                <Card className="border-accent/20 bg-accent/5 overflow-hidden">
                  <div className="h-1 bg-accent w-full" />
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <LinkIcon className="h-5 w-5 text-accent" />
                      Room Invitation Link
                    </CardTitle>
                    <CardDescription>
                      Share this unique link to invite students. They will be forced to join as Members.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 pb-6">
                    <div className="flex gap-2">
                      <Input 
                        readOnly 
                        value={roomInviteLink} 
                        className="bg-white border-dashed font-code text-xs"
                      />
                      <Button variant="outline" size="icon" onClick={handleCopyLink} className="shrink-0 bg-white">
                        {hasCopied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <div className="rounded-lg bg-white/50 p-3 border border-accent/10">
                      <p className="text-[11px] text-accent font-medium leading-relaxed">
                        <strong>Teacher Security:</strong> Users signing up via this link are restricted to the <strong>Student Member</strong> role.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="members" className="mt-0 space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Team Members</CardTitle>
                    <CardDescription>
                      Manage who has access to this board and their permission levels.
                    </CardDescription>
                  </div>
                  {profile?.role === 'admin' && (
                    <Button size="sm">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Invite Member
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {isProfileLoading ? (
                    <div className="flex items-center justify-center p-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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
                              <div>
                                <p className="font-medium">{member.name}</p>
                                <p className="text-xs text-muted-foreground">{member.email}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              {profile?.role === 'admin' ? (
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
                                <Badge variant="outline" className="text-[10px]">{member.role}</Badge>
                              )}
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
                                className="h-8 w-8 text-destructive"
                                onClick={() => handleDeleteMember(member.id)}
                                disabled={member.id === user?.uid}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="admin" className="mt-0 space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <Card className="border-destructive/20">
                <CardHeader className="bg-destructive/5">
                  <CardTitle className="text-destructive">Danger Zone</CardTitle>
                  <CardDescription>
                    Irreversible actions that affect the entire board.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">Reset Board State</p>
                      <p className="text-xs text-muted-foreground">Clear all current tasks and restore initial demo content.</p>
                    </div>
                    <Button variant="outline" disabled={profile?.role !== 'admin'}>Reset Board</Button>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-destructive">Delete Permanently</p>
                      <p className="text-xs text-muted-foreground">Destroy this board and all its associated data forever.</p>
                    </div>
                    <Button variant="destructive" disabled={profile?.role !== 'admin'}>Delete Board</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </main>
    </div>
  )
}
