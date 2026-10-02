# Task Board API Reference

Base development URL: `http://127.0.0.1:8000/api`

All API routes use a trailing slash. For example, use `/api/tasks/`, not `/api/tasks`.

## Authentication and request rules

1. Send a username and password to the token endpoint.
2. Store the returned access and refresh JWTs.
3. Send the access token on every protected request:

   ```http
   Authorization: Bearer <access-token>
   ```

4. When the access token expires, send the refresh token to the refresh endpoint for a new access token.

Use `application/json` for normal request bodies. Use `multipart/form-data` when uploading task images or comment attachments. The browser UI does this automatically through `FormData`.

## Roles and permissions

| Action | Standard user | Administrator (`is_staff: true`) |
| --- | --- | --- |
| Sign in and view profile | Yes | Yes |
| List, filter, and view tasks | Yes | Yes |
| Change a task status | Yes | Yes |
| Add comments, replies, and comment attachments | Yes | Yes |
| Create, edit, or delete tasks | No | Yes |
| Upload task images | No | Yes |
| Reorder shared task priority | No | Yes |
| Export tasks to Excel or PDF | No | Yes |

Unauthenticated requests to protected endpoints return `401 Unauthorized`. A signed-in user without the required role receives `403 Forbidden`.

## Data types used in this document

| Type | Meaning |
| --- | --- |
| `integer` | Whole-number ID. |
| `string` | Text value. |
| `boolean` | `true` or `false`. |
| `date` | ISO date string: `YYYY-MM-DD`. |
| `datetime` | ISO 8601 timestamp string with timezone. |
| `file` | Browser-uploaded file in multipart form data. |
| `enum` | String restricted to stated choices. |

## Shared response objects

### User summary

```json
{
  "id": 1,
  "username": "admin",
  "full_name": "Board Admin"
}
```

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | integer | User ID. |
| `username` | string | Login username. |
| `full_name` | string | First and last name, or username when no name is set. |

### Task attachment

```json
{
  "id": 8,
  "url": "http://127.0.0.1:8000/media/task_attachments/2026/10/design.png",
  "uploaded_at": "2026-10-02T08:00:00Z",
  "uploaded_by": { "id": 1, "username": "admin", "full_name": "Board Admin" }
}
```

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | integer | Attachment ID. |
| `url` | string or `null` | Cloudinary URL or local media URL. |
| `uploaded_at` | datetime | Upload time. |
| `uploaded_by` | User summary | User who uploaded the image. |

### Comment attachment

```json
{
  "id": 3,
  "url": "http://127.0.0.1:8000/media/comment_attachments/2026/10/notes.pdf",
  "filename": "notes.pdf",
  "uploaded_at": "2026-10-02T08:00:00Z"
}
```

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | integer | Attachment ID. |
| `url` | string or `null` | Cloudinary or local-media URL. |
| `filename` | string | Original filename, or `attachment` when unknown. |
| `uploaded_at` | datetime | Upload time. |

### Comment

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | integer | Comment ID. |
| `body` | string | Comment text. |
| `parent` | integer or `null` | Parent comment ID; `null` means a top-level comment. |
| `author` | User summary | Author of the comment. |
| `attachments` | array of Comment attachment | Attached images and PDFs. |
| `replies` | array of Comment | Nested reply comments. |
| `created_at` | datetime | Creation timestamp. |
| `updated_at` | datetime | Last update timestamp. |

### Task list item

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | integer | Task ID. |
| `code` | string or `null` | Unique human-readable task code. |
| `name` | string | Task title, maximum 180 characters. |
| `description` | string | Task description. |
| `due_date` | date or `null` | Optional due date. |
| `priority` | enum | `low`, `medium`, or `high`. |
| `status` | enum | `pending`, `in_progress`, or `completed`. |
| `priority_position` | integer | Shared vertical ordering value. Read-only to normal task writes. |
| `created_by` | User summary | Creator. |
| `updated_by` | User summary or `null` | Latest editor. |
| `attachments` | array of Task attachment | Task images. |
| `created_at` | datetime | Creation time. |
| `updated_at` | datetime | Latest update time. |
| `comment_count` | integer | Present on the task-list response only. |

### Task detail additions

`GET /tasks/{id}/` returns all task-list fields except `comment_count`, plus:

| Field | Type | Meaning |
| --- | --- | --- |
| `comments` | array of Comment | Top-level comments; each includes nested replies. |
| `activities` | array of activity | Up to 50 newest audit events. |

An activity object contains `id` (integer), `action` (`created`, `updated`, `status_changed`, `reordered`, or `commented`), `detail` (string), `actor` (User summary), and `created_at` (datetime).

## Authentication APIs

### `POST /api/auth/token/` — sign in

No token required. Send JSON:

```json
{
  "username": "admin",
  "password": "Admin@12345"
}
```

| Request field | Type | Required | Use |
| --- | --- | --- | --- |
| `username` | string | Yes | Django username. |
| `password` | string | Yes | Account password. |

Success response (`200 OK`):

```json
{
  "refresh": "<jwt-refresh-token>",
  "access": "<jwt-access-token>"
}
```

The access token lasts 30 minutes; the refresh token lasts 7 days.

### `POST /api/auth/token/refresh/` — refresh sign-in

No access token is required. Send JSON:

```json
{ "refresh": "<jwt-refresh-token>" }
```

| Request field | Type | Required | Use |
| --- | --- | --- | --- |
| `refresh` | string | Yes | Valid refresh JWT. |

Success response (`200 OK`) returns a new `access` string and, because token rotation is enabled, a new `refresh` string.

### `GET /api/auth/me/` — current signed-in user

Requires a bearer token. Response (`200 OK`):

```json
{
  "id": 1,
  "username": "admin",
  "email": "admin@example.com",
  "full_name": "Board Admin",
  "is_staff": true
}
```

| Field | Type | Use |
| --- | --- | --- |
| `id` | integer | Current user ID. |
| `username` | string | Current login name. |
| `email` | string | Current user email. |
| `full_name` | string | Display name. |
| `is_staff` | boolean | Determines administrator UI/actions. |

## Task APIs

### `GET /api/tasks/` — list and filter tasks

Requires a bearer token. Response is paginated:

```json
{
  "count": 24,
  "next": "http://127.0.0.1:8000/api/tasks/?page=2",
  "previous": null,
  "results": ["Task list item objects"]
}
```

| Query parameter | Type | Allowed values / use |
| --- | --- | --- |
| `page` | integer | Page number; page size is 20. |
| `search` | string | Case-insensitive partial match against task `name` or `code`. |
| `status` | string | One or more comma-separated statuses, e.g. `pending,in_progress`. |
| `priority` | string | One or more comma-separated priorities, e.g. `high,medium`. |
| `due_date_order` | enum | `asc` for earliest first or `desc` for latest first. Omit for priority order. |

### `POST /api/tasks/` — create a task

Administrator only. Send JSON when no images are needed, or `multipart/form-data` for images. `new_attachments` may occur more than once in a multipart request.

| Request field | Type | Required | Use |
| --- | --- | --- | --- |
| `code` | string or `null` | No | Optional unique code, maximum 32 characters. Omit it to auto-generate a `TSK-####` code. |
| `name` | string | Yes | Task title, maximum 180 characters. |
| `description` | string | No | Task details; blank is allowed. |
| `due_date` | date or `null` | No | Optional `YYYY-MM-DD` date. |
| `priority` | enum | No | `low`, `medium`, or `high`; defaults to `medium`. |
| `status` | enum | No | `pending`, `in_progress`, or `completed`; defaults to `pending`. |
| `new_attachments` | array of image file | No | JPG, JPEG, PNG, GIF, or WebP files. Use repeated multipart fields. |

The server sets `created_by`, `updated_by`, timestamps, and `priority_position`. Success returns `201 Created` with a task-list item and creates a `created` activity.

### `GET /api/tasks/{id}/` — read one task

Requires a bearer token. `{id}` is an integer task ID. Returns `200 OK` with a task-detail object, including comments and up to 50 recent activity items. A missing task returns `404 Not Found`.

### `PUT /api/tasks/{id}/` or `PATCH /api/tasks/{id}/` — edit a task

Administrator only. The editable request fields and types are the same as task creation. Use `PATCH` for only the values that changed; use `multipart/form-data` when adding images. The server sets `updated_by` to the signed-in administrator, creates an `updated` activity, and returns `200 OK` with a task-list item.

### `DELETE /api/tasks/{id}/` — delete a task

Administrator only. No request body. Returns `204 No Content` on success. The task's comments, attachments, and task activity are deleted with the task. Cloudinary cleanup is attempted when remote attachment rows are removed.

### `PATCH /api/tasks/{id}/status/` — move a task between columns

Any signed-in user can use this endpoint. Send JSON:

```json
{ "status": "in_progress" }
```

| Request field | Type | Required | Use |
| --- | --- | --- | --- |
| `status` | enum | Yes | `pending`, `in_progress`, or `completed`. |

Returns `200 OK` with a task-list item. If the status changed, it updates `updated_by` and creates a `status_changed` activity. An invalid status returns `400 Bad Request`.

### `POST /api/tasks/reorder/` — save vertical priority order

Administrator only. Send JSON:

```json
{ "ordered_task_ids": [12, 5, 19] }
```

| Request field | Type | Required | Use |
| --- | --- | --- | --- |
| `ordered_task_ids` | non-empty array of integer | Yes | Each ID must be unique and must refer to an existing task. The order becomes the selected tasks' shared priority order. |

Success response (`200 OK`):

```json
{ "detail": "Priority order saved." }
```

The action is transaction-safe and creates a `reordered` activity row for each selected task.

### `POST /api/tasks/{id}/comments/` — add a comment or reply

Any signed-in user can use this endpoint. Send `multipart/form-data`; plain form fields also work when there are no files.

| Request field | Type | Required | Use |
| --- | --- | --- | --- |
| `body` | string | Yes | Comment text; maximum 5,000 characters. |
| `parent_id` | integer or `null` | No | Parent comment ID when creating a reply. It must belong to this task. |
| `attachments` | array of file | No | Repeated image/PDF file fields. Each file must be JPG, JPEG, PNG, GIF, WebP, or PDF and no larger than 10 MB. |

Success returns `201 Created` with the new Comment object and records a `commented` activity. A parent comment from a different task returns `400 Bad Request`. A Cloudinary upload failure returns `502 Bad Gateway` and does not keep the new comment.

### `GET /api/tasks/export/?format=xlsx` or `?format=pdf` — export filtered tasks

Administrator only. `format` may be `xlsx` or `pdf`; it defaults to `xlsx` when omitted. The endpoint accepts the same `search`, `status`, `priority`, and `due_date_order` query parameters as the task list.

| Format | Response content type | Download file |
| --- | --- | --- |
| `xlsx` | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | `tasks.xlsx` |
| `pdf` | `application/pdf` | `tasks.pdf` |

The backend supports export, but the current UI export buttons are commented out, so the browser does not currently expose this feature.

## Other server routes

| Route | Use |
| --- | --- |
| `/admin/` | Django administrator site; authentication is session-based, not JWT-based. |
| `/media/<path>` | Serves local uploaded files only while `DJANGO_DEBUG=True`. Cloudinary URLs are served by Cloudinary instead. |

## Typical UI request sequence

```text
POST /auth/token/  → receive access + refresh tokens
GET  /auth/me/     → get role and display name
GET  /tasks/       → load board cards
GET  /tasks/{id}/  → open task drawer with comments/history
PATCH /tasks/{id}/status/ or POST /tasks/reorder/ → drag a card
POST /tasks/{id}/comments/ → submit discussion comment
```

For the corresponding screen and state flow, see `UI_FLOW.md`.
