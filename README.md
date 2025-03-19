# hf-webhook-discord

Hugging FaceのDiscussionの通知をDiscordに投げるWebhook。

## Secret

- `DISCORD_WEBHOOK`：DiscordのWebhook URL
- `WEBHOOK_SECRET`：Webhookのシークレット（Hugging FaceのWebhookと一致させること）

## ローカルでの実行

```bash
pnpm run dev
```

## デプロイ

Cloudflare Workersにデプロイします。

```bash
pnpm run deploy
```

## ライセンス

MIT Licenseで提供されています。
