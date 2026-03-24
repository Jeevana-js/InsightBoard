
"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { LayoutGrid, Mail, Lock, Loader2, User as UserIcon, CheckCircle2, GraduationCap, Briefcase, Hash, Fingerprint } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth, useUser, useFirestore } from "@/firebase"
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, getRedirectResult, updateProfile, User } from "firebase/auth"
import { doc, getDoc, setDoc, updateDoc, arrayUnion, collection, query, where, getDocs } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function LoginPage() {
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [isProcessingRedirect, setIsProcessingRedirect] = React.useState(true)
  
  const [showRoleSelection, setShowRoleSelection] = React.useState(false)
  const [tempGoogleUser, setTempGoogleUser] = React.useState<User | null>(null)
  const [onboardingData, setOnboardingData] = React.useState({
    username: "",
    rollNumber: "",
    role: "student" as "teacher" | "student",
    inviteCode: ""
  })

  const auth = useAuth()
  const db = useFirestore()
  const { user: currentUser, isUserLoading } = useUser()
  const router = useRouter()
  const { toast } = useToast()

  // Handle Redirect Result on Mount (as a fallback)
  React.useEffect(() => {
    let isMounted = true;
    const checkRedirect = async () => {
      try {
        const result = await getRedirectResult(auth)
        if (result && result.user && isMounted) {
          const user = result.user
          setIsLoading(true)

          const userDoc = await getDoc(doc(db, "users", user.uid))
          if (userDoc.exists()) {
            router.push("/")
            return
          }

          const q = query(collection(db, "boards"), where("memberIds", "array-contains", user.uid))
          const memberSnap = await getDocs(q)
          
          if (!memberSnap.empty) {
            await setDoc(doc(db, "users", user.uid), {
              id: user.uid,
              username: user.displayName || "User",
              email: user.email,
              rollNumber: "PENDING",
              role: 'member',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            })
            router.push("/")
          } else {
            setTempGoogleUser(user)
            setOnboardingData(prev => ({ ...prev, username: user.displayName || "" }))
            setShowRoleSelection(true)
          }
        }
      } catch (error: any) {
        if (error.code !== 'auth/no-current-user') {
          toast({
            variant: "destructive",
            title: "Sign-in Error",
            description: error.message,
          })
        }
      } finally {
        if (isMounted) {
          setIsProcessingRedirect(false)
          setIsLoading(false)
        }
      }
    }
    checkRedirect()
    return () => { isMounted = false; }
  }, [auth, db, router, toast])

  // Watch for currentUser settle
  React.useEffect(() => {
    if (currentUser && !showRoleSelection && !isUserLoading && !tempGoogleUser && !isProcessingRedirect) {
      const checkProfile = async () => {
        try {
          const docSnap = await getDoc(doc(db, "users", currentUser.uid))
          if (docSnap.exists()) {
            router.push("/")
          } else {
            setTempGoogleUser(currentUser)
            setOnboardingData(prev => ({ ...prev, username: currentUser.displayName || "" }))
            setShowRoleSelection(true)
          }
        } catch (err) {
          // Profile check might fail if firestore hasn't synced auth yet
        }
      }
      checkProfile()
    }
  }, [currentUser, showRoleSelection, router, db, isUserLoading, tempGoogleUser, isProcessingRedirect])

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      router.push("/")
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error.message,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    if (isLoading) return
    setIsLoading(true)
    
    try {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })
      const result = await signInWithPopup(auth, provider)
      const user = result.user

      const userDoc = await getDoc(doc(db, "users", user.uid))
      if (userDoc.exists()) {
        router.push("/")
        return
      }

      const q = query(collection(db, "boards"), where("memberIds", "array-contains", user.uid))
      const memberSnap = await getDocs(q)
      
      if (!memberSnap.empty) {
        await setDoc(doc(db, "users", user.uid), {
          id: user.uid,
          username: user.displayName || "User",
          email: user.email,
          rollNumber: "PENDING",
          role: 'member',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        router.push("/")
      } else {
        setTempGoogleUser(user)
        setOnboardingData(prev => ({ ...prev, username: user.displayName || "" }))
        setShowRoleSelection(true)
      }
    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user') {
        toast({
          variant: "destructive",
          title: "Google Login Failed",
          description: error.message || "An error occurred during sign-in.",
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleFinishOnboarding = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tempGoogleUser) return

    if (!onboardingData.rollNumber.trim()) {
      toast({ variant: "destructive", title: "Missing Roll Number", description: "Please enter your roll number." })
      return
    }

    setIsLoading(true)
    try {
      const user = tempGoogleUser
      const isInviteActive = onboardingData.inviteCode.trim().length > 5
      const appRole = (isInviteActive || onboardingData.role === 'student') ? 'member' : 'admin'
      
      if (onboardingData.username !== user.displayName) {
        await updateProfile(user, { displayName: onboardingData.username })
      }

      await setDoc(doc(db, "users", user.uid), {
        id: user.uid,
        username: onboardingData.username,
        email: user.email,
        rollNumber: onboardingData.rollNumber.trim(),
        role: appRole,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })

      // Teachers create rooms from the dashboard, no auto-board creation

      if (isInviteActive) {
        const targetCode = onboardingData.inviteCode.trim().toLowerCase()
        // Search by inviteCode field
        const q = query(collection(db, "boards"), where("inviteCode", "==", targetCode))
        const snap = await getDocs(q)
        
        if (!snap.empty) {
          const boardDoc = snap.docs[0]
          await updateDoc(doc(db, "boards", boardDoc.id), {
            memberIds: arrayUnion(user.uid),
            updatedAt: new Date().toISOString()
          })
        }
      }

      toast({
        title: "Profile Setup Complete",
        description: `Welcome to InsightBoard, ${onboardingData.username}!`,
      })
      router.push("/")
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Setup Failed",
        description: error.message,
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isProcessingRedirect || (isUserLoading && !currentUser)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/40">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground font-medium animate-pulse">Checking authentication...</p>
        </div>
      </div>
    )
  }

  if (showRoleSelection) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4 py-12">
        <Card className="w-full max-w-md shadow-xl border-t-4 border-t-primary">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <div className="h-12 w-12 bg-primary rounded-xl flex items-center justify-center shadow-lg">
                <UserIcon className="h-7 w-7 text-primary-foreground" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">Complete Your Profile</CardTitle>
            <CardDescription>
              Tell us how you'll be using InsightBoard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleFinishOnboarding} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="username">Display Name</Label>
                <Input 
                  id="username" 
                  value={onboardingData.username}
                  onChange={(e) => setOnboardingData({...onboardingData, username: e.target.value})}
                  required 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rollNumber">Roll Number / ID</Label>
                <div className="relative">
                  <Fingerprint className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="rollNumber" 
                    placeholder="e.g. 225001" 
                    className="pl-10"
                    value={onboardingData.rollNumber}
                    onChange={(e) => setOnboardingData({...onboardingData, rollNumber: e.target.value})}
                    required 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Your Role</Label>
                <Select 
                  value={onboardingData.role}
                  onValueChange={(val) => setOnboardingData({...onboardingData, role: val as any, inviteCode: ""})}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">
                      <div className="flex items-center">
                        <GraduationCap className="h-4 w-4 mr-2 text-primary" />
                        Student (Member)
                      </div>
                    </SelectItem>
                    <SelectItem value="teacher">
                      <div className="flex items-center">
                        <Briefcase className="h-4 w-4 mr-2 text-primary" />
                        Teacher (Admin)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {onboardingData.role === 'teacher' && (
                <Alert className="border-primary/20 bg-primary/5">
                  <Hash className="h-4 w-4 text-primary" />
                  <AlertTitle className="text-xs font-bold uppercase tracking-wider text-primary">Teacher Dashboard</AlertTitle>
                  <AlertDescription className="text-xs">
                    After setup, you can create multiple rooms from your dashboard. Each room gets a unique invite code to share with students.
                  </AlertDescription>
                </Alert>
              )}

              {onboardingData.role === 'student' && (
                <div className="space-y-2">
                  <Label htmlFor="inviteCode">Invitation Code (Optional)</Label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="inviteCode" 
                      placeholder="Enter code to join a room" 
                      className="pl-10"
                      value={onboardingData.inviteCode}
                      onChange={(e) => setOnboardingData({...onboardingData, inviteCode: e.target.value})}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground italic px-1">
                    Enter a Teacher's code to join their workspace.
                  </p>
                </div>
              )}

              <Button type="submit" className="w-full mt-4" disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Finish Setup
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md shadow-xl border-t-4 border-t-primary">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 bg-primary rounded-xl flex items-center justify-center shadow-lg">
              <LayoutGrid className="h-7 w-7 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Welcome Back</CardTitle>
          <CardDescription>
            Enter your credentials to access your InsightBoard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="name@example.com" 
                  className="pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link href="#" className="text-xs text-primary hover:underline">Forgot password?</Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="password" 
                  type="password" 
                  className="pl-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Sign In
            </Button>
          </form>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>
          
          <Button variant="outline" className="w-full" onClick={handleGoogleLogin} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <svg className="mr-2 h-4 w-4" viewBox="0 0 488 512">
                <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
              </svg>
            )}
            Google
          </Button>
        </CardContent>
        <CardFooter className="flex flex-wrap items-center justify-center gap-1 text-sm text-muted-foreground">
          Don't have an account? 
          <Link href="/signup" className="text-primary font-semibold hover:underline">Create an account</Link>
        </CardFooter>
      </Card>
    </div>
  )
}
