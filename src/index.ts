import { zValidator } from "@hono/zod-validator";
import type { RESTPostAPIWebhookWithTokenJSONBody } from "discord-api-types/rest/v10";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { validator } from "hono/validator";
import z from "zod";
import {
  discussionCommentPayloadSchema,
  discussionPayloadSchema,
} from "./schema.ts";
import { truncate } from "./utils.ts";

const app = new Hono<{ Bindings: Cloudflare.Env }>();

const colors = {
  pullRequestCreated: 0x009800,
  pullRequestComment: 0xc5e7c5,
  discussionCreated: 0xeb6420,
  discussionComment: 0xe68d60,
};

app.post(
  "/webhook",
  zValidator(
    "json",
    z.union([discussionPayloadSchema, discussionCommentPayloadSchema]),
  ),
  validator("header", (header, c) => {
    if (header["x-webhook-secret"] !== c.env.WEBHOOK_SECRET) {
      throw new HTTPException(403, {
        message: "Invalid webhook secret",
      });
    }

    return;
  }),
  async (c) => {
    const payload = c.req.valid("json");
    const webhook = c.env.DISCORD_WEBHOOK;

    const isComment = payload.event.scope === "discussion.comment";
    const hasComment = "comment" in payload;

    let kind: string;
    const truncatedTitle = truncate(payload.discussion.title, 150);
    let embedTitle: string;
    if (!hasComment) {
      if (payload.discussion.status === "open") {
        if (payload.discussion.isPullRequest) {
          kind = "pullRequestOpened";
          embedTitle = `[${payload.repo.name}] Pull request reopened: #${payload.discussion.num} ${truncatedTitle}`;
        } else {
          kind = "discussionOpened";
          embedTitle = `[${payload.repo.name}] Discussion reopened: #${payload.discussion.num} ${truncatedTitle}`;
        }
      } else {
        if (payload.discussion.isPullRequest) {
          kind = "pullRequestClosed";
          embedTitle = `[${payload.repo.name}] Pull request closed: #${payload.discussion.num} ${truncatedTitle}`;
        } else {
          kind = "discussionClosed";
          embedTitle = `[${payload.repo.name}] Discussion closed: #${payload.discussion.num} ${truncatedTitle}`;
        }
      }
    } else if (isComment) {
      if (payload.discussion.isPullRequest) {
        kind = "pullRequestComment";
        embedTitle = `[${payload.repo.name}] New comment on pull request #${payload.discussion.num}: ${truncatedTitle}`;
      } else {
        kind = "discussionComment";
        embedTitle = `[${payload.repo.name}] New comment on discussion #${payload.discussion.num}: ${truncatedTitle}`;
      }
    } else {
      if (payload.discussion.isPullRequest) {
        kind = "pullRequestCreated";
        embedTitle = `[${payload.repo.name}] Pull request opened: #${payload.discussion.num} ${truncatedTitle}`;
      } else {
        kind = "discussionCreated";
        embedTitle = `[${payload.repo.name}] New discussion: #${payload.discussion.num} ${truncatedTitle}`;
      }
    }

    const discordContent: RESTPostAPIWebhookWithTokenJSONBody = {
      avatar_url: "https://cdn.brandfetch.io/idGqKHD5xE/w/242/h/242/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B",
      username: "Hugging Face",
      embeds: [
        {
          title: embedTitle,
          url: payload.discussion.url.web,
          color:
            kind in colors ? colors[kind as keyof typeof colors] : undefined,
          description:
            payload.comment && truncate(payload.comment.content, 500),
        },
      ],
    };

    await fetch(webhook, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(discordContent),
    });

    return c.body(null, 204);
  },
);

export default app;
