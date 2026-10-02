# Task Board System

This repository is divided deliberately into two independently deployable applications:

- [`ui`](./ui): React, Vite, Tailwind CSS, Axios, and drag-and-drop Kanban interface.
- [`python`](./python): Django REST API backed by PostgreSQL with JWT authentication.

## Start locally

1. Follow the database, Python package, table migration, demo-data, and API steps in [`python/README.md`](python/README.md).
2. With the API running, follow the Node package, UI configuration, and sign-in steps in [`ui/README.md`](ui/README.md).

The local UI is normally `http://localhost:5173/` and the local API is normally `http://127.0.0.1:8000/`.

## Roles

| Capability | Administrator (`is_staff=True`) | User |
| --- | --- | --- |
| View/search/filter tasks | Yes | Yes |
| Create, edit, delete task | Yes | No |
| Change task status | Yes | Yes |
| Reorder global vertical priority | Yes | No |
| Post/reply to comments and attach image/PDF | Yes | Yes |
| Export filtered tasks | Yes | No |

## Included API features

- JWT token and refresh endpoints.
- Task codes, descriptions, due dates, priority/status options, task image attachments, and pageable filtered lists.
- Explicit staff-only enforcement in the backend—not merely hidden UI controls.
- Threaded comment data model with reply parents and image/PDF attachments.
- Audit history for task creation, edits, status changes, reordering, and comments.
- Filter-preserving Excel and PDF export endpoints.
