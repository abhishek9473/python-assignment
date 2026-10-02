# Task Board API — Backend and Database Setup

This Django REST API uses PostgreSQL, JWT authentication, task attachments, threaded comments, filters, exports, and audit activity. Follow these steps from a fresh clone on Windows PowerShell.

## Prerequisites

- Python 3.11–3.13 (`py --version` to check)
- PostgreSQL 14 or later, with its service running
- PowerShell

## 1. Create the PostgreSQL user and database

Open **SQL Shell (psql)** as the PostgreSQL administrator, connect to the default `postgres` database, and run the following. Choose your own local password in place of `choose-a-strong-local-password`.

```sql
CREATE ROLE taskboard_user WITH LOGIN PASSWORD 'choose-a-strong-local-password';
CREATE DATABASE taskboard OWNER taskboard_user;
```

If either already exists, do not run the corresponding statement again. To use different names, use the same names in the environment file in the next step.

## 2. Configure the backend environment

From the repository root:

```powershell
cd .\python
Copy-Item .env.example .env
```

Open `.env` and set these values to match PostgreSQL:

```dotenv
DJANGO_DEBUG=True
POSTGRES_DB=taskboard
POSTGRES_USER=taskboard_user
POSTGRES_PASSWORD=choose-a-strong-local-password
POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=5432
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

Cloudinary settings are optional for local development. Leave every `CLOUDINARY_*` value empty to store uploaded files locally in `python/media/`.

## 3. Create the Python environment and install packages

Run these commands from `python/`:

```powershell
py -3.13 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

If PowerShell blocks activation, run `Set-ExecutionPolicy -Scope Process Bypass` once in that terminal, then run the activation command again. If your computer has a different supported Python version, replace `-3.13` accordingly.

## 4. Create all tables and seed local demo data

Migrations create the Django, authentication, and Task Board tables. The seed commands are safe to rerun: they update the fixed demo records rather than duplicating them.

```powershell
python manage.py migrate
python manage.py seed_demo_users
# python manage.py seed_demo_data
```

<!-- `seed_demo_data` creates six sample tasks, comments, replies, and activity entries. It requires the demo users from the previous command. -->

### Demo accounts

| Role | Username | Password |
| --- | --- | --- |
| Administrator | `admin` | `Admin@12345` |
| Standard user | `user1` | `User@12345` |
| Standard user | `user2` | `User@12345` |

The passwords can be changed before seeding with `DEMO_ADMIN_PASSWORD` and `DEMO_USER_PASSWORD` in `.env`. These accounts are for local development only.

## 5. Start the API server

```powershell
python manage.py runserver
```

The API is available at `http://127.0.0.1:8000/`; the Django admin is at `http://127.0.0.1:8000/admin/`. Keep this terminal open while using the UI. Stop the server with `Ctrl+C`.

To allow another device on your network to reach the development API, use `python manage.py runserver 0.0.0.0:8000` and explicitly add that host and UI origin to `DJANGO_ALLOWED_HOSTS` and `CORS_ALLOWED_ORIGINS`.

## Quick verification

With the server running, open `http://127.0.0.1:8000/api/auth/token/` in an API client and send the `admin` username and password to obtain JWT tokens. The UI setup and sign-in instructions are in [`../ui/README.md`](../ui/README.md).

The superuser is the administrator. A user whose `is_staff` is false can view tasks, update only task status, and add comments. All task creation, edits, deletion, reordering, and exports are staff-only.

## API overview

`POST /api/auth/token/` obtains access/refresh JWTs. `GET /api/auth/me/` returns the signed-in user.

`/api/tasks/` supports `search`, `status`, `priority`, `due_date_order=asc|desc`, and standard `page` pagination. Task status changes use `PATCH /api/tasks/:id/status/`; comments use `POST /api/tasks/:id/comments/`. Admin-only routes include task CRUD, `POST /api/tasks/reorder/`, and `GET /api/tasks/export/?format=xlsx|pdf` with the active filters.

## Cloudinary uploads

1. Copy `.env.example` to `.env` if it does not already exist. `.env` is ignored by Git; `.env.example` must contain placeholders only.
2. In the Cloudinary console's **Settings → API Keys** page, create or copy a current API environment variable. Put it in `.env` exactly once as `CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>`. Alternatively, leave `CLOUDINARY_URL` empty and fill in all three split credential variables.
3. Install dependencies and verify the credentials without uploading a file:
   ```powershell
   .\.venv\Scripts\python.exe manage.py verify_cloudinary
   ```
4. Start the API, create or edit a task with an image, then add a comment with an image or PDF. The resulting attachment URL should be `https://res.cloudinary.com/...`, and the assets will appear in the `task-board/task-images` or `task-board/comment-attachments` folders in Cloudinary.

Task images and comment images/PDFs use the shared `apps/tasks/services.py` helper. With no Cloudinary credentials, local development instead uses `media/`.
