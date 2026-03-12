import { useState } from "react"
import { PageTitle } from "@/components/page-title"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useSubmitWeb3Skill } from "@/hooks/useWeb3Skills"
import { WEB3_CATEGORIES } from "@clawquest/shared"
import { CloseLine } from "@mingcute/react"
import { toast } from "sonner"

export function SubmitWeb3Skill() {
  const submitMutation = useSubmitWeb3Skill()

  const [name, setName] = useState("")
  const [summary, setSummary] = useState("")
  const [category, setCategory] = useState("")
  const [description, setDescription] = useState("")
  const [websiteUrl, setWebsiteUrl] = useState("")
  const [githubUrl, setGithubUrl] = useState("")
  const [logoUrl, setLogoUrl] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase()
    if (tag && !tags.includes(tag) && tags.length < 10) {
      setTags([...tags, tag])
      setTagInput("")
    }
  }

  const removeTag = (tag: string) => setTags(tags.filter(t => t !== tag))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await submitMutation.mutateAsync({
        name,
        summary,
        category,
        description: description || undefined,
        website_url: websiteUrl || undefined,
        github_url: githubUrl || undefined,
        logo_url: logoUrl || undefined,
        tags,
      })
      toast.success("Skill submitted for review!")
      window.location.href = "/web3-skills"
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit")
    }
  }

  const isValid = name.length >= 2 && summary.length >= 10 && summary.length <= 200 && category

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageTitle
        title="Submit a Web3 Skill"
        description="Add your project to the marketplace. Submissions require admin approval."
      />

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="name">Skill Name *</Label>
          <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Jupiter Aggregator SDK" maxLength={100} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="summary">Summary * (10–200 chars)</Label>
          <Input id="summary" value={summary} onChange={e => setSummary(e.target.value)} placeholder="Brief description of your skill" maxLength={200} />
          <p className="text-right text-xs text-muted-foreground">{summary.length}/200</p>
        </div>

        <div className="space-y-2">
          <Label>Category *</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
            <SelectContent>
              {WEB3_CATEGORIES.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description (optional, supports markdown)</Label>
          <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} rows={5} maxLength={5000} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="website">Website URL (optional)</Label>
          <Input id="website" type="url" value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} placeholder="https://..." />
        </div>
        <div className="space-y-2">
          <Label htmlFor="github">GitHub URL (optional)</Label>
          <Input id="github" type="url" value={githubUrl} onChange={e => setGithubUrl(e.target.value)} placeholder="https://github.com/..." />
        </div>
        <div className="space-y-2">
          <Label htmlFor="logo">Logo URL (optional)</Label>
          <Input id="logo" type="url" value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://..." />
        </div>

        <div className="space-y-2">
          <Label>Tags (optional, max 10)</Label>
          <div className="flex flex-wrap gap-2">
            {tags.map(tag => (
              <Badge key={tag} variant="pill" className="gap-1">
                {tag}
                <button type="button" onClick={() => removeTag(tag)} className="ml-1">
                  <CloseLine size={12} />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              placeholder="Add tag..."
              maxLength={30}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag() } }}
            />
            <Button type="button" variant="outline" size="sm" onClick={addTag} disabled={tags.length >= 10}>
              Add
            </Button>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={() => { window.location.href = "/web3-skills" }}>
            Cancel
          </Button>
          <Button type="submit" disabled={!isValid || submitMutation.isPending}>
            {submitMutation.isPending ? "Submitting..." : "Submit for Review"}
          </Button>
        </div>
      </form>
    </div>
  )
}
