# Flowboard UI — Frontend Setup and Sign-in

React, Vite, Tailwind CSS, and Axios client for the Task Board API. Complete the database and backend setup in [`../python/README.md`](../python/README.md) first and leave the Django server running.

## Prerequisites

- Node.js 20 LTS or later (`node --version`)
- npm (included with Node.js)
- The backend API running at `http://127.0.0.1:8000/`

## 1. Configure the UI environment

From the repository root:

```powershell
cd .\ui
Copy-Item .env.example .env
```

Ensure `.env` contains the API base URL:

```dotenv
VITE_API_URL=http://localhost:8000/api
```

If the API runs on another port or computer, change this value to its reachable `/api` URL and add the UI origin to `CORS_ALLOWED_ORIGINS` in `python/.env`.

## 2. Install packages and start the UI

```powershell
npm install
npm run dev
```

Vite will print the local address, normally `http://localhost:5173/`. Open that address in a browser. Keep the API terminal running as well. Stop the UI server with `Ctrl+C`.

## Sign in

After running both backend seed commands, use one of these local development accounts:

| Role | Username | Password |
| --- | --- | --- |
| Administrator | `admin` | `Admin@12345` |
| Standard user | `user1` | `User@12345` |
| Standard user | `user2` | `User@12345` |

The administrator can create, edit, delete, reorder, and export tasks. Standard users can view tasks, move cards between statuses, and add or reply to comments.

## Build a production bundle

```powershell
npm run build
```

The compiled static files are written to `ui/dist/`. Set `VITE_API_URL` to the deployed HTTPS API URL before building for production.

## Behavior

- All authenticated users can view cards, change a card’s status by moving it to another column, and add/reply to comments with image/PDF attachments.
- Administrators also see task creation/edit/delete, filtered Excel/PDF export, and vertical reordering. That reordered priority persists for every user.
- The board fetches standard paginated task results. Search, status, priority, and due-date sorting are sent directly to the API.
