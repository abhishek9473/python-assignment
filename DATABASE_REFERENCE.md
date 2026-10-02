# Task Board Database: Tables, Columns, and Uses

This is the PostgreSQL database created by the project migrations. It has **15 tables**.

Types below are the actual PostgreSQL types in this project. `PK` means primary key (the row's unique ID). `FK` means foreign key (a column that links to an ID in another table).

## 1. All table names, grouped by purpose

### A. Users and permissions — 6 tables

1. `auth_user` — application users and login accounts
2. `auth_group` — named groups of permissions
3. `auth_permission` — individual Django permissions
4. `auth_group_permissions` — links groups to permissions
5. `auth_user_groups` — links users to groups
6. `auth_user_user_permissions` — links users directly to permissions

### B. Task Board application data — 5 tables

7. `tasks_task` — task cards on the board
8. `tasks_taskattachment` — image files attached to tasks
9. `tasks_comment` — task comments and replies
10. `tasks_commentattachment` — image/PDF files attached to comments
11. `tasks_taskactivity` — history/audit events for tasks

### C. Django system tables — 4 tables

12. `django_admin_log` — changes made in the Django admin website
13. `django_content_type` — list of Django models used by permissions/admin
14. `django_migrations` — migrations already applied to the database
15. `django_session` — Django server-side sessions, including admin login sessions

## 2. Table details

### 1. `auth_user` — user accounts

This table stores every user who can sign in. `is_staff` controls whether the user is an administrator in the Task Board UI and API.

| Column | Data type | Use in the application |
| --- | --- | --- |
| `id` | `integer` | PK. Unique user ID, such as `1`. Task, comment, attachment, and activity tables refer to this ID. This project uses an integer user ID, not UUID. |
| `password` | `varchar(128)` | Stores Django's hashed password. It never stores the plain-text login password. |
| `last_login` | `timestamp with time zone`, nullable | Stores the user's most recent Django login time. |
| `is_superuser` | `boolean` | Gives all Django permissions; normally true for the main system administrator. |
| `username` | `varchar(150)` | Unique login name sent to `POST /api/auth/token/`. Example: `admin`. |
| `first_name` | `varchar(150)` | User's first name; used with last name for the display name. May be blank. |
| `last_name` | `varchar(150)` | User's last name; used with first name for the display name. May be blank. |
| `email` | `varchar(254)` | User email address. May be blank. |
| `is_staff` | `boolean` | `true` means administrator. Administrators can create, edit, delete, reorder, and export tasks. |
| `is_active` | `boolean` | `false` prevents the user from logging in. |
| `date_joined` | `timestamp with time zone` | Stores when this account was created. |

### 2. `auth_group` — permission groups

This is Django's optional group feature. The current Task Board checks `is_staff` for administrator actions, but groups can support future permission rules.

| Column | Data type | Use in the application |
| --- | --- | --- |
| `id` | `integer` | PK. Unique group ID. |
| `name` | `varchar(150)` | Unique group name, for example `Managers`. |

### 3. `auth_permission` — individual permissions

Django automatically creates standard permissions for each registered model, such as adding, changing, deleting, and viewing tasks.

| Column | Data type | Use in the application |
| --- | --- | --- |
| `id` | `integer` | PK. Unique permission ID. |
| `name` | `varchar(255)` | Human-readable permission name, for example `Can add task`. |
| `content_type_id` | `integer` | FK to `django_content_type.id`. Identifies the model this permission belongs to. |
| `codename` | `varchar(100)` | Machine-readable permission code, for example `add_task`. |

### 4. `auth_group_permissions` — group-to-permission links

Each row gives one group one permission. It is a many-to-many link table.

| Column | Data type | Use in the application |
| --- | --- | --- |
| `id` | `bigint` | PK. Unique link-row ID. |
| `group_id` | `integer` | FK to `auth_group.id`. Identifies the group receiving the permission. |
| `permission_id` | `integer` | FK to `auth_permission.id`. Identifies the permission given to the group. |

### 5. `auth_user_groups` — user-to-group links

Each row adds one user to one group.

| Column | Data type | Use in the application |
| --- | --- | --- |
| `id` | `bigint` | PK. Unique link-row ID. |
| `user_id` | `integer` | FK to `auth_user.id`. Identifies the user. |
| `group_id` | `integer` | FK to `auth_group.id`. Identifies the group the user belongs to. |

### 6. `auth_user_user_permissions` — direct user permissions

Each row gives one permission directly to one user, without using a group.

| Column | Data type | Use in the application |
| --- | --- | --- |
| `id` | `bigint` | PK. Unique link-row ID. |
| `user_id` | `integer` | FK to `auth_user.id`. Identifies the user receiving the permission. |
| `permission_id` | `integer` | FK to `auth_permission.id`. Identifies the directly assigned permission. |

### 7. `tasks_task` — task cards

This is the main Task Board table. One row is one board card.

| Column | Data type | Use in the application |
| --- | --- | --- |
| `id` | `bigint` | PK. Unique task ID used in API URLs, for example `/api/tasks/12/`. It is a generated number, not UUID. |
| `code` | `varchar(32)`, nullable | Unique human-readable task code. The server creates a code such as `TSK-0012` when no code is supplied. |
| `name` | `varchar(180)` | Required task title shown on the board card. |
| `description` | `text` | Longer task details shown in the task drawer. Can be blank. |
| `due_date` | `date`, nullable | Optional deadline stored as a date, for example `2026-10-15`. |
| `priority` | `varchar(12)` | Task importance: `low`, `medium`, or `high`. Defaults to `medium`. |
| `status` | `varchar(16)` | Board column: `pending`, `in_progress`, or `completed`. Defaults to `pending`. |
| `priority_position` | `integer` | Shared vertical card order. Administrators change it through the reorder API. |
| `created_at` | `timestamp with time zone` | Automatically stores when the task was created. |
| `updated_at` | `timestamp with time zone` | Automatically stores when the task was most recently saved. |
| `created_by_id` | `integer` | FK to `auth_user.id`. Stores who created this task. |
| `updated_by_id` | `integer`, nullable | FK to `auth_user.id`. Stores who most recently updated the task. |

Important rules: `code` is unique; `priority_position` is indexed; the combined `(status, priority_position)` index helps load ordered board columns.

### 8. `tasks_taskattachment` — task image attachments

One row represents one image attached to a task. The image is stored locally or in Cloudinary, depending on environment configuration.

| Column | Data type | Use in the application |
| --- | --- | --- |
| `id` | `bigint` | PK. Unique task-attachment ID. |
| `file` | `varchar(100)`, nullable | Relative local file path, such as `task_attachments/2026/10/design.png`. Empty when Cloudinary is used. |
| `uploaded_at` | `timestamp with time zone` | Automatically stores when the image was attached. |
| `task_id` | `bigint` | FK to `tasks_task.id`. Identifies the task that owns the image. Deleting the task deletes its attachment rows. |
| `uploaded_by_id` | `integer` | FK to `auth_user.id`. Stores who uploaded the image. |
| `cloud_public_id` | `varchar(255)` | Cloudinary file ID used when deleting the remote image. Blank for local storage. |
| `cloud_resource_type` | `varchar(16)` | Cloudinary asset type, normally `image`. Blank for local storage. |
| `cloud_url` | `varchar(200)` | Cloudinary secure URL returned to the browser. Blank for local storage. |
| `original_filename` | `varchar(255)` | Original uploaded filename, for example `design.png`. |

### 9. `tasks_comment` — comments and replies

One row represents one comment. A reply is another row in this same table with a `parent_id` value.

| Column | Data type | Use in the application |
| --- | --- | --- |
| `id` | `bigint` | PK. Unique comment ID. |
| `body` | `text` | Required comment text. The API accepts up to 5,000 characters. |
| `created_at` | `timestamp with time zone` | Automatically stores when the comment was created. |
| `updated_at` | `timestamp with time zone` | Automatically stores the most recent edit time. |
| `author_id` | `integer` | FK to `auth_user.id`. Stores who wrote the comment. |
| `parent_id` | `bigint`, nullable | FK to `tasks_comment.id`. `NULL` means top-level comment; a number means this row is a reply to that comment. |
| `task_id` | `bigint` | FK to `tasks_task.id`. Stores which task discussion contains the comment. |

Deleting a task deletes its comments. Deleting a parent comment also deletes its replies.

### 10. `tasks_commentattachment` — comment image/PDF attachments

One row represents one image or PDF uploaded with a comment.

| Column | Data type | Use in the application |
| --- | --- | --- |
| `id` | `bigint` | PK. Unique comment-attachment ID. |
| `file` | `varchar(100)`, nullable | Relative local path for an uploaded image/PDF. Empty when Cloudinary is used. |
| `uploaded_at` | `timestamp with time zone` | Automatically stores when the file was attached. |
| `comment_id` | `bigint` | FK to `tasks_comment.id`. Identifies the comment that owns the file. |
| `cloud_public_id` | `varchar(255)` | Cloudinary asset ID used for remote cleanup. Blank for local storage. |
| `cloud_resource_type` | `varchar(16)` | Cloudinary asset type, usually `image` or `raw` for a PDF. |
| `cloud_url` | `varchar(200)` | Cloudinary secure URL used to open the file. Blank for local storage. |
| `original_filename` | `varchar(255)` | Original filename displayed in the comment UI. |

### 11. `tasks_taskactivity` — task history

The API creates a history record for key actions: task creation, task editing, status change, priority reordering, and a new comment.

| Column | Data type | Use in the application |
| --- | --- | --- |
| `id` | `bigint` | PK. Unique history-record ID. |
| `action` | `varchar(20)` | Event type: `created`, `updated`, `status_changed`, `reordered`, or `commented`. |
| `detail` | `varchar(255)` | Human-readable history description shown in the task drawer's History tab. |
| `created_at` | `timestamp with time zone` | Time the action happened. |
| `actor_id` | `integer` | FK to `auth_user.id`. Stores which user performed the action. |
| `task_id` | `bigint` | FK to `tasks_task.id`. Stores which task this history entry belongs to. |

### 12. `django_admin_log` — Django admin history

This is separate from `tasks_taskactivity`. It records changes made through the `/admin/` website.

| Column | Data type | Use in the application |
| --- | --- | --- |
| `id` | `integer` | PK. Unique admin-log record ID. |
| `action_time` | `timestamp with time zone` | Time the administrator action occurred. |
| `object_id` | `text`, nullable | ID of the object changed in Django admin. |
| `object_repr` | `varchar(200)` | Text representation of the changed object. |
| `action_flag` | `smallint` | Django action code: add, change, or delete. |
| `change_message` | `text` | Django's description of the changed fields. |
| `content_type_id` | `integer`, nullable | FK to `django_content_type.id`. Identifies the model that was changed. |
| `user_id` | `integer` | FK to `auth_user.id`. Identifies the administrator who made the change. |

### 13. `django_content_type` — Django model registry

Django uses this table to identify models for permissions and admin history.

| Column | Data type | Use in the application |
| --- | --- | --- |
| `id` | `integer` | PK. Unique content-type ID. |
| `app_label` | `varchar(100)` | Django app name, for example `tasks`. |
| `model` | `varchar(100)` | Lowercase model name, for example `task`. |

### 14. `django_migrations` — migration history

Django writes one row after each successful database migration. `python manage.py migrate` reads this table to know what remains to apply.

| Column | Data type | Use in the application |
| --- | --- | --- |
| `id` | `bigint` | PK. Unique migration-history row ID. |
| `app` | `varchar(255)` | Django app that owns the migration, for example `tasks`. |
| `name` | `varchar(255)` | Migration filename without `.py`, for example `0001_initial`. |
| `applied` | `timestamp with time zone` | Time the migration completed. |

### 15. `django_session` — server-side sessions

The Task Board API uses JWT authentication, but Django's `/admin/` website uses this table for its login session.

| Column | Data type | Use in the application |
| --- | --- | --- |
| `session_key` | `varchar(40)` | PK. Unique browser-session key. |
| `session_data` | `text` | Encoded session information stored by Django. |
| `expire_date` | `timestamp with time zone` | Time the session becomes invalid. |

## 3. Simple relationship summary

```text
One user can create many tasks.
One task can have many images, comments, and history records.
One comment can have many file attachments and many reply comments.
One task image belongs to one task.
One comment file belongs to one comment.
```

The setup and seed commands are documented in `python/README.md`. API request and response details are in `API_REFERENCE.md`.
