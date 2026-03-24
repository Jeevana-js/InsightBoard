
"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { KanbanBoard } from "@/components/board/KanbanBoard"
import { RoomDashboard } from "@/components/board/RoomDashboard"
import { useUser, useDoc, useFirestore, useMemoFirebase } from "@/firebase"
import { doc } from "firebase/firestore"
import { Loader2 } from "lucide-react"

export default function Home() {
  const { user, isUserLoading } = useUser()
  const router = useRouter()
  const db = useFirestore()
  const [selectedBoardId, setSelectedBoardId] = React.useState<string | null>(null)

  // Memoize document reference for fetching user profile
  const profileRef = useMemoFirebase(() => {
    if (!user) return null
    return doc(db, "users", user.uid)
  }, [user, db])

  const { data: profile, isLoading: isProfileLoading } = useDoc(profileRef)

  React.useEffect(() => {
    if (!isUserLoading && !user) {
      const timeout = setTimeout(() => {
        router.push("/login")
      }, 2500)
      return () => clearTimeout(timeout)
    }
  }, [user, isUserLoading, router])

  // Restore selected board from sessionStorage
  React.useEffect(() => {
    const stored = sessionStorage.getItem("activeBoardId")
    if (stored) setSelectedBoardId(stored)
  }, [])

  const handleSelectBoard = (boardId: string) => {
    setSelectedBoardId(boardId)
    sessionStorage.setItem("activeBoardId", boardId)
  }

  const handleBackToDashboard = () => {
    setSelectedBoardId(null)
    sessionStorage.removeItem("activeBoardId")
  }

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

  if (!user) return null

  if (!profile && !isProfileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4 max-w-sm">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-lg font-semibold">Preparing your profile...</p>
          <p className="text-sm text-muted-foreground">If you're new, we're setting things up. This may take a moment.</p>
          <button 
            onClick={() => router.push("/login")}
            className="text-primary underline text-sm mt-4 block mx-auto"
          >
            Go to setup
          </button>
        </div>
      </div>
    )
  }

  // If a board is selected, show the KanbanBoard
  if (selectedBoardId) {
    return (
      <main className="min-h-screen bg-background">
        <KanbanBoard 
          boardId={selectedBoardId}
          userRole={profile?.role} 
          username={profile?.username || user.displayName} 
          rollNumber={profile?.rollNumber}
          onBack={handleBackToDashboard}
        />
      </main>
    )
  }

  // Otherwise show the room dashboard
  return (
    <main className="min-h-screen bg-background">
      <RoomDashboard
        userRole={profile?.role}
        username={profile?.username || user.displayName}
        onSelectBoard={handleSelectBoard}
      />
    </main>
  )
}
