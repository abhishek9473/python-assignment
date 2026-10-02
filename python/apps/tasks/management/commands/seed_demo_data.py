"""Populate a local Task Board database with predictable demo board content."""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.tasks.models import Comment, Task, TaskActivity


class Command(BaseCommand):
    help = "Create or update local demo tasks, comments, and task activity."

    TASKS = (
        {
            "code": "DEMO-001",
            "name": "Confirm project scope",
            "description": "Review the requested features and record any open questions.",
            "due_in_days": 1,
            "priority": Task.Priority.HIGH,
            "status": Task.Status.PENDING,
            "position": 100,
            "owner": "admin",
        },
        {
            "code": "DEMO-002",
            "name": "Create wireframes",
            "description": "Prepare the main board, task detail, and sign-in screen layouts.",
            "due_in_days": 3,
            "priority": Task.Priority.HIGH,
            "status": Task.Status.IN_PROGRESS,
            "position": 200,
            "owner": "admin",
        },
        {
            "code": "DEMO-003",
            "name": "Implement task filters",
            "description": "Add search plus status, priority, and due-date filters.",
            "due_in_days": 5,
            "priority": Task.Priority.MEDIUM,
            "status": Task.Status.IN_PROGRESS,
            "position": 300,
            "owner": "user1",
        },
        {
            "code": "DEMO-004",
            "name": "Add attachment support",
            "description": "Allow task images and comment image or PDF attachments.",
            "due_in_days": 7,
            "priority": Task.Priority.MEDIUM,
            "status": Task.Status.PENDING,
            "position": 400,
            "owner": "user2",
        },
        {
            "code": "DEMO-005",
            "name": "Review API permissions",
            "description": "Verify staff-only and authenticated-user actions.",
            "due_in_days": -1,
            "priority": Task.Priority.LOW,
            "status": Task.Status.COMPLETED,
            "position": 500,
            "owner": "admin",
        },
        {
            "code": "DEMO-006",
            "name": "Publish local setup guide",
            "description": "Document PostgreSQL, API, UI, and demo-account setup.",
            "due_in_days": 2,
            "priority": Task.Priority.LOW,
            "status": Task.Status.COMPLETED,
            "position": 600,
            "owner": "user1",
        },
    )

    def handle(self, *args, **options):
        user_model = get_user_model()
        users = {
            username: user_model.objects.filter(username=username).first()
            for username in ("admin", "user1", "user2")
        }
        missing_users = [username for username, user in users.items() if user is None]
        if missing_users:
            joined = ", ".join(missing_users)
            raise CommandError(
                f"Missing demo account(s): {joined}. Run `python manage.py seed_demo_users` first."
            )

        today = timezone.localdate()
        created_tasks = 0
        updated_tasks = 0
        created_comments = 0

        with transaction.atomic():
            tasks_by_code = {}
            for definition in self.TASKS:
                owner = users[definition["owner"]]
                task, created = Task.objects.update_or_create(
                    code=definition["code"],
                    defaults={
                        "name": definition["name"],
                        "description": definition["description"],
                        "due_date": today + timedelta(days=definition["due_in_days"]),
                        "priority": definition["priority"],
                        "status": definition["status"],
                        "priority_position": definition["position"],
                        "created_by": owner,
                        "updated_by": owner,
                    },
                )
                tasks_by_code[definition["code"]] = task
                if created:
                    created_tasks += 1
                else:
                    updated_tasks += 1
                TaskActivity.objects.get_or_create(
                    task=task,
                    actor=owner,
                    action=TaskActivity.Action.CREATED,
                    detail="Created by demo seed",
                )

            comments = (
                ("DEMO-001", "user1", "I have reviewed the initial scope and added the open questions."),
                ("DEMO-002", "user2", "The first board layout is ready for feedback."),
                ("DEMO-003", "admin", "Please include a clear way to reset every active filter."),
            )
            for task_code, author_name, body in comments:
                _, created = Comment.objects.get_or_create(
                    task=tasks_by_code[task_code], author=users[author_name], body=body
                )
                created_comments += int(created)

            parent = Comment.objects.get(
                task=tasks_by_code["DEMO-003"],
                author=users["admin"],
                body="Please include a clear way to reset every active filter.",
            )
            _, created = Comment.objects.get_or_create(
                task=tasks_by_code["DEMO-003"],
                author=users["user1"],
                parent=parent,
                body="Understood. I will add the reset action beside the active filters.",
            )
            created_comments += int(created)

            for task_code in ("DEMO-001", "DEMO-002", "DEMO-003"):
                TaskActivity.objects.get_or_create(
                    task=tasks_by_code[task_code],
                    actor=users["admin"],
                    action=TaskActivity.Action.COMMENTED,
                    detail="Added by demo seed",
                )

        self.stdout.write(self.style.SUCCESS(
            f"Demo data ready: {created_tasks} task(s) created, {updated_tasks} task(s) updated, "
            f"and {created_comments} comment(s) created."
        ))
