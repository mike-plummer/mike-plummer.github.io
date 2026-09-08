import { z } from 'zod';
import { STAGE_ORDER } from '../stage-meta';

const [firstStage, ...remainingStages] = STAGE_ORDER;
export const StageIdSchema = z.enum([firstStage, ...remainingStages]);

export const CheckpointSchema = z.object({
  currentStage: StageIdSchema,
  completedStages: z.array(StageIdSchema),
  furthestStage: StageIdSchema.optional()
});

export const RawCheckpointSchema = z.object({
  currentStage: z.string(),
  completedStages: z.array(z.string()),
  furthestStage: z.string().optional()
});

export type RawCheckpoint = z.infer<typeof RawCheckpointSchema>;

export const OrdersPromptVerdict = z.enum(['INCONCLUSIVE', 'PROTECTED', 'RESTRICTIVE', 'VULNERABLE']);

export const OrdersPromptEvalSchema = z.object({
  verdict: OrdersPromptVerdict,
  feedback: z.string().min(1)
});

export const OrdersAbuseBlockEvalSchema = z.object({
  blocked: z.boolean(),
  feedback: z.string().min(1)
});

export const OrdersAbuseBlockEvalJsonSchema = z
  .object({
    abuse_blocked: z.boolean().optional(),
    abuse_would_succeed: z.boolean().optional(),
    blocked: z.boolean().optional(),
    vulnerable: z.boolean().optional(),
    feedback: z.string().optional(),
    explanation: z.string().optional()
  })
  .transform((data) => {
    const blocked =
      data.abuse_blocked ??
      data.blocked ??
      (data.abuse_would_succeed === true
        ? false
        : data.abuse_would_succeed === false
          ? true
          : undefined) ??
      (data.vulnerable === true ? false : data.vulnerable === false ? true : undefined);

    return {
      blocked,
      feedback: (data.feedback ?? data.explanation ?? '').trim()
    };
  })
  .pipe(OrdersAbuseBlockEvalSchema);

export const OrdersUsabilityEvalSchema = z.object({
  normalUseOk: z.boolean(),
  feedback: z.string().min(1)
});

export const OrdersUsabilityEvalJsonSchema = z
  .object({
    normal_use_ok: z.boolean().optional(),
    normalUseOk: z.boolean().optional(),
    feedback: z.string().optional(),
    explanation: z.string().optional()
  })
  .transform((data) => ({
    normalUseOk: data.normal_use_ok ?? data.normalUseOk,
    feedback: (data.feedback ?? data.explanation ?? '').trim()
  }))
  .pipe(OrdersUsabilityEvalSchema);

export const EvalJudgeSchema = z.object({
  quality: z.number().min(0).max(100),
  completeness: z.number().min(0).max(100),
  feedback: z.string().min(1)
});

export const EvalJudgeJsonSchema = z
  .object({
    quality: z.number(),
    completeness: z.number(),
    feedback: z.string().optional(),
    explanation: z.string().optional()
  })
  .transform((data) => ({
    quality: data.quality,
    completeness: data.completeness,
    feedback: (data.feedback ?? data.explanation ?? '').trim()
  }))
  .pipe(EvalJudgeSchema);
