import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import z from "zod";
import {
  discussionCommentPayloadSchema,
  discussionPayloadSchema,
} from "./schema.ts";
import { validator } from "hono/validator";
import { HTTPException } from "hono/http-exception";
import type { RESTPostAPIWebhookWithTokenJSONBody } from "discord-api-types/rest/v10";
import { truncate } from "./utils.ts";

const app = new Hono<{ Bindings: Cloudflare.Env }>();

const colors = {
  pullRequestCreated: 0x009800,
  pullRequestComment: 0xc5e7c5,
  issueCreated: 0xeb6420,
  issueComment: 0xe68d60,
} as const satisfies Record<string, number>;

app.post(
  "/webhook",
  zValidator(
    "json",
    z.union([discussionPayloadSchema, discussionCommentPayloadSchema]),
  ),
  validator("header", (header, c) => {
    if (header["x-webhook-secret"] !== c.env.WEBHOOK_SECRET) {
      throw new HTTPException(400, {
        message: "Invalid webhook secret",
      });
    }

    return;
  }),
  async (c) => {
    const payload = c.req.valid("json");
    const webhook = c.env.DISCORD_WEBHOOK;

    const isComment = payload.event.scope === "discussion.comment";

    let kind: keyof typeof colors;
    const truncatedTitle = truncate(payload.discussion.title, 150);
    let embedTitle: string;
    if (isComment) {
      if (payload.discussion.isPullRequest) {
        kind = "pullRequestComment";
        embedTitle = `[${payload.repo.name}] New comment on pull request #${payload.discussion.num}: ${truncatedTitle}`;
      } else {
        kind = "issueComment";
        embedTitle = `[${payload.repo.name}] New comment on discussion #${payload.discussion.num}: ${truncatedTitle}`;
      }
    } else {
      if (payload.discussion.isPullRequest) {
        kind = "pullRequestCreated";
        embedTitle = `[${payload.repo.name}] Pull request opened: #${payload.discussion.num} ${truncatedTitle}`;
      } else {
        kind = "issueCreated";
        embedTitle = `[${payload.repo.name}] New discussion: #${payload.discussion.num} ${truncatedTitle}`;
      }
    }

    const embed: RESTPostAPIWebhookWithTokenJSONBody = {
      embeds: [
        {
          title: embedTitle,
          url: payload.discussion.url.web,
          color: colors[kind],
          description: truncate(payload.comment.content, 500),
        },
      ],
    };

    await fetch(webhook, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(embed),
    });

    return c.body(null, 204);
  },
);

export default app;
