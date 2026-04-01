import z from "zod"

export const ReserveResponseSchema = z.object({
  redemptionToken: z.string(),
  expiresAt: z.number(),
})

export type ReserveResponseDto = z.infer<typeof ReserveResponseSchema>

export const ReserveBodySchema = z.object({
  cardId: z.string(),
  coffeeCount: z.number().positive(),
})

export type ReserveBodyDto = z.infer<typeof ReserveBodySchema>

export const CommitBodySchema = z.object({
  redemptionToken: z.string(),
})

export type CommitBodyDto = z.infer<typeof CommitBodySchema>
