"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { LayoutGrid, Mail, Lock, User, Loader2, GraduationCap, Briefcase, CheckCircle2, Hash, Fingerprint } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth, useUser, useFirestore } from "@/firebase"
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth"
import { doc, setDoc, arrayUnion, updateDoc, getDoc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function SignupPage() {
  const [formData, setFormData] = React.useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    rollNumber: "",
    role: "student" as "teacher" | "student",
    inviteCode: ""
  })
  const [isLoading, setIsLoading] = React.useState(false)
  const auth = useAuth()
  const db = useFirestore()
  const router = useRouter()
  const { toast } = useToast()

  const isInviteActive = formData.inviteCode.trim().length > 5

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        variant: "destructive",
        title: "Passwords Mismatch",
        description: "Please ensure both passwords match.",
      })
      return
    }

    if (formData.password.length < 6) {
      toast({
        variant: "destructive",
        title: "Weak Password",
        description: "Password should be at least 6 characters.",
      })
      return
    }

    if (!formData.rollNumber.trim()) {
      toast({
        variant: "destructive",
        title: "Missing Roll Number",
        description: "Please enter your roll number or ID.",
      })
      return
    }

    setIsLoading(true)
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password)
      const user = userCredential.user
      
      await updateProfile(user, { displayName: formData.username })

      const appRole = (isInviteActive || formData.role === 'student') ? 'member' : 'admin'
      
      await setDoc(doc(db, "users", user.uid), {
        id: user.uid,
        username: formData.username,
        email: formData.email,
        rollNumber: formData.rollNumber.trim(),
        role: appRole,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })

      if (appRole === 'admin') {
        await setDoc(doc(db, "boards", user.uid), {
          id: user.uid,
          title: `${formData.username}'s Workspace`,
          ownerId: user.uid,
          memberIds: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      }

      if (isInviteActive) {
        const targetCode = formData.inviteCode.trim()
        const boardRef = doc(db, "boards", targetCode)
        const boardSnap = await getDoc(boardRef)
        
        if (boardSnap.exists()) {
          await updateDoc(boardRef, {
            memberIds: arrayUnion(user.uid)
          })
        }
      }

      toast({
        title: "Account Created Successfully",
        description: `Welcome to InsightBoard, ${formData.username}!`,
      })
      router.push("/")
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Signup Error",
        description: error.message,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4 py-12">
      <Card className="w-full max-w-md shadow-xl border-t-4 border-t-primary">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 bg-primary rounded-xl flex items-center justify-center shadow-lg">
              <LayoutGrid className="h-7 w-7 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Create Your Account</CardTitle>
          <CardDescription>
            Join the elite agile community on InsightBoard
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isInviteActive && (
            <Alert className="mb-6 border-accent/20 bg-accent/5">
              <Hash className="h-4 w-4 text-accent" />
              <AlertTitle className="text-xs font-bold uppercase tracking-wider text-accent">Room Code Active</AlertTitle>
              <AlertDescription className="text-xs">
                You are joining a Teacher's workspace. Your role is restricted to <strong>Student Member</strong>.
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="username" 
                  placeholder="johndoe" 
                  className="pl-10"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  required 
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rollNumber">Roll Number / ID</Label>
              <div className="relative">
                <Fingerprint className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="rollNumber" 
                  placeholder="e.g. 225001" 
                  className="pl-10"
                  value={formData.rollNumber}
                  onChange={(e) => setFormData({...formData, rollNumber: e.target.value})}
                  required 
                />
              </div>
              <p className="text-[10px] text-muted-foreground italic px-1">
                Your tasks will be numbered based on this ID.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="name@example.com" 
                  className="pl-10"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required 
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="inviteCode">Invitation Code (Optional)</Label>
              <div className="relative">
                <Hash className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="inviteCode" 
                  placeholder="Enter code to join a room" 
                  className="pl-10"
                  value={formData.inviteCode}
                  onChange={(e) => setFormData({...formData, inviteCode: e.target.value})}
                />
              </div>
              <p className="text-[10px] text-muted-foreground italic px-1">
                Entering a code will automatically join you to that Teacher's workspace as a Member.
              </p>
            </div>

            {!isInviteActive && (
              <div className="space-y-2">
                <Label htmlFor="role">What is your role?</Label>
                <Select 
                  value={formData.role}
                  onValueChange={(val) => setFormData({...formData, role: val as any})}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">
                      <div className="flex items-center">
                        <GraduationCap className="h-4 w-4 mr-2 text-primary" />
                        Student (Assigns as Member)
                      </div>
                    </SelectItem>
                    <SelectItem value="teacher">
                      <div className="flex items-center">
                        <Briefcase className="h-4 w-4 mr-2 text-primary" />
                        Teacher (Assigns as Admin)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground italic px-1">
                  Teachers receive administrative control over their workspace.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="password" 
                    type="password" 
                    className="pl-10"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    required 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="confirmPassword" 
                    type="password" 
                    className="pl-10"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                    required 
                  />
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full mt-4" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              {isInviteActive ? "Join Room & Create Account" : "Create Account"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-wrap items-center justify-center gap-1 text-sm text-muted-foreground">
          Already have an account? 
          <Link href="/login" className="text-primary font-semibold hover:underline">Sign In</Link>
        </CardFooter>
      </Card>
    </div>
  )
}
