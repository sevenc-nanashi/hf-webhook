// https://huggingface.co/docs/hub/webhooks#webhook-payloads
import z from "zod";

const idSchema = z.union([z.string(), z.object({ buffer: z.string() })]);

export const repoSchema = z.object({
  type: z.string(),
  name: z.string(),
  id: idSchema,
  private: z.boolean(),
  url: z.object({ web: z.string(), api: z.string() }),
  owner: z.object({ id: z.string() }),
});

export const updatedRefsSchema = z.array(
  z.object({
    ref: z.string(),
    oldSha: z.string().nullable(),
    newSha: z.string(),
  }),
);

export const discussionSchema = z.object({
  id: idSchema,
  title: z.string(),
  url: z.object({ web: z.string(), api: z.string() }),
  status: z.string(),
  author: z.object({ id: idSchema }),
  num: z.number(),
  isPullRequest: z.boolean(),
  changes: z.object({ base: z.string() }).optional(),
});

export const commentSchema = z.object({
  id: z.string(),
  author: z.object({ id: idSchema }),
  content: z.string(),
  hidden: z.boolean(),
  url: z.object({ web: z.string() }),
});

export const webhookSchema = z.object({ id: z.string(), version: z.number() });

export const discussionPayloadSchema = z.object({
  event: z.object({
    action: z.enum(["create", "delete", "update"]),
    scope: z.literal("discussion"),
  }),
  repo: repoSchema,
  discussion: discussionSchema,
  comment: commentSchema.optional(),
});

export const discussionCommentPayloadSchema = z.object({
  event: z.object({
    action: z.enum(["create", "update"]),
    scope: z.literal("discussion.comment"),
  }),
  repo: repoSchema,
  discussion: discussionSchema,
  comment: commentSchema,
});
