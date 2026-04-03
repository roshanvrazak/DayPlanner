# Design Spec: Frontend Auth Cleanup & UI Polish

## 1. Overview
Complete the Auth.js v5 integration by cleaning up all "default-user" hardcoding in the frontend and refining the authentication UI to match the "Antigravity" aesthetic.

## 2. Goals
- Remove all "default-user" references from the frontend.
- Implement a minimalist, session-aware header with a User Menu.
- Redesign Login and Signup pages to match the project's visual style.
- Securely pass authenticated session `userId` to all API calls.

## 3. Architecture & Data Flow

### 3.1 Components
- **`src/app/page.tsx`**: Updated to fetch session `userId` and provide it to all client-side API calls.
- **`UserMenu`**: A new component in the header (top-right) for account management and session status.
- **`src/lib/validations.ts`**: Updated Zod schemas to remove the `.default("default-user")` on `userId`.
- **`src/app/login/page.tsx` & `src/app/signup/page.tsx`**: Redesigned with a minimalist overlay style.

### 3.2 Data Flow
1. User logs in/signs up.
2. `Home` page (Server Component) fetches session via `auth()`.
3. Session is passed to client-side components and hooks.
4. All client-side API requests (Tasks, Schedule, etc.) use the session's `userId`.
5. User Menu provides session status and "Sign Out" functionality.

## 4. Technical Implementation

### 4.1 UI Refinements
- **Informative User Menu (Dropdown)**:
    - User name & email.
    - Today's completion percentage (visual progress bar).
    - Current streak (visual indicator).
    - "Sign Out" button.
- **Minimalist Overlay Style (Login/Signup)**:
    - Soft, almost borderless forms.
    - Large typography and ample whitespace.
    - Subtle background animations or gradients.

### 4.2 Cleanup Steps
- **`src/app/page.tsx`**: Update all `fetch` calls and state initializations to use the session's `userId`.
- **`src/components/BacklogSidebar.tsx`**: Pass `userId` to the "Plan My Week" trigger.
- **`src/components/SettingsModal.tsx`**: Pass `userId` to the settings fetch/patch.
- **`src/lib/validations.ts`**: Remove all `.default("default-user")` on `userId` fields in schemas.

### 4.3 Route Protection
- Ensure `middleware.ts` is correctly protecting all routes and API endpoints.
- Redirect authenticated users away from `/login` and `/signup`.

## 5. Security & Validation
- **Session Security**: Use `auth()` for server-side session checks and `useSession()` for client-side state.
- **Input Validation**: Use Zod schemas for all forms (Login, Signup, Settings).

## 6. Testing Strategy
- **Unit Tests**:
    - Mock session state for `UserMenu` and `Home` page.
    - Test that `userId` is correctly passed to API calls.
- **Integration Tests**:
    - Verify that Logout clears the session and redirects to `/login`.
    - Test that unauthenticated users are redirected to `/login`.
- **Manual Verification**:
    - Successful Login -> Redirect to `/`.
    - Logout -> Redirect to `/login`.
    - User Menu correctly shows name, email, streak, and progress.
