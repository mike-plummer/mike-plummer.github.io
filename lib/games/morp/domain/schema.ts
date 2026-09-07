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

export const OrdersPromptEvalSchema = z.object({
  adequate: z.boolean(),
  feedback: z.string().min(1)
});

export const OrdersPromptEvalJsonSchema = z
  .object({
    adequate: z.boolean().optional(),
    protected: z.boolean().optional(),
    feedback: z.string().optional(),
    explanation: z.string().optional()
  })
  .refine((data) => typeof (data.adequate ?? data.protected) === 'boolean')
  .transform((data) => ({
    adequate: (data.adequate ?? data.protected) as boolean,
    feedback: (data.feedback ?? data.explanation ?? '').trim()
  }))
  .pipe(OrdersPromptEvalSchema);

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
