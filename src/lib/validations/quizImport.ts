import { z, type ZodError } from 'zod'

const OptionTextSchema = z
  .string()
  .min(1, 'Option text cannot be empty')
  .max(500, 'Option text is too long (max 500 chars)')
  .transform((s) => s.trim())

export const RawQuestionSchema = z.object({
  question: z.string().optional(),
  text: z.string().optional(),
  options: z
    .array(OptionTextSchema)
    .min(2, 'Each question needs at least 2 options')
    .max(6, 'Each question can have at most 6 options'),
  correct_answer: z
    .string()
    .regex(/^[A-Da-d]$/, 'correct_answer must be a single letter A–D')
    .nullable()
    .optional(),
  contributor: z.string().max(200).optional(),
  explanation: z.string().optional(),
}).refine(
  (q) => {
    const text = q.question ?? q.text ?? ''
    return text.trim().length >= 5
  },
  { message: 'Question text must be at least 5 characters' }
)

export const ExamJsonSchema = z.object({
  exam: z.string().optional(),
  questions: z
    .array(RawQuestionSchema)
    .min(1, 'File must contain at least one question')
    .max(500, 'File contains too many questions (max 500)'),
})

export type ValidatedExam = z.infer<typeof ExamJsonSchema>
export type ValidatedQuestion = z.infer<typeof RawQuestionSchema>

export interface QuestionValidationError {
  index: number
  messages: string[]
}

export function collectValidationErrors(
  result: ReturnType<typeof ExamJsonSchema.safeParse>
): QuestionValidationError[] {
  if (result.success) return []

  const zodError: ZodError = result.error
  const errors: QuestionValidationError[] = []
  const { formErrors } = zodError.flatten()

  // Top-level errors (e.g. empty questions array)
  if (formErrors.length > 0) {
    errors.push({ index: -1, messages: formErrors })
  }

  // Per-question errors come through as questions.X paths
  zodError.issues.forEach((issue) => {
    const path = issue.path as (string | number | symbol)[]
    if (path[0] === 'questions' && typeof path[1] === 'number') {
      const idx = path[1]
      const existing = errors.find((e) => e.index === idx)
      if (existing) {
        existing.messages.push(issue.message)
      } else {
        errors.push({ index: idx, messages: [issue.message] })
      }
    }
  })

  return errors
}
