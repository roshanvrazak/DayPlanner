# Design Spec: Auth.js v5 Integration with Email/Password

## 1. Overview
Implement a secure, multi-user authentication system using Auth.js (v5) for the DayPlanner application. This will replace the current "default-user" hardcoding and enable personalized task management, streaks, and schedules.

## 2. Goals
- Secure authentication for multiple users.
- Support for Email/Password (Credentials) login.
- Integration with existing Prisma database.
- Migration of existing "default-user" logic to session-based user identification.
- Route protection via Next.js Middleware.

## 3. Architecture & Data Flow

### 3.1 Components
- **auth.ts**: Central Auth.js configuration (Providers, Callbacks, Events).
- **middleware.ts**: Global route protection logic.
- **API Routes**: Updated to use `auth()` from `auth.ts` to get the current user session.
- **Pages**:
    - `/login`: UI for user sign-in.
    - `/signup`: UI for new user registration.
- **Prisma**: Updated schema to support Auth.js models and password storage.

### 3.2 Data Flow (Login)
1. User submits email/password to `/login`.
2. Client calls `signIn("credentials", { email, password })`.
3. Auth.js `authorize` callback:
    - Fetches user from database via Prisma.
    - Verifies password using `bcryptjs`.
    - Returns user object on success, null on failure.
4. Auth.js creates a secure, HTTP-only session cookie.
5. User is redirected to the home page (`/`).

## 4. Technical Implementation

### 4.1 Dependencies
- `next-auth@beta`
- `@auth/prisma-adapter`
- `bcryptjs`
- `@types/bcryptjs` (dev)

### 4.2 Database Changes (schema.prisma)
- Add `hashedPassword` to the `User` model.
- Add standard Auth.js models: `Account`, `Session`, `VerificationToken`.
- Ensure `email` on `User` is unique and required.

### 4.3 Middleware
- Protect `/` and `/api/*` (except auth routes).
- Redirect unauthenticated users to `/login`.
- Redirect authenticated users away from `/login` and `/signup`.

### 4.4 API Refactoring
- All existing API handlers (`/api/tasks`, `/api/schedule`, etc.) will be updated:
    ```typescript
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id;
    ```

## 5. Security & Validation
- **Password Hashing**: `bcryptjs` with a salt round of 12.
- **Input Validation**: Zod schemas for login and signup forms (email format, password minimum length).
- **Session Security**: JWT-based sessions with a 30-day expiration.

## 6. Testing Strategy
- **Unit Tests**:
    - Validation logic for signup/login schemas.
    - Password hashing and verification utilities.
- **Integration Tests**:
    - Mock session state for existing `WeeklyView` and `BacklogSidebar` tests.
    - Test that API routes return 401 when no session exists.
- **Manual Verification**:
    - Successful signup -> auto-login.
    - Logout -> restricted access.
    - Invalid credentials -> error message.

## 7. Future Considerations
- Adding Google/Apple OAuth providers (built-in support in Auth.js).
- Password reset flow (Magic Links or Email Reset).
- Account deletion and data export.
