# Auth Setup

## Environment Variables

### Vercel Deployment

For Vercel, add these in **Settings → Environment Variables**:

| Name | Value |
|------|-------|
| `GROQ_API_KEY` | Your Groq API key from [console.groq.com](https://console.groq.com) |
| `SKIP_AUTH` | `1` (for demo without database) |
| `AUTH_SECRET` | Any random 32+ char string |

Use `GROQ_API_KEY` (not `NEXT_PUBLIC_GROQ_API_KEY`) on Vercel — it is more secure and loaded at runtime.

### Local Development

Add to `.env.local`:

```
NEXT_PUBLIC_GROQ_API_KEY=your_groq_api_key
AUTH_SECRET=your-random-32-char-secret-for-production
```

Generate a secure secret:
```bash
openssl rand -base64 32
```

### WeChat Login (optional)

To enable WeChat QR-code login for your website:

1. Register at [WeChat Open Platform](https://open.weixin.qq.com/)
2. Create and submit a **Website Application** for approval
3. Add your site domain to the authorized redirect URIs (must be HTTPS in production)
4. After approval, add to `.env.local`:

```
AUTH_WECHAT_APP_ID=your_appid
AUTH_WECHAT_APP_SECRET=your_appsecret
```

Callback URL (configure in WeChat Open Platform):

```
https://your-domain.com/api/auth/callback/wechat
```

If these env vars are not set, the WeChat login button is hidden.

## Database

SQLite is used for user storage (`prisma/dev.db`). Ensure `DATABASE_URL` in `.env` points to the SQLite file.

## First Run

1. Register a new account at `/register`
2. Sign in at `/login`
3. Access the main app at `/`

## Protected Routes

- `/` - Main workspace (requires login)
- `/login`, `/register` - Public (redirect to `/` if already logged in)
