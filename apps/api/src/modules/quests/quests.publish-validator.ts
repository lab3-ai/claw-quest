import { z } from 'zod';
import { QuestTaskSchema, FUNDING_STATUS } from '@clawquest/shared';
import { validateAllTasks } from './quests.service';

export interface PublishValidationError {
    code: 'PUBLISH_VALIDATION';
    fields: Record<string, string>;
}

/** Validate all required fields before a quest can go from draft → live. */
export function validatePublishRequirements(quest: any): PublishValidationError | null {
    const fields: Record<string, string> = {};

    if (!quest.title?.trim()) fields.title = 'Title is required';
    if (!quest.description?.trim()) fields.description = 'Description is required';

    // LLM_KEY quests have rewardAmount = 0 (tokens are the reward, tracked via llmKeyTokenLimit)
    if (quest.rewardType !== 'LLM_KEY') {
        const rewardAmountNum = Number(quest.rewardAmount ?? 0);
        if (!(rewardAmountNum > 0)) fields.rewardAmount = 'Reward amount must be > 0';
    }

    if (!quest.totalSlots || quest.totalSlots <= 0) fields.totalSlots = 'Total slots must be > 0';

    // LLM_KEY quests don't require on-chain funding
    if (quest.rewardType !== 'LLM_KEY') {
        const totalFunded = Number(quest.totalFunded ?? 0);
        const rewardAmtForFunding = Number(quest.rewardAmount ?? 0);
        if (quest.fundingStatus !== FUNDING_STATUS.CONFIRMED && totalFunded < rewardAmtForFunding) {
            fields.funding = `Insufficient funding: ${totalFunded}/${rewardAmtForFunding}`;
        }
    }

    // Tasks — safe-parse from JSON to prevent crash on malformed data
    const parsed = z.array(QuestTaskSchema).safeParse(quest.tasks ?? []);
    if (!parsed.success) {
        fields.tasks = 'Tasks contain invalid data — re-edit required';
    } else if (parsed.data.length === 0) {
        fields.tasks = 'At least one task is required';
    } else {
        const taskErr = validateAllTasks(parsed.data);
        if (taskErr) fields.tasks = taskErr;
    }

    // Dates
    if (quest.expiresAt && new Date(quest.expiresAt) <= new Date()) {
        fields.expiresAt = 'Expiry must be in the future';
    }

    // Lucky Draw specific
    if (quest.type === 'LUCKY_DRAW') {
        if (!quest.drawTime) fields.drawTime = 'Draw time is required for Lucky Draw';
        if (quest.drawTime && quest.expiresAt && new Date(quest.drawTime) > new Date(quest.expiresAt)) {
            fields.drawTime = 'Draw time must be before expiry';
        }
    }

    return Object.keys(fields).length > 0 ? { code: 'PUBLISH_VALIDATION', fields } : null;
}
