# Vyapar AI Steering Rules

- Use Next.js App Router with server components only for static content.
- All API routes must be in `app/api/` and use `export async function POST`.
- Bedrock calls: use AWS SDK for JavaScript v3, with credentials from environment variables.
- CSV parsing: PapaParse in browser or in API route.
- Language detection: store user preference in localStorage.
- Voice: Web Speech API for synthesis (Hindi voice available).
- No persistent storage — all data stays in memory during session.
- Error messages: show in user’s selected language, with friendly tone.