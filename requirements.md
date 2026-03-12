# Product Requirements Document (PRD): Strict Timeblocking & Habit App

## 1. Overview
This application is a minimalist, strict timeblocking tool designed to enforce discipline and build consistency. It combines the visual simplicity and "antigravity" aesthetic of manual planners (like Tweek.so) with a powerful, opinionated auto-scheduling engine. The goal is to eliminate decision fatigue by automatically tetris-fitting tasks into available time slots and locking the schedule to prevent procrastination.

---

## 2. Functional Requirements
These are the specific behaviors, features, and functions the system must perform.

### 2.1 Task Management (The "Someday" Backlog)
* **Task Creation:** Users must be able to create tasks with the following attributes:
  * Title (required)
  * Estimated Duration in minutes (required)
  * Priority Level (High, Medium, Low)
  * Deadline (Date/Time)
  * Subtasks / Checklist items
  * Brief notes
* **Backlog Storage:** Unscheduled tasks must reside in a collapsible "Someday" or Backlog sidebar.
* **Manual Manipulation:** Users can manually drag and drop tasks from the backlog onto specific days in the weekly view.

### 2.2 Availability & Calendar Management
* **Working Hours:** Users must be able to define their global schedulable hours (e.g., 08:00 to 18:00).
* **Non-Negotiable Blocks:** Users must be able to set recurring fixed blocks (e.g., Sleep, Lunch, Gym).
* **External Sync (Phase 2):** The system must read events from Google Calendar / Apple Calendar and treat those times as "locked" unavailable blocks.

### 2.3 The Auto-Scheduling Engine
* **"Plan My Week" Trigger:** A single button that initiates the auto-scheduling algorithm.
* **Sorting Logic:** The engine must sort backlog tasks primarily by Deadline (closest first), then by Priority (highest first).
* **Allocation Logic:** The engine must find available time gaps (Schedulable Inventory) and assign tasks to those gaps.
* **Auto-Splitting:** If a task's duration (e.g., 120 mins) exceeds the available continuous time slot (e.g., 60 mins), the engine must split the task into multiple linked blocks (e.g., "Part 1" and "Part 2").
* **Buffer Insertion:** The engine must automatically insert a 5-10 minute buffer between scheduled task blocks to prevent burnout.

### 2.4 Habit Enforcement & Execution
* **"Read-Only Today" (Lock Mode):** At a user-defined time (e.g., 08:00 AM daily), the current day's schedule becomes locked. Drag-and-drop modifications for the current day are disabled to prevent procrastination.
* **Emergency Override:** Users can unlock the day, but it must require deliberate friction (e.g., typing a confirmation phrase) and will break their consistency streak.
* **Focus Mode:** Clicking an active timeblock hides the weekly view and displays only the current task, its subtasks, and a countdown timer.
* **Consistency Tracker:** The system must track and display a visual "Streak" (number of consecutive days the user completed their scheduled blocks without using the emergency override).
* **End-of-Day Review:** A daily prompt asking the user to mark scheduled blocks as completed or incomplete.

---

## 3. Non-Functional Requirements
These define system attributes such as performance, usability, and design constraints.

### 3.1 UI/UX Design ("Antigravity" Aesthetic)
* **Visual Style:** The interface must feel weightless and frictionless.
  * Avoid harsh, dark borders and rigid spreadsheet-like grids.
  * Use ample whitespace, soft rounded corners, and diffuse drop shadows.
  * Background colors should be off-white or light gray.
* **Color Coding:** Task blocks must use pastel colors mapped to priority (e.g., Soft Red = High, Soft Yellow = Medium, Soft Gray = Low) rather than complex UI tags.
* **Layout:** A horizontal 7-day weekly view (Monday-Sunday) optimized for desktop/tablet, with a responsive vertical stack for mobile.
* **Interactions:** Drag-and-drop operations must be smooth, featuring micro-interactions (e.g., blocks slightly enlarging when picked up).

### 3.2 Performance
* **Algorithm Speed:** The auto-scheduling engine must process and render a week's worth of tasks in under 2 seconds.
* **Load Time:** The initial application load time should be under 1.5 seconds on standard broadband connections.

### 3.3 Portability & Platform
* **Initial MVP:** Responsive Web Application (optimized for Chrome, Safari, Firefox).
* **Future Iteration:** Native mobile applications (iOS/Android) to support aggressive, system-level push notifications for task transitions.

### 3.4 Security & Privacy
* **Authentication:** Secure user login via email/password and OAuth (Google/Apple).
* **Data Privacy:** External calendar data must only be used to calculate free/busy times and should not be stored permanently in the application database.

### 3.5 Reliability
* **Offline Support:** The frontend should cache the daily schedule locally so the user can view their tasks and use Focus Mode even if they lose internet connection.