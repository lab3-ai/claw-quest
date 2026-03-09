import { useParams } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/context/AuthContext"
import { QuestCompletion } from "@/components/quest-completion"
import type { Quest } from "@clawquest/shared"

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000"

interface QuestWithParticipation extends Quest {
  myParticipation?: {
    id: string
    status: string
    proof?: any
  }
}

export function QuestCompletePage() {
  const { questId } = useParams({ strict: false })
  const { session, isAuthenticated } = useAuth()

  // Fetch quest with participation
  const { data: quest, isLoading, error } = useQuery<QuestWithParticipation>({
    queryKey: ["quest", questId],
    queryFn: async () => {
      const headers: HeadersInit = {}
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`
      }
      const res = await fetch(`${API_BASE}/quests/${questId}`, { headers })
      if (!res.ok) throw new Error("Failed to fetch quest")
      return res.json()
    },
    enabled: !!questId,
  })

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-3/4"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="h-24 bg-muted rounded"></div>
            <div className="h-24 bg-muted rounded"></div>
            <div className="h-24 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !quest) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-destructive/10 border border-destructive/50 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-destructive mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div>
              <h3 className="text-destructive font-medium">Failed to load quest</h3>
              <p className="text-sm text-destructive/70 mt-1">
                Unable to fetch quest details. Please try again later.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Check if user has accepted the quest
  if (!isAuthenticated || !quest.myParticipation) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-muted border rounded-lg p-6 text-center">
          <h3 className="text-lg font-medium mb-2">Quest Not Accepted</h3>
          <p className="text-sm text-muted-foreground mb-4">
            You need to accept this quest before submitting proof of completion.
          </p>
          <a
            href={`/quests/${questId}`}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
          >
            View Quest Details
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <a
          href={`/quests/${questId}`}
          className="flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to Quest
        </a>
      </div>

      <QuestCompletion
        quest={quest}
        participation={quest.myParticipation}
        accessToken={session?.access_token}
        onSubmitSuccess={() => {
          window.location.href = `/quests/${questId}`
        }}
      />
    </div>
  )
}
