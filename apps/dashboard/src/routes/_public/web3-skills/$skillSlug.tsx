import { Breadcrumb } from "@/components/breadcrumb"
import { SkillDetailContent } from "@/components/web3-skills/skill-detail-content"

export function Web3SkillDetail({ skillSlug }: { skillSlug: string }) {
  return (
    <div className="space-y-4">
      <Breadcrumb items={[
        { label: "Web3 Skills", to: "/web3-skills" },
        { label: skillSlug },
      ]} />
      <SkillDetailContent skillSlug={skillSlug} />
    </div>
  )
}
