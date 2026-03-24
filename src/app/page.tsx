
"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { KanbanBoard } from "@/components/board/KanbanBoard"
import { useUser, useDoc, useFirestore, useMemoFirebase } from "@/firebase"
import { doc } from "firebase/firestore"
import { Loader2 } from "lucide-react"

export default function Home() {
  const { user, isUserLoading } = useUser()
  const router = useRouter()
  const db = useFirestore()

  // Memoize document reference for fetching user profile
  const profileRef = useMemoFirebase(() => {
    if (!user) return null
    return doc(db, "users", user.uid)
  }, [user, db])

  const { data: profile, isLoading: isProfileLoading } = useDoc(profileRef)

  React.useEffect(() => {
    // Only redirect if we are certain the user is not logged in.
    // Small delay helps avoid bounce-back during auth settlement (especially after redirect login).
    if (!isUserLoading && !user) {
      const timeout = setTimeout(() => {
        router.push("/login")
      }, 500)
      return () => clearTimeout(timeout)
    }
  }, [user, isUserLoading, router])

  // If loading user or if we have a user but are still fetching their profile
  if (isUserLoading || (user && isProfileLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground font-medium animate-pulse">Syncing your workspace...</p>
        </div>
      </div>
    )
  }

  // If no user after loading, let the useEffect handle the redirect.
  if (!user) return null

  // If we have a user but no profile (newly signed up or finishing redirect)
  if (!profile && !isProfileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4 max-w-sm">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-lg font-semibold">Preparing your profile...</p>
          <p className="text-sm text-muted-foreground">If you're new, we're setting things up. If this takes more than a few seconds, you may need to complete setup.</p>
          <button 
            onClick={() => router.push("/login")}
            className="text-primary underline text-sm"
          >
            Go to setup
          </button>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <KanbanBoard 
        userRole={profile?.role} 
        username={profile?.username || user.displayName} 
        rollNumber={profile?.rollNumber}
      />
    </main>
  )
}
