# Task Board UI Flow

The UI is a React + Vite single-page application in `ui/`. It is named **Flowboard** in the interface and connects to the Django API through `VITE_API_URL`.

## Browser route

The UI has no React Router or separate client-side pages. Vite serves one route:

| Browser URL | Component behavior |
| --- | --- |
| `/` — normally `http://localhost:5173/` | Shows a loading screen while authentication is checked; then shows either the sign-in form or the task board. |

Task details, create/edit forms, comments, and activity history open as drawers or modal overlays on the same page. The backend API routes are documented separately in `API_REFERENCE.md`.

## Main application flow

```text
Browser opens /
        │
        ▼
AuthProvider reads localStorage key "flowboard.tokens"
        │
        ├─ no access token ───────► LoginForm
        │
        └─ access token ──────────► GET /api/auth/me/
                                      │
                  invalid/expired ───┤──► remove tokens → LoginForm
                                      │
                                      ▼
                                  AppShell + TaskBoard
                                      │
                                      ▼
                             GET /api/tasks/ with filters/page
```

## Authentication logic

### Sign in

`LoginForm` asks for a username and password. On submit it calls:

1. `POST /api/auth/token/` with `{ username, password }`.
2. Saves the returned JWT token pair in browser `localStorage` as `flowboard.tokens`.
3. `GET /api/auth/me/` to load the signed-in user, including `is_staff`.
4. Renders the task board after the user profile is loaded.

### Authenticated API calls

`ui/src/lib/api.js` creates one Axios client.

- The request interceptor reads `flowboard.tokens` and adds `Authorization: Bearer <access token>`.
- On a `401` response, it calls `/api/auth/token/refresh/` once, stores the new tokens, and retries the original request.
- If refresh fails, it clears local storage and the app returns to the sign-in form.
- Sign out simply removes `flowboard.tokens` and clears the user from React state; it does not call a backend sign-out endpoint.

## UI components and responsibilities

| File / component | Responsibility |
| --- | --- |
| `src/main.jsx` | Starts React and wraps the app in `AuthProvider`. |
| `src/App.jsx` | Chooses loading screen, `LoginForm`, or authenticated shell. |
| `src/context/AuthContext.jsx` | Owns user/loading state and sign-in/sign-out methods. |
| `src/lib/api.js` | Axios base URL, bearer-token attachment, and JWT refresh/retry behavior. |
| `src/components/auth/LoginForm.jsx` | Username/password form and sign-in errors. |
| `src/components/layout/AppShell.jsx` | Header, current-user role display, and sign-out control. |
| `src/components/board/TaskBoard.jsx` | Board state, filters, pagination, drag-and-drop, new-task modal, and task drawer. |
| `src/hooks/useTasks.js` | Fetches the paginated filtered task list and exposes a `refresh` function. |
| `src/components/board/BoardColumn.jsx` | One droppable status column. |
| `src/components/board/TaskCard.jsx` | A task card shown in a board column. |
| `src/components/tasks/TaskFilters.jsx` | Search, status, priority, due-date sorting, and clear filters. |
| `src/components/tasks/Pagination.jsx` | Switches task-list pages. |
| `src/components/tasks/TaskDrawer.jsx` | Reads a task's full detail; shows discussion, history, status control, admin edit/delete controls. |
| `src/components/tasks/TaskForm.jsx` | Administrator create/edit task form and image upload form. |
| `src/components/tasks/CommentThread.jsx` | Comments, replies, image/PDF uploads, and comment submission. |

## Task board loading, filtering, and pagination

`TaskBoard` starts with these filter values:

```js
{
  search: "",
  status: "",
  priority: "",
  due_date_order: ""
}
```

`useTasks` calls `GET /api/tasks/` with the non-empty filters and `page` number. The returned task list is split locally into three columns using its `status` value:

| Status API value | Board column label |
| --- | --- |
| `pending` | Pending |
| `in_progress` | In progress |
| `completed` | Completed |

Changing any filter resets the UI to page 1. The total count comes from the server's paginated `count` value.

## User actions and matching API calls

| UI action | Who can use it | API call | Result |
| --- | --- | --- | --- |
| Sign in | Anyone with an account | `POST /auth/token/`, then `GET /auth/me/` | Stores tokens and determines role. |
| Refresh board | Signed-in user | `GET /tasks/` | Reloads current filters/page. |
| Search or filter | Signed-in user | `GET /tasks/?search=...&status=...` | Server returns filtered cards. |
| Open a card | Signed-in user | `GET /tasks/{id}/` | Opens task drawer with attachments, comments, and history. |
| Change task status dropdown | Signed-in user | `PATCH /tasks/{id}/status/` | Moves the task to another status. |
| Drag card to another column | Signed-in user | `PATCH /tasks/{id}/status/` | Updates status; admins may then save an order. |
| Drag card within a column | Administrator | `POST /tasks/reorder/` | Saves shared vertical priority order. |
| Create task | Administrator | `POST /tasks/` | Sends task form and images as multipart data. |
| Edit task | Administrator | `PATCH /tasks/{id}/` | Sends changed form data and optional new images. |
| Delete task | Administrator | `DELETE /tasks/{id}/` | Removes card after a browser confirmation prompt. |
| Add comment/reply | Signed-in user | `POST /tasks/{id}/comments/` | Sends comment body, optional parent ID, and files. |

The client uses the API base URL automatically. For example, when `VITE_API_URL=http://localhost:8000/api`, a client call to `api.get('/tasks/')` becomes `GET http://localhost:8000/api/tasks/`.

## Drag-and-drop rules

- Every signed-in user can drag a card into a different status column; this sends the status endpoint.
- Only an administrator can drag a card up or down inside the same column.
- Priority reordering is disabled while due-date sorting is active because the server is showing a temporary date order rather than the shared priority order.
- When an administrator moves a card across columns while priority order is active, the UI sends the status change first, then sends the destination column IDs to the reorder endpoint.

## Task drawer flow

1. Clicking a task card sets `selectedTaskId`.
2. `TaskDrawer` calls `GET /api/tasks/{id}/`.
3. The drawer shows task description, due date, task images, a status selector, and two tabs.
4. **Discussion** displays top-level comments and nested replies. Submitting a comment calls the comments endpoint, then reloads the task detail.
5. **History** displays up to 50 audit events returned by the server.
6. Administrators also see **Edit** and **Delete** controls.

## Role-dependent UI

| UI feature | Standard user | Administrator |
| --- | --- | --- |
| Read/search/filter tasks | Visible | Visible |
| Move a card to another status | Visible | Visible |
| Add comments and replies | Visible | Visible |
| New task button | Hidden | Visible |
| Edit/delete task | Hidden | Visible |
| Reorder a column vertically | Disabled | Enabled when priority sort is active |
| Export controls | Hidden | Currently not displayed; code is commented out |

## Files and uploads

- The task form accepts image files: JPG, JPEG, PNG, GIF, and WebP.
- The comment form accepts those images plus PDF files.
- The UI makes client-side file choices, then the backend validates type and comment-file size (maximum 10 MB each).
- Task images are displayed as thumbnails; comment attachments are rendered as file links.
- Upload URLs come from local Django media storage or Cloudinary, depending on backend `.env` settings.

## Development start points

```powershell
# API terminal
cd 'C:\abhishek data\assignment\python'
.\.venv\Scripts\Activate.ps1
python manage.py runserver

# UI terminal
cd 'C:\abhishek data\assignment\ui'
npm run dev
```

Open the Vite URL printed by the UI terminal, normally `http://localhost:5173/`. The UI expects the API to run on `http://localhost:8000/api` unless `ui/.env` changes `VITE_API_URL`.
