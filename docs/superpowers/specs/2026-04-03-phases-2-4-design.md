# DayPlanner — Phases 2–4 Design Spec

**Date:** 2026-04-03  
**Status:** Approved  
**Scope:** Complete Phase 2 (Auth, Security, Performance), Phase 3 (UX Polish & Scheduling Intelligence), Phase 4 (Analytics, PWA & Power Features)  
**Baseline:** Phase 1 complete — 147 tests passing, Zod validation, toast feedback, Prisma transactions, full test suite.

---

## Phase 2: Auth, Security & Performance

### 2.1 Critical Auth Fixes

**Problem:** `page.tsx` still passes `userId: "default-user"` in the request body to `/api/rollover`, `/api/recurring-tasks/generate`, `/api/schedule`, and `handleAddTask`. These APIs already read userId from the JWT session — the body field is ignored but misleading dead code. Additionally, login/signup pages have no error feedback or loading states, and the header has no logout or user display.

**Changes:**
- Remove all `userId: "default-user"` from `page.tsx` fetch calls
- Login page: add error state, loading spinner, display auth error message from NextAuth (`?error=` query param)
- Signup page: add loading state, error handling, redirect to login on success
- Header: add user avatar (initials fallback), display name, logout button using `signOut()` from `next-auth/react`
- `validations.ts`: remove `userId` fields from all schemas (it should never come from the request body)

### 2.2 Ownership Validation

**Problem:** All `[id]`-based API routes (tasks, subtasks, recurring-blocks, recurring-tasks, timeblocks) do not verify the resource belongs to the requesting user. Any authenticated user can PATCH/DELETE another user's data by guessing a CUID.

**Changes:** Every PATCH/DELETE on an ID-based route must:
1. Fetch the resource by ID
2. Compare `resource.userId` (or via join) to `session.user.id`
3. Return `403 Forbidden` if mismatch
4. Return `404 Not Found` if resource doesn't exist (avoids leaking existence)

Affected routes: `tasks/[id]`, `subtasks/[id]`, `recurring-blocks/[id]`, `recurring-tasks/[id]`, `timeblocks/[id]/complete`.

### 2.3 Security Hardening

**Rate limiting:** Apply a sliding-window rate limiter in API middleware. Use `@upstash/ratelimit` with Upstash Redis, or fall back to a simple in-memory Map-based limiter (suitable for single-instance deployments). Limits: 60 req/min per user on standard endpoints, 5 req/min on auth endpoints (`/api/signup`, `/api/auth`).

**Per-user override phrase:** Add `overridePhrase String @default("OVERRIDE")` to the `User` model. On signup, generate a random 4-word phrase (e.g. "DELTA-STORM-9-ECHO") and store it. The override API validates against `user.overridePhrase` instead of a hardcoded constant.

**Input sanitization:** Strip HTML tags from `title`, `notes`, and `name` fields before persisting. Use a lightweight regex strip (`/<[^>]*>/g`) — no external dependency needed for this use case.

**Request size limits:** Set `bodySizeLimit: '100kb'` in `next.config.ts` for all API routes.

**HTTPS enforcement:** Add `Strict-Transport-Security` header in Next.js config headers.

### 2.4 React Query Integration

Replace the monolithic `fetchData()` in `page.tsx` with focused React Query hooks.

**Setup:**
- Install `@tanstack/react-query` and `@tanstack/react-query-devtools`
- Add `QueryClientProvider` wrapper in `layout.tsx`

**Query hooks** in `src/hooks/`:
- `useTasks(status?)` — fetches `/api/tasks?status=BACKLOG`, staleTime 30s
- `useTimeBlocks()` — fetches `/api/timeblocks`, staleTime 30s
- `useRecurringBlocks()` — fetches `/api/recurring-blocks`, staleTime 5min
- `useSettings()` — fetches `/api/settings`, staleTime 5min
- `useStreak()` — fetches `/api/streak`, staleTime 1min
- `useLockStatus()` — fetches `/api/lock`, staleTime 1min

**Mutation hooks** in `src/hooks/mutations.ts`:
- `useCreateTask()` — POST `/api/tasks`, invalidates `tasks`
- `useDeleteTask()` — DELETE `/api/tasks/[id]`, optimistic removal, invalidates `tasks`
- `useSchedule()` — POST `/api/schedule`, invalidates `tasks` + `timeblocks`
- `useCompleteBlock()` — PATCH `/api/timeblocks/[id]/complete`, optimistic toggle, invalidates `timeblocks` + `streak`
- `useRollover()` — POST `/api/rollover`, invalidates `tasks` + `timeblocks`
- `useAssignTask()` — POST `/api/timeblocks/assign`, invalidates `tasks` + `timeblocks`

`page.tsx` removes `fetchData`, `useEffect` on mount triggers `useRollover` + recurring task generation once, all state derives from query hooks.

### 2.5 Optimistic UI

- **Task deletion:** Immediately remove task from the cache before the DELETE completes. On error, roll back and show error toast.
- **Block completion:** Immediately mark block as completed in cache. On error, roll back.
- **Subtask completion:** Immediately toggle `completed` in the task's subtasks array. On error, roll back.

Each mutation hook includes `onMutate` (optimistic update), `onError` (rollback), `onSettled` (invalidate to sync with server).

### 2.6 Component Performance

- `React.memo` on `TaskCard` and time block render components to prevent re-renders when unrelated top-level state changes
- `useMemo` for filtered/sorted task lists in `BacklogSidebar` (search + filter computation)
- Debounce search input in `BacklogSidebar` to 300ms using a custom `useDebounce` hook
- Lazy-load all modal components with `React.lazy` + `Suspense` — none are needed on initial render
- Focus Mode timer: move the countdown display to a `ref`-based interval that updates the DOM directly, avoiding a full React re-render every second

### Phase 2 Completion Criteria

- [ ] No `userId: "default-user"` anywhere in `page.tsx`
- [ ] Login/signup show errors and loading states
- [ ] Header shows user name, avatar, and logout button
- [ ] All `[id]` routes return 403 when userId doesn't match
- [ ] Rate limiting active on all API routes
- [ ] Override phrase is per-user, generated on signup
- [ ] HTML stripped from free-text fields
- [ ] All data fetching uses React Query hooks
- [ ] Task deletion and block completion are optimistically updated
- [ ] Modals lazy-load, search is debounced

---

## Phase 3: UX Polish & Scheduling Intelligence

### 3.1 Keyboard Shortcuts

Install `react-hotkeys-hook`. Register shortcuts at the top level of `page.tsx`:

| Key | Action |
|-----|--------|
| `N` | Open Add Task modal |
| `S` | Open Settings modal |
| `P` | Trigger Plan My Week |
| `R` | Open Review modal |
| `Escape` | Close any open modal |
| `1` | Switch to Daily view |
| `2` | Switch to Weekly view |
| `3` | Switch to Monthly view |
| `←` | Navigate previous period |
| `→` | Navigate next period |
| `T` | Jump to today |

Disable shortcuts when a modal is open (except `Escape`). Add a `?` key that opens a keyboard shortcut help overlay.

### 3.2 Undo Support

Create `src/lib/undo-stack.ts` — a simple array-based undo stack with max depth 10.

Each undoable action stores: `{ type, payload, inverseApiCall }`.

Support for:
- Task deletion: inverse = re-create task via POST
- Block completion: inverse = PATCH block back to incomplete
- Schedule clear: not undoable (too complex), just warn before clearing

Integrate with sonner: after a destructive action, toast includes an "Undo" action button. The toast's `onDismiss` clears the undo entry. Auto-expiry at 5 seconds.

### 3.3 Dark Mode

- Add `darkMode: 'class'` to Tailwind config
- `ThemeProvider` context in `layout.tsx`: reads from `localStorage`, defaults to system preference via `prefers-color-scheme` media query
- Toggle button in header (sun/moon icon)
- Persists to `localStorage` key `dayplanner-theme` and syncs to User settings on change
- Add `dark:` variants to all components: backgrounds, borders, text colors, shadows, modal overlays
- WCAG AA contrast ratios enforced (minimum 4.5:1 for text)

### 3.4 Backlog Improvements

In `BacklogSidebar`:
- **Priority filter** pill buttons: All / High / Medium / Low
- **Deadline filter** pills: All / Overdue / Today / This Week / No Deadline
- **Sort dropdown:** Priority, Deadline, Duration, Date Created
- **Bulk select:** checkbox appears on hover per task; "Select all" toggle; bulk delete button appears when items are selected
- Task count badge per priority in sidebar header

All filter/sort state is local to the sidebar component (no server calls needed).

### 3.5 Overdue Task Alerts

- Tasks with `deadline < today && status !== COMPLETED` get a red left border + "Overdue" badge in BacklogSidebar
- Overdue count shown in sidebar header: `3 overdue` in red text
- In WeeklyView/DailyView, time blocks for overdue tasks get a subtle red tint

### 3.6 Energy-Level Scheduling

**Schema changes:**
- Add `peakHoursStart String @default("09:00")` and `peakHoursEnd String @default("12:00")` to `User` model
- Add peak hours time pickers to `SettingsModal`

**Scheduler changes in `src/lib/scheduler.ts`:**
- After calculating free slots, split them into "peak" (within peakHours) and "off-peak"
- Assign priority-1 tasks to peak slots first, then priority-2, then priority-3
- Fill remaining peak slots with priority-2 if priority-1 exhausted

### 3.7 Smart Rescheduling & Breaks

**Smart rescheduling:**
- "Reschedule rest of day" button in `DailyView` header — calls `/api/schedule` with `{ rescheduleFromNow: true }` parameter
- Scheduler respects `rescheduleFromNow` by only touching unlocked blocks after current time

**Break scheduling:**
- Add `breakDuration Int @default(10)` and `breakFrequency Int @default(90)` to `User` model (minutes)
- Scheduler inserts break blocks between task blocks when the task block preceding the gap is >= breakFrequency minutes
- Breaks rendered as distinct visual blocks (gray, no task association, not clickable for focus mode)
- Individual breaks can be dismissed (DELETE `/api/timeblocks/[id]` where block has no taskId)

### Phase 3 Completion Criteria

- [ ] All keyboard shortcuts functional, `?` shows shortcut help
- [ ] Undo works for task deletion and block completion with toast button
- [ ] Dark mode toggleable, persisted, WCAG AA compliant
- [ ] Backlog has priority filter, deadline filter, sort, and bulk delete
- [ ] Overdue tasks highlighted in backlog and calendar
- [ ] Scheduler respects peak hours for high-priority tasks
- [ ] "Reschedule rest of day" button in Daily view
- [ ] Breaks auto-inserted between blocks per user preference

---

## Phase 4: Analytics, PWA & Power Features

### 4.1 Analytics Page

New route: `src/app/analytics/page.tsx`

**Data sources:** All from existing `TimeBlock` model — no new schema except `actualDuration`.

**Sections:**
- **Summary cards:** Total tasks completed (all time), current streak, average daily completion rate (last 30 days), total focused hours
- **7-day completion trend:** Bar chart (completion rate % per day for last 7 days)
- **Monthly heatmap:** GitHub-style grid, each cell = completion rate for that day. Color scale: gray (no data) → light violet (low) → deep violet (high)
- **Insights:** Most productive day of week, most productive time of day (based on completed block start times)

Use `recharts` for bar chart and a custom CSS grid for the heatmap (no extra charting lib needed for the heatmap).

### 4.2 Time Tracking

**Schema:** Add `actualDuration Int?` to `TimeBlock` model.

**Focus Mode:** Record `focusStartTime` in a ref when Focus Mode opens. On "Complete", compute `actualDuration = Date.now() - focusStartTime` in minutes. Include in the PATCH to `/api/timeblocks/[id]/complete`.

**Display:** In the analytics page, show "Estimated vs Actual" comparison: average estimated duration vs average actual duration per priority level.

### 4.3 Task Templates

**Schema:** New `TaskTemplate` model:
```
model TaskTemplate {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(...)
  title     String
  duration  Int
  priority  Int      @default(2)
  notes     String?
  subtasks  Json     // array of { title: string }
  createdAt DateTime @default(now())
}
```

**API:** `/api/templates` (GET, POST), `/api/templates/[id]` (DELETE)

**UI:**
- "Save as Template" button on task cards (overflow menu)
- Template picker tab in `AddTaskModal` — lists saved templates, click to pre-fill the form
- Templates listed/deletable in a `TemplatesModal`

### 4.4 Weekly Review Enhancement

**Schema:** New `WeeklyReview` model:
```
model WeeklyReview {
  id           String   @id @default(cuid())
  userId       String
  user         User     @relation(...)
  weekStart    DateTime
  wentWell     String?
  toImprove    String?
  completedCount Int
  rolledOverCount Int
  createdAt    DateTime @default(now())
}
```

**Enhanced `ReviewModal`:**
- After marking blocks complete/incomplete, show a summary: X completed, Y rolled over
- Week-over-week comparison: "Last week you completed 12/15 blocks (80%)"
- Text fields: "What went well?" and "What to improve?"
- Save to `WeeklyReview` via PATCH `/api/review`

### 4.5 Pomodoro Focus Mode

In `FocusMode` component:
- Toggle: "Standard" (full task duration) vs "Pomodoro" (25/5 cycles)
- In Pomodoro mode: 25-min work timer → auto-switch to 5-min break → resume work
- Cycle counter: "Pomodoro 2 of 4"
- "I got distracted" button — increments a `distractionsCount` ref, shown in session summary
- On task complete: show session summary (time spent, # pomodoros, distractions)

### 4.6 PWA Setup

- `public/manifest.json`: app name, short name, theme color `#7c3aed`, background color `#fafaf9`, display `standalone`, icons at 192×192 and 512×512
- Generate icons from app logo (violet gradient circle with "D")
- Add `<link rel="manifest">` in `layout.tsx`
- Install `next-pwa`, configure in `next.config.ts` with `runtimeCaching` for API routes (network-first) and static assets (cache-first)
- Offline fallback page at `public/offline.html`
- "Add to Home Screen" install prompt banner (shown once, dismissible, stored in localStorage)

### Phase 4 Completion Criteria

- [ ] `/analytics` shows completion rate, trend chart, heatmap, and insights
- [ ] Focus Mode records and saves actual duration
- [ ] Task templates saveable and reusable from AddTaskModal
- [ ] Weekly Review saves notes and shows week-over-week comparison
- [ ] Focus Mode supports Pomodoro mode with cycle counter
- [ ] App installable as PWA on mobile and desktop
- [ ] App shows offline fallback when connection lost

---

## Security Audit Items (post-phase)

After all phases, run a focused audit on:

1. **IDOR completeness** — confirm every data-modifying route checks resource ownership
2. **JWT secret strength** — `AUTH_SECRET` must be ≥ 32 random bytes in production env
3. **Session fixation** — NextAuth rotates session tokens on login by default (verify)
4. **Dependency audit** — `npm audit` and pin any high/critical CVEs
5. **Content Security Policy** — add CSP headers in `next.config.ts` to prevent XSS via injected scripts
6. **Sensitive data in logs** — ensure no passwords, tokens, or PII appear in `console.error` calls

---

## Deferred (out of scope)

- **Google Calendar sync** — requires OAuth scope management, event polling/webhooks, conflict UI. Standalone project.
- **Task dependencies** — self-referential graph adds scheduling complexity. Standalone feature.
- **Push notifications** — requires service worker + VAPID keys + backend push endpoint. Standalone.
- **Multi-device WebSocket sync** — disproportionate infra complexity. Defer to post-MVP.
- **NLP task input** — requires Claude API integration. Separate feature sprint.

---

## Implementation Order

1. Phase 2: Critical auth fixes → ownership validation → security hardening → React Query → optimistic UI → component performance
2. Phase 3: Keyboard shortcuts → dark mode → undo → backlog improvements → overdue alerts → energy scheduling → smart reschedule + breaks
3. Phase 4: Analytics → time tracking → task templates → weekly review → Pomodoro → PWA
4. Security audit pass
