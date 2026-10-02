"""Create predictable local-development accounts for the Task Board."""

import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Create or update one admin and two normal demo users."

    USERS = (
        {
            "username": "admin",
            "email": "admin@example.com",
            "first_name": "Board",
            "last_name": "Admin",
            "is_staff": True,
            "is_superuser": True,
            "password_setting": "DEMO_ADMIN_PASSWORD",
            "default_password": "Admin@12345",
        },
        {
            "username": "user1",
            "email": "user1@example.com",
            "first_name": "Team",
            "last_name": "Member One",
            "is_staff": False,
            "is_superuser": False,
            "password_setting": "DEMO_USER_PASSWORD",
            "default_password": "User@12345",
        },
        {
            "username": "user2",
            "email": "user2@example.com",
            "first_name": "Team",
            "last_name": "Member Two",
            "is_staff": False,
            "is_superuser": False,
            "password_setting": "DEMO_USER_PASSWORD",
            "default_password": "User@12345",
        },
    )

    def handle(self, *args, **options):
        user_model = get_user_model()
        for definition in self.USERS:
            password = os.getenv(definition["password_setting"], definition["default_password"])
            user, created = user_model.objects.update_or_create(
                username=definition["username"],
                defaults={
                    "email": definition["email"],
                    "first_name": definition["first_name"],
                    "last_name": definition["last_name"],
                    "is_staff": definition["is_staff"],
                    "is_superuser": definition["is_superuser"],
                    "is_active": True,
                },
            )
            user.set_password(password)
            user.save(update_fields=["password"])
            action = "Created" if created else "Updated"
            role = "Admin" if user.is_staff else "User"
            self.stdout.write(self.style.SUCCESS(f"{action} {role}: {user.username}"))

        self.stdout.write(self.style.WARNING(
            "Demo passwords are for local development only. Change or remove them before deployment."
        ))
        self.stdout.write("Credentials: admin / Admin@12345; user1 / User@12345; user2 / User@12345")
