import { useParams } from "@tanstack/react-router"
import { CreateQuest } from "../../quests/create"

export function EditQuest() {
    const { questId } = useParams({ from: "/_app/quests/$questId/edit" })
    return <CreateQuest editQuestId={questId} />
}
