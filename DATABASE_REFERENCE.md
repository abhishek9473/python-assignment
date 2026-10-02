# Task Board Database Reference

This document describes the PostgreSQL schema created by Django migrations for the Task Board. Column types below were checked against the local PostgreSQL database.

## How the application data connects

```text
auth_user
  ├─< tasks_task (created_by_id, updated_by_id)
  ├─< tasks_taskattachment (uploaded_by_id)
  ├─< tasks_comment (author_id)
  └─< tasks_taskactivity (actor_id)

tasks_task
  ├─< tasks_taskattachment
  ├─< tasks_comment ─< tasks_commentattachment
  └─< tasks_taskactivity

tasks_comment ─< tasks_comment (parent_id: replies)
```

`PK` means primary key. `FK` means foreign key. Timestamps are stored as `timestamp with time zone` because Django has time-zone support enabled.

## Application tables

### `auth_user` — user accounts

This is Django's built-in user table. A user with `is_staff = true` is an administrator in this application. Regular users have `is_staff = false`.

| Column | PostgreSQL type | Rules | Use |
| --- | --- | --- | --- |
| `id` | `integer` | PK, generated | Unique user identifier. Other tables store it as their user foreign key. |
| `password` | `varchar(128)` | required | Django password hash, never the plain-text password. |
| `last_login` | `timestamp with time zone` | nullable | Most recent Django login timestamp. |
| `is_superuser` | `boolean` | required | Gives all Django permissions; normally true for the main administrator. |
| `username` | `varchar(150)` | required, unique | Login name sent to the token API. |
| `first_name` | `varchar(150)` | required, may be blank | First part of the display name. |
| `last_name` | `varchar(150)` | required, may be blank | Last part of the display name. |
| `email` | `varchar(254)` | required, may be blank | User email address. |
| `is_staff` | `boolean` | required | Enables administrator-only Task Board actions: task management, ordering, and export. |
| `is_active` | `boolean` | required | False prevents the account from authenticating. |
| `date_joined` | `timestamp with time zone` | required | Account creation time. |

### `tasks_task` — work items on the board

Each row is one card on the pending, in-progress, or completed board columns.

| Column | PostgreSQL type | Rules | Use |
| --- | --- | --- | --- |
| `id` | `bigint` | PK, generated | Unique task ID used in API paths such as `/api/tasks/12/`. |
| `code` | `varchar(32)` | nullable, unique | Human-readable task code. If omitted when creating a task, the model creates a value such as `TSK-0012`. |
| `name` | `varchar(180)` | required | Short task title. |
| `description` | `text` | required, may be blank | Longer task details. |
| `due_date` | `date` | nullable | Optional due date, sent through the API as `YYYY-MM-DD`. |
| `priority` | `varchar(12)` | required | One of `low`, `medium`, or `high`. Defaults to `medium`. |
| `status` | `varchar(16)` | required | One of `pending`, `in_progress`, or `completed`. Defaults to `pending`. |
| `priority_position` | `integer` | required, indexed | Shared vertical order within a board column. New tasks receive the next position in steps of 100. |
| `created_at` | `timestamp with time zone` | required | Set automatically when the task is first saved. |
| `updated_at` | `timestamp with time zone` | required | Updated automatically whenever the task is saved. |
| `created_by_id` | `integer` | FK → `auth_user.id`, protected | User who created the task. That user cannot be deleted while this task exists. |
| `updated_by_id` | `integer` | nullable FK → `auth_user.id`, protected | User responsible for the latest update. |

Indexes: `code` is unique; `priority_position` is indexed; `(status, priority_position)` is a combined index used when showing ordered board columns.

### `tasks_taskattachment` — task image attachments

Each row links one image to a task. Images use either local Django media storage or Cloudinary; the storage-specific columns are still present in both modes.

| Column | PostgreSQL type | Rules | Use |
| --- | --- | --- | --- |
| `id` | `bigint` | PK, generated | Unique attachment ID. |
| `file` | `varchar(100)` | nullable | Relative local-media file path. Supports JPG, JPEG, PNG, GIF, and WebP. Empty when Cloudinary is used. |
| `uploaded_at` | `timestamp with time zone` | required | Time the attachment row was created. |
| `task_id` | `bigint` | FK → `tasks_task.id`, cascade delete | Task that owns the image. Deleting the task deletes this row. |
| `uploaded_by_id` | `integer` | FK → `auth_user.id`, protected | User who uploaded the image. |
| `cloud_public_id` | `varchar(255)` | required, may be blank | Cloudinary public ID used for remote deletion. |
| `cloud_resource_type` | `varchar(16)` | required, may be blank | Cloudinary resource type, normally `image`. |
| `cloud_url` | `varchar(200)` | required, may be blank | Secure Cloudinary URL. Used instead of `file` when present. |
| `original_filename` | `varchar(255)` | required, may be blank | Original uploaded file name. |

### `tasks_comment` — task comments and replies

A root comment has `parent_id = NULL`. A reply points to another comment in the same table.

| Column | PostgreSQL type | Rules | Use |
| --- | --- | --- | --- |
| `id` | `bigint` | PK, generated | Unique comment ID. |
| `body` | `text` | required | Comment text. The API limits new comments to 5,000 characters. |
| `created_at` | `timestamp with time zone` | required | Time the comment was created. |
| `updated_at` | `timestamp with time zone` | required | Time the comment was last changed. |
| `author_id` | `integer` | FK → `auth_user.id`, protected | User who wrote the comment. |
| `parent_id` | `bigint` | nullable FK → `tasks_comment.id`, cascade delete | Parent comment for a reply. Deleting a parent deletes its replies. |
| `task_id` | `bigint` | FK → `tasks_task.id`, cascade delete | Task that owns the discussion. |

### `tasks_commentattachment` — comment image/PDF attachments

Each row links one uploaded image or PDF to a comment.

| Column | PostgreSQL type | Rules | Use |
| --- | --- | --- | --- |
| `id` | `bigint` | PK, generated | Unique comment-attachment ID. |
| `file` | `varchar(100)` | nullable | Relative local-media path. Supports JPG, JPEG, PNG, GIF, WebP, and PDF. |
| `uploaded_at` | `timestamp with time zone` | required | Time the attachment row was created. |
| `comment_id` | `bigint` | FK → `tasks_comment.id`, cascade delete | Comment that owns the attachment. |
| `cloud_public_id` | `varchar(255)` | required, may be blank | Cloudinary public ID for cleanup. |
| `cloud_resource_type` | `varchar(16)` | required, may be blank | Cloudinary resource type, often `image` or `raw`. |
| `cloud_url` | `varchar(200)` | required, may be blank | Cloudinary URL returned to the browser. |
| `original_filename` | `varchar(255)` | required, may be blank | Original file name shown by the UI. |

### `tasks_taskactivity` — task audit history

The API creates these rows when a task is created, edited, moved to another status, reordered, or commented on.

| Column | PostgreSQL type | Rules | Use |
| --- | --- | --- | --- |
| `id` | `bigint` | PK, generated | Unique activity ID. |
| `action` | `varchar(20)` | required | One of `created`, `updated`, `status_changed`, `reordered`, or `commented`. |
| `detail` | `varchar(255)` | required, may be blank | Human-readable description displayed in the task history tab. |
| `created_at` | `timestamp with time zone` | required | Time the recorded action happened. |
| `actor_id` | `integer` | FK → `auth_user.id`, protected | User who performed the action. |
| `task_id` | `bigint` | FK → `tasks_task.id`, cascade delete | Task whose history contains this event. |

## Django framework tables

These tables support authentication, permissions, sessions, the Django admin, and migration tracking. The Task Board does not normally write to them directly; Django does.

### `auth_group`

| Column | Type | Use |
| --- | --- | --- |
| `id` | `integer` | PK for a permission group. |
| `name` | `varchar(150)` | Unique group name. |

### `auth_permission`

| Column | Type | Use |
| --- | --- | --- |
| `id` | `integer` | Permission PK. |
| `name` | `varchar(255)` | Human-readable permission name. |
| `content_type_id` | `integer` | FK to the model the permission applies to. |
| `codename` | `varchar(100)` | Machine-readable permission name, such as `add_task`. |

### Permission membership tables

| Table | Columns and types | Use |
| --- | --- | --- |
| `auth_group_permissions` | `id bigint`, `group_id integer`, `permission_id integer` | Connects a group to a permission. |
| `auth_user_groups` | `id bigint`, `user_id integer`, `group_id integer` | Connects a user to a group. |
| `auth_user_user_permissions` | `id bigint`, `user_id integer`, `permission_id integer` | Gives a permission directly to a user. |

### Django operational tables

| Table | Columns and types | Use |
| --- | --- | --- |
| `django_content_type` | `id integer`, `app_label varchar(100)`, `model varchar(100)` | Registry of Django models used by permissions and admin history. |
| `django_migrations` | `id bigint`, `app varchar(255)`, `name varchar(255)`, `applied timestamp with time zone` | Records migrations already applied to this database. |
| `django_session` | `session_key varchar(40)`, `session_data text`, `expire_date timestamp with time zone` | Stores Django server-side sessions, including admin sessions. |
| `django_admin_log` | `id integer`, `action_time timestamp with time zone`, `object_id text nullable`, `object_repr varchar(200)`, `action_flag smallint`, `change_message text`, `content_type_id integer nullable`, `user_id integer` | Audit log for changes made through `/admin/`. |

## Where the data comes from

- `python manage.py migrate` creates or updates the tables.
- `python manage.py seed_demo_users` creates `admin`, `user1`, and `user2` in `auth_user`.
- `python manage.py seed_demo_data` creates the fixed `DEMO-*` task, comment, and activity records.
- The REST API creates tasks, comments, attachments, and activity as users operate the UI.

Do not manually edit migration history or relationship IDs unless you understand the consequences. Use the API, Django admin, or a controlled database migration for normal changes.
