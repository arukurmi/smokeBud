# smokeBud — Design Spec

**Date:** 2026-07-11
**Status:** Approved by user (brainstorming session)

## Purpose

A "dopamine" website for lonely or stressed people to take a short break by
"smoking with someone." A realistic on-screen companion lights a cigarette and
smokes alongside the visitor for the length of one cigarette (~5–6 minutes).
The visitor watches and breathes — no interaction required during the session.
The goal is stress relief, a moment of companionship, and a small ritual with a
beginning and an end.

## Core Decisions (from brainstorming)

| Decision | Choice |
|---|---|
| Companion | Simulated (AI-generated video of a person smoking) |
| Visitor interaction | Watch & breathe only — fully ambient |
| Visuals | AI-generated video clips, produced by the user outside this project |
| Session shape | Ritual arc (~5–6 min) with a choice of 2–3 companions/scenes |
| Companion voice | Silent; occasional subtitle one-liners (text only) |
| Presence | Real live counter of people currently on a break |
| Architecture | Full app: accounts, streaks, history, favorites, mood log |
| Auth | Google OAuth (Auth.js) |

## The Experience

1. **Landing.** Dark, quiet page. "Take a break." Google sign-in on first
   visit only; returning users go straight in.
2. **Companion picker.** 2–3 companions/scenes shown as poster cards
   (e.g., balcony at night, rainy window, rooftop). The user's favorite
   (most recently used) companion is pre-selected/auto-resumed.
3. **The ritual (~5–6 min).**
   - Light-up: lighter flick, ember flare (dedicated intro clip).
   - Smoking loop: 2–3 loopable clips crossfaded and shuffled so the video
     never reads as a repeating loop.
   - Layered ambient audio: rain, distant traffic, night sounds, soft exhales.
   - Subtitle one-liners fade in roughly once a minute
     ("long day, huh", "the rain's nice tonight"). Text only, no voice.
   - A faint presence line: "N people are on a smoke break right now"
     (real count from the backend).
   - Subtle progress: the session visibly winds toward its end
     (e.g., cigarette burning down / time remaining treatment).
4. **Wind-down.** Dedicated closing clip; gentle message
   ("see you next break").
5. **Mood note (optional).** One-line prompt: "how do you feel?" —
   saved privately to the user's history. Skippable in one tap.

## Video Asset Contract

The user produces AI-generated clips externally. Each companion is a folder:

```
public/companions/<name>/
  manifest.json
  poster.jpg
  lightup.mp4        # one intro clip
  loop-1.mp4         # 2–3 loopable smoking clips
  loop-2.mp4
  winddown.mp4       # one closing clip
```

`manifest.json` declares display name, scene description, clip filenames, and
per-clip durations. The player consumes only the manifest — it has no
knowledge of specific companions.

**Placeholder fallback:** until real clips exist (and whenever a clip fails to
load), a built-in cinematic canvas scene — silhouetted figure, particle smoke,
glowing ember — implements the same clip interface (light-up / loop /
wind-down phases). The entire app is buildable and testable before any video
is generated; dropping clips into the folder requires zero code changes.

## Stack

- **Next.js** (App Router, TypeScript) — single full-stack app.
- **Auth.js** with Google provider. User supplies Google Cloud OAuth client
  ID/secret via env vars (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`).
- **Prisma** ORM; **SQLite** in development, Postgres when deployed.
- **Vitest** for unit tests.
- Deployable to Vercel (or any Node host).

## Data Model

- **User** — id, Google identity fields (via Auth.js adapter).
- **BreakSession** — id, userId, companionId, startedAt, completedAt
  (null if abandoned), moodNote (nullable, private).
- **Preference** — userId, favoriteCompanionId (auto-set to the most
  recently completed session's companion).

## Presence Counter

- The player POSTs a heartbeat every 30 s while a session is active.
- The counter = number of distinct active sessions with a heartbeat in the
  last 60 s.
- The client polls the count every 20 s.
- Heartbeats stored in a small table (or in-memory map behind an interface);
  no websockets.
- If the network fails, the counter hides rather than showing a stale or
  fake number.

## Pages

- **`/`** — landing, companion picker, and the break player (single flow).
- **`/history`** — streak summary ("12 breaks this week"), calendar
  heat-strip of past breaks, private mood-note timeline.

## Error Handling

- Missing/failed video clip → canvas placeholder scene takes over that phase.
- Offline / API failure → presence counter hidden; session still plays;
  session completion is retried or dropped silently (never blocks the ritual).
- Unauthenticated API calls → 401; UI redirects to sign-in.

## Testing

- Vitest unit tests for: streak/week aggregation logic, presence-window math
  (active = heartbeat within 60 s), clip sequencing (light-up → shuffled
  loops → wind-down, no immediate repeat of the same loop clip).
- Player fallback behavior covered by forcing a missing-clip manifest in tests.
- **Playwright end-to-end tests** covering the full flows: landing →
  companion pick → session plays → wind-down → mood note saved; history page
  shows streak and notes; presence counter appears and hides on API failure.
  Auth is stubbed in e2e (test session) so runs don't hit Google.

## Delivery Process

- smokeBud lives in its own git repository, pushed to github.com/arukurmi.
- Work is split into the smallest phases that each leave the app functional;
  every phase (including tests and docs) is its own commit — target 20–25+
  commits for v1.

## Out of Scope (v1)

- Real-human matching or video chat.
- Voiced dialogue / lip sync.
- Public social features (shared notes, chat).
- Cross-companion unlocks, gamification beyond the streak view.
