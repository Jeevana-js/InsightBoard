"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronLeft, Shield, Users, Settings as SettingsIcon, Trash2, Save, UserPlus, Copy, Check, Link as LinkIcon } from "lucide-react"
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
import { INITIAL_MEMBERS, Member } from "@/types/task"
import { useUser } from "@/firebase"

export default function SettingsPage() {
  const [boardName, setBoardName] = React.useState("SprintSync Board")
  const [members, setMembers] = React.useState<Member[]>(INITIAL_MEMBERS)
  const [hasCopied, setHasCopied] = React.useState(false)
  const { user } = useUser()
  const { toast } = useToast()

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

  const handleSaveGeneral = () => {
    toast({
      title: "Settings Saved",
      description: "General board settings have been updated.",
    })
  }

  const handleUpdateRole = (memberId: string, newRole: 'Admin' | 'Member') => {
    setMembers(members.map(m => m.id === memberId ? { ...m, role: newRole } : m))
    toast({
      title: "Role Updated",
      description: "Member permissions have been modified.",
    })
  }

  const handleDeleteMember = (memberId: string) => {
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
        <Button onClick={handleSaveGeneral}>
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-8">
        <Tabs defaultValue="general" className="flex flex-col md:flex-row gap-8 items-start">
          <TabsList className="flex flex-col h-auto bg-transparent border-none p-0 gap-1 min-w-[200px] items-start sticky top-24 self-start">
            <TabsTrigger 
              value="general" 
              className="w-full justify-start gap-2 px-4 py-3 data-[state=active]:bg-muted/50 data-[state=active]:text-primary"
            >
              <SettingsIcon className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger 
              value="members" 
              className="w-full justify-start gap-2 px-4 py-3 data-[state=active]:bg-muted/50 data-[state=active]:text-primary"
            >
              <Users className="h-4 w-4" />
              Member Access
            </TabsTrigger>
            <TabsTrigger 
              value="admin" 
              className="w-full justify-start gap-2 px-4 py-3 data-[state=active]:bg-muted/50 data-[state=active]:text-primary"
            >
              <Shield className="h-4 w-4" />
              Admin Controls
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 space-y-6">
            <TabsContent value="general" className="mt-0 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Board Configuration</CardTitle>
                  <CardDescription>
                    Manage basic details about your workspace.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="board-name">Board Name</Label>
                    <Input 
                      id="board-name" 
                      value={boardName} 
                      onChange={(e) => setBoardName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Workspace Visibility</Label>
                    <Select defaultValue="private">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="private">Private (Invite only)</SelectItem>
                        <SelectItem value="internal">Internal (Everyone in organization)</SelectItem>
                        <SelectItem value="public">Public (Open to web)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-accent/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LinkIcon className="h-5 w-5 text-accent" />
                    Room Invitation Link
                  </CardTitle>
                  <CardDescription>
                    Share this unique link to invite students to your room. They will be forced to join as Members.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input 
                      readOnly 
                      value={roomInviteLink} 
                      className="bg-muted/50 border-dashed"
                    />
                    <Button variant="outline" size="icon" onClick={handleCopyLink} className="shrink-0">
                      {hasCopied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div className="rounded-lg bg-accent/5 p-3 border border-accent/10">
                    <p className="text-[11px] text-accent font-medium leading-relaxed">
                      <strong>Security Policy:</strong> This link is restricted. Any account created using this ID is automatically assigned the <strong>Student Member</strong> role and cannot be elevated to Teacher/Admin through this route.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Notifications</CardTitle>
                  <CardDescription>
                    Control how you receive updates about this board.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Task Assignments</p>
                      <p className="text-xs text-muted-foreground">Receive email when a task is assigned to you.</p>
                    </div>
                    <Badge variant="outline">Enabled</Badge>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Weekly Digest</p>
                      <p className="text-xs text-muted-foreground">Get a summary of completed work every Monday.</p>
                    </div>
                    <Badge variant="secondary">Disabled</Badge>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="members" className="mt-0 space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Team Members</CardTitle>
                    <CardDescription>
                      Manage who has access to this board and their permission levels.
                    </CardDescription>
                  </div>
                  <Button size="sm">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite Member
                  </Button>
                </CardHeader>
                <CardContent>
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
                              className="h-8 w-8 text-destructive"
                              onClick={() => handleDeleteMember(member.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="admin" className="mt-0 space-y-6">
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
                    <Button variant="outline">Reset Board</Button>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">Archive Board</p>
                      <p className="text-xs text-muted-foreground">Make this board read-only for all members.</p>
                    </div>
                    <Button variant="outline">Archive</Button>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-destructive">Delete Permanently</p>
                      <p className="text-xs text-muted-foreground">Destroy this board and all its associated data forever.</p>
                    </div>
                    <Button variant="destructive">Delete Board</Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>System Logs</CardTitle>
                  <CardDescription>
                    Recent administrative actions on this board.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { action: "Member Invited", user: "Alex Rivera", target: "Morgan Lee", time: "2h ago" },
                      { action: "Board Renamed", user: "Alex Rivera", target: "SprintSync Board", time: "1d ago" },
                      { action: "Settings Updated", user: "Jordan Smith", target: "Privacy: Private", time: "3d ago" }
                    ].map((log, i) => (
                      <div key={i} className="flex justify-between text-xs border-b pb-2 last:border-0">
                        <span className="font-medium text-primary">{log.action}</span>
                        <span className="text-muted-foreground">by {log.user} ({log.time})</span>
                      </div>
                    ))}
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
