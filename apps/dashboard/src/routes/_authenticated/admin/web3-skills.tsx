import { useState } from "react"
import { PageTitle } from "@/components/page-title"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useWeb3AdminPending, useWeb3AdminReview } from "@/hooks/useWeb3Skills"
import { WEB3_CATEGORIES } from "@clawquest/shared"
import { CheckLine, CloseLine } from "@mingcute/react"
import { toast } from "sonner"

export function AdminWeb3Skills() {
  return (
    <div className="space-y-6">
      <PageTitle title="Web3 Skills — Admin" description="Curate the Web3 Skills marketplace" />

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending Review</TabsTrigger>
          <TabsTrigger value="all">All Web3 Skills</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          <PendingReviewTab />
        </TabsContent>
        <TabsContent value="all" className="mt-4">
          <div className="text-sm text-muted-foreground">
            Use the public Web3 Skills page to browse all classified skills.
            Override classification from the pending review tab.
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function PendingReviewTab() {
  const { data, isLoading } = useWeb3AdminPending()
  const reviewMutation = useWeb3AdminReview()

  if (isLoading) return <Skeleton className="h-48" />

  const submissions = data?.submissions ?? []

  if (submissions.length === 0) {
    return <p className="py-8 text-center text-muted-foreground">No items pending review.</p>
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{submissions.length} item(s) pending review</p>

      {submissions.map((item) => (
        <PendingCard key={item.id} item={item} onReview={async (id, action, category, reviewNote) => {
          try {
            await reviewMutation.mutateAsync({ id, action, category, review_note: reviewNote })
            toast.success(`Submission ${action === "approve" ? "approved" : "rejected"}`)
          } catch {
            toast.error("Review failed")
          }
        }} />
      ))}
    </div>
  )
}

interface PendingItem {
  id: string
  name: string
  slug: string
  summary: string
  category: string
  status: string
  created_at: string
  submitter?: { displayName: string | null; email: string }
}

function PendingCard({ item, onReview }: {
  item: PendingItem
  onReview: (id: string, action: string, category?: string, reviewNote?: string) => void
}) {
  const [category, setCategory] = useState(item.category)
  const [note, setNote] = useState("")

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">Community</Badge>
            <h3 className="text-sm font-semibold">{item.name}</h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            by {item.submitter?.displayName ?? item.submitter?.email ?? "Unknown"} — {new Date(item.created_at).toLocaleDateString()}
          </p>
        </div>
        <Badge variant="pill">{item.category}</Badge>
      </div>

      <p className="text-sm text-muted-foreground">{item.summary}</p>

      <div className="flex items-end gap-3 max-sm:flex-col">
        <div className="flex-1 max-sm:w-full">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WEB3_CATEGORIES.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Input
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Review note (optional)"
          className="h-8 flex-1 text-xs max-sm:w-full"
        />

        <div className="flex gap-2">
          <Button size="sm" variant="default" onClick={() => onReview(item.id, "approve", category, note || undefined)}>
            <CheckLine size={14} />
            Approve
          </Button>
          <Button size="sm" variant="outline" onClick={() => onReview(item.id, "reject", undefined, note || undefined)}>
            <CloseLine size={14} />
            Reject
          </Button>
        </div>
      </div>
    </div>
  )
}
