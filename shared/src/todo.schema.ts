import { z } from 'zod';

export const TITLE_MAX_LENGTH = 200;
export const DESCRIPTION_MAX_LENGTH = 2000;

const titleSchema = z
  .string({ error: 'Title must be a string' })
  .trim()
  .min(1, 'Title is required')
  .max(TITLE_MAX_LENGTH, `Title must be at most ${TITLE_MAX_LENGTH} characters`);

/** Optional free text; blank strings are normalized to `null` so "empty" has one representation. */
const descriptionSchema = z
  .string({ error: 'Description must be a string' })
  .trim()
  .max(DESCRIPTION_MAX_LENGTH, `Description must be at most ${DESCRIPTION_MAX_LENGTH} characters`)
  .nullable()
  .transform((value) => value || null);

/** Calendar date in YYYY-MM-DD; impossible dates such as 2026-02-30 are rejected. */
const dueDateSchema = z.iso
  .date({ error: 'Due date must be a valid date in YYYY-MM-DD format' })
  .nullable();

/** A persisted to-do item, as stored and as returned by the API. */
export const todoSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  description: z.string().nullable(),
  dueDate: z.iso.date().nullable(),
  isCompleted: z.boolean(),
  createdAt: z.iso.datetime(),
});

/** Body of a create request. Server-owned fields (id, createdAt, isCompleted) are rejected. */
export const createTodoSchema = z.strictObject({
  title: titleSchema,
  description: descriptionSchema.default(null),
  dueDate: dueDateSchema.default(null),
});

/**
 * Body of a partial update. Omitted fields are left unchanged; `null` clears an optional field.
 * Completion status is changed through the dedicated complete/incomplete operations instead.
 */
export const updateTodoSchema = z
  .strictObject({
    title: titleSchema.optional(),
    description: descriptionSchema.optional(),
    dueDate: dueDateSchema.optional(),
  })
  .refine((changes) => Object.keys(changes).length > 0, {
    error: 'At least one of title, description or dueDate must be provided',
  });

export type Todo = z.infer<typeof todoSchema>;

/** What a client may send when creating a todo. */
export type CreateTodoRequest = z.input<typeof createTodoSchema>;
/** A create request after validation and normalization. */
export type CreateTodoInput = z.output<typeof createTodoSchema>;

/** What a client may send when updating a todo. */
export type UpdateTodoRequest = z.input<typeof updateTodoSchema>;
/** An update request after validation and normalization. */
export type UpdateTodoInput = z.output<typeof updateTodoSchema>;
