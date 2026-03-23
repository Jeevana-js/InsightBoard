
"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { LayoutGrid, Mail, Lock, User, Loader2, GraduationCap, Briefcase, CheckCircle2, Link as LinkIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth, useFirestore } from "@/firebase"
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth"
import { doc, setDoc, arrayUnion, updateDoc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function SignupPage() {
  const searchParams = useSearchParams()
  const boardId = searchParams.get('boardId')
  
  const [formData, setFormData] = React.useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: (boardId ? "student" : "student") as "teacher" | "student"
  })
  const [isLoading, setIsLoading] = React.useState(false)
  const auth = useAuth()
  const db = useFirestore()
  const router = useRouter()
  const { toast } = useToast()

  // If there's a boardId, we force the role to student
  React.useEffect(() => {
    if (boardId) {
      setFormData(prev => ({ ...prev, role: "student" }))
    }
  }, [boardId])

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

    setIsLoading(true)
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password)
      const user = userCredential.user
      
      // Update Firebase Auth profile
      await updateProfile(user, { displayName: formData.username })

      // Teacher -> Admin, Student -> Member
      const appRole = formData.role === 'teacher' ? 'admin' : 'member'
      
      // 1. Create User Profile
      await setDoc(doc(db, "users", user.uid), {
        id: user.uid,
        username: formData.username,
        email: formData.email,
        role: appRole,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })

      // 2. If signing up via board invite, add user to that board
      if (boardId) {
        try {
          const boardRef = doc(db, "boards", boardId)
          await updateDoc(boardRef, {
            memberIds: arrayUnion(user.uid)
          })
        } catch (boardError) {
          console.error("Failed to add user to board", boardError)
          // Don't fail the whole signup if board link fails, just alert the user
        }
      }

      toast({
        title: "Account Created Successfully",
        description: `Welcome to SprintSync, ${formData.username}!`,
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
            Join the elite agile community on SprintSync
          </CardDescription>
        </CardHeader>
        <CardContent>
          {boardId && (
            <Alert className="mb-6 border-accent/20 bg-accent/5">
              <LinkIcon className="h-4 w-4 text-accent" />
              <AlertTitle className="text-xs font-bold uppercase tracking-wider text-accent">Room Invite Active</AlertTitle>
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
              <Label htmlFor="role">What is your role?</Label>
              <Select 
                value={formData.role}
                onValueChange={(val) => setFormData({...formData, role: val as any})}
                disabled={!!boardId}
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
                  {!boardId && (
                    <SelectItem value="teacher">
                      <div className="flex items-center">
                        <Briefcase className="h-4 w-4 mr-2 text-primary" />
                        Teacher (Assigns as Admin)
                      </div>
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {boardId ? (
                <p className="text-[10px] text-accent font-medium italic px-1">
                  Role locked to Student for room security.
                </p>
              ) : (
                <p className="text-[10px] text-muted-foreground italic px-1">
                  Teachers receive administrative control over all member boards.
                </p>
              )}
            </div>

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
              {boardId ? "Join Room & Create Account" : "Create Account"}
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
