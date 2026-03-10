import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { QuestTypeBadge, QuestStatusBadge } from "@/components/quest-badges"
import type { Quest } from "@clawquest/shared"

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000"

interface QuestCompletionProps {
  quest: Quest
  participation?: {
    id: string
    status: string
    proof?: any
  }
  accessToken?: string
  onSubmitSuccess?: () => void
}

interface ProofFormData {
  proofUrl: string
  notes: string
  screenshot: File | null
}

export function QuestCompletion({
  quest,
  participation,
  accessToken,
  onSubmitSuccess,
}: QuestCompletionProps) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState<ProofFormData>({
    proofUrl: "",
    notes: "",
    screenshot: null,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Submit proof mutation
  const submitProofMutation = useMutation({
    mutationFn: async (data: ProofFormData) => {
      if (!accessToken) throw new Error("Not authenticated")

      // Prepare proof payload
      const proof = [
        {
          taskType: quest.tasks?.[0]?.actionType || "follow_account",
          proofUrl: data.proofUrl,
          meta: {
            notes: data.notes || undefined,
            screenshotName: data.screenshot?.name,
          },
        },
      ]

      const res = await fetch(`${API_BASE}/quests/${quest.id}/proof`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ proof }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Failed to submit proof" }))
        throw new Error(err.message || "Failed to submit proof")
      }

      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quest", quest.id] })
      onSubmitSuccess?.()
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validate
    const newErrors: Record<string, string> = {}
    if (!formData.proofUrl.trim()) {
      newErrors.proofUrl = "Proof URL is required"
    } else {
      try {
        new URL(formData.proofUrl)
      } catch {
        newErrors.proofUrl = "Please enter a valid URL"
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setErrors({})
    submitProofMutation.mutate(formData)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setErrors((prev) => ({ ...prev, screenshot: "File size must be under 5MB" }))
        return
      }
      // Validate file type
      if (!["image/png", "image/jpeg", "image/jpg"].includes(file.type)) {
        setErrors((prev) => ({ ...prev, screenshot: "Only PNG and JPG files are supported" }))
        return
      }
      setFormData((prev) => ({ ...prev, screenshot: file }))
      setErrors((prev) => {
        const { screenshot, ...rest } = prev
        return rest
      })
    }
  }

  // Check participation status
  const participationStatus = participation?.status || "not_started"
  const submittedProof = participation?.proof

  // Render based on status
  if (participationStatus === "pending") {
    return <SubmissionReviewState quest={quest} proof={submittedProof} />
  }

  if (participationStatus === "approved" || participationStatus === "completed") {
    return <SubmissionApprovedState quest={quest} proof={submittedProof} />
  }

  if (participationStatus === "rejected") {
    return <SubmissionRejectedState quest={quest} proof={submittedProof} />
  }

  // Default: Show submission form
  return (
    <div className="space-y-6">
      {/* Quest Header */}
      <div>
        <div className="flex gap-2 mb-3">
          <QuestStatusBadge status={quest.status} />
          <QuestTypeBadge type={quest.type} />
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold mb-2">{quest.title}</h1>
        <p className="text-muted-foreground">{quest.description}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wider mb-1 text-muted-foreground">Reward</div>
          <div className="text-xl font-semibold">
            {quest.rewardAmount} {quest.rewardType}
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-xs uppercase tracking-wider mb-1 text-muted-foreground">Deadline</div>
          <div className="text-xl font-semibold">
            {quest.expiresAt ? new Date(quest.expiresAt).toLocaleDateString() : "No deadline"}
          </div>
          <div className="text-xs mt-1 text-muted-foreground">
            {quest.expiresAt
              ? `${Math.ceil((new Date(quest.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days remaining`
              : "Ongoing"}
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-xs uppercase tracking-wider mb-1 text-muted-foreground">Available Slots</div>
          <div className="text-xl font-semibold">
            {quest.totalSlots - quest.filledSlots} / {quest.totalSlots}
          </div>
          <div className="text-xs mt-1 text-muted-foreground">
            {quest.filledSlots} already claimed
          </div>
        </Card>
      </div>

      {/* Requirements Section */}
      {quest.tasks && quest.tasks.length > 0 && (
        <Card className="p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-4 text-muted-foreground">
            Requirements
          </h2>
          <div>
            {quest.tasks.map((task: any, idx: number) => (
              <div
                key={idx}
                className={cn("flex gap-3 py-3", idx !== quest.tasks.length - 1 && "border-b")}
              >
                <svg
                  className="w-5 h-5 text-success flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <div className="flex-1">
                  <div className="text-sm font-medium">{task.description}</div>
                  {task.params && (
                    <div className="text-xs mt-0.5 text-muted-foreground">
                      {JSON.stringify(task.params)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Proof Submission Form */}
      <Card className="p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-4 text-muted-foreground">
          Submit Proof
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Proof URL */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Proof URL <span className="text-destructive">*</span>
            </label>
            <Input
              type="url"
              value={formData.proofUrl}
              onChange={(e) => setFormData((prev) => ({ ...prev, proofUrl: e.target.value }))}
              placeholder="https://twitter.com/yourhandle/status/123456789"
              required
              className={errors.proofUrl ? "border-destructive" : ""}
            />
            {errors.proofUrl && (
              <p className="text-xs mt-1 text-destructive">{errors.proofUrl}</p>
            )}
            <p className="text-xs mt-1 text-muted-foreground">
              Paste the full URL of your proof (tweet, post, etc.)
            </p>
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Additional Notes{" "}
              <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
            </label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              rows={4}
              placeholder="Any additional context you'd like to provide..."
            />
          </div>

          {/* Screenshot Upload */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Upload Screenshot{" "}
              <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
            </label>
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer hover:border-primary",
                "bg-muted/50 hover:bg-muted",
                errors.screenshot && "border-destructive"
              )}
              onClick={() => document.getElementById("screenshot-input")?.click()}
            >
              <input
                id="screenshot-input"
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={handleFileChange}
                className="hidden"
              />
              <svg
                className="w-10 h-10 mx-auto mb-3 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              {formData.screenshot ? (
                <div>
                  <p className="text-sm font-medium">{formData.screenshot.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(formData.screenshot.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-sm mb-1">Drag & drop or click to upload</p>
                  <p className="text-xs text-muted-foreground">PNG, JPG up to 5MB</p>
                </>
              )}
            </div>
            {errors.screenshot && (
              <p className="text-xs mt-1 text-destructive">{errors.screenshot}</p>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={submitProofMutation.isPending}
          >
            {submitProofMutation.isPending ? "Submitting..." : "Submit Proof"}
          </Button>

          {submitProofMutation.isError && (
            <p className="text-sm text-destructive text-center">
              {submitProofMutation.error instanceof Error
                ? submitProofMutation.error.message
                : "Failed to submit proof"}
            </p>
          )}
        </form>
      </Card>
    </div>
  )
}

// ─── Submission States ───────────────────────────────────────────────────────

function SubmissionReviewState({ quest, proof }: { quest: Quest; proof?: any }) {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex gap-2 mb-3">
          <QuestStatusBadge status={quest.status} />
          <QuestTypeBadge type={quest.type} />
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold mb-2">{quest.title}</h1>
      </div>

      {/* Status Card */}
      <Card className="p-6 border-warning/50 bg-warning/10">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-warning font-medium">Under Review</h3>
              <Badge variant="outline" className="border-warning/30 text-warning">Pending</Badge>
            </div>
            <p className="text-sm text-warning/70 mb-3">
              Your submission is being reviewed by our team. You'll be notified once the review is complete.
            </p>
            <div className="text-xs text-muted-foreground">
              Submitted {new Date().toLocaleDateString()}<br />
              Expected review time: 1-2 business days
            </div>
          </div>
        </div>
      </Card>

      {/* Submission Details */}
      <Card className="p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-4 text-muted-foreground">
          Your Submission
        </h2>
        <div className="space-y-3 text-sm">
          {proof && proof[0]?.proofUrl && (
            <div>
              <div className="text-xs mb-1 text-muted-foreground">Proof URL</div>
              <a
                href={proof[0].proofUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline break-all"
              >
                {proof[0].proofUrl}
              </a>
            </div>
          )}
          {proof && proof[0]?.meta?.notes && (
            <div>
              <div className="text-xs mb-1 text-muted-foreground">Additional Notes</div>
              <p className="text-muted-foreground">{proof[0].meta.notes}</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

function SubmissionApprovedState({ quest }: { quest: Quest; proof?: any }) {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex gap-2 mb-3">
          <QuestStatusBadge status={quest.status} />
          <QuestTypeBadge type={quest.type} />
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold mb-2">{quest.title}</h1>
      </div>

      {/* Status Card */}
      <Card className="p-6 border-success/50 bg-success/10">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-success font-medium">Quest Completed!</h3>
              <Badge variant="outline" className="border-success/30 text-success">Approved</Badge>
            </div>
            <p className="text-sm text-success/70">
              Congratulations! Your submission has been approved. Your reward will be processed shortly.
            </p>
          </div>
        </div>
      </Card>

      {/* Reward Info */}
      <Card className="p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-4 text-muted-foreground">
          Your Reward
        </h2>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-semibold">
              {quest.rewardAmount} {quest.rewardType}
            </div>
          </div>
          <Badge className="bg-success/20 text-success border-success/30">Processing</Badge>
        </div>
      </Card>
    </div>
  )
}

function SubmissionRejectedState({ quest, proof }: { quest: Quest; proof?: any }) {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex gap-2 mb-3">
          <QuestStatusBadge status={quest.status} />
          <QuestTypeBadge type={quest.type} />
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold mb-2">{quest.title}</h1>
      </div>

      {/* Status Card */}
      <Card className="p-6 border-error/50 bg-error/10">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-error/20 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-error font-medium">Submission Rejected</h3>
              <Badge variant="outline" className="border-error/30 text-error">Rejected</Badge>
            </div>
            <p className="text-sm text-error/70 mb-3">
              Unfortunately, your submission did not meet the quest requirements.
            </p>
            {proof && proof[0]?.meta?.rejectionReason && (
              <div className="text-xs text-muted-foreground">
                <strong>Reason:</strong> {proof[0].meta.rejectionReason}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Resubmit */}
      <Card className="p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-4 text-muted-foreground">
          Next Steps
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Please review the requirements and submit a new proof that meets all criteria.
        </p>
        <Button className="w-full">Submit New Proof</Button>
      </Card>
    </div>
  )
}
