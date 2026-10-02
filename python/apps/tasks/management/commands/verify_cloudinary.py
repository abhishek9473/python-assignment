"""Verify the configured Cloudinary credentials without uploading an asset."""

import cloudinary
import cloudinary.api
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Verify that the configured Cloudinary credentials can reach the Cloudinary API."

    def handle(self, *args, **options):
        if not settings.CLOUDINARY_ENABLED:
            raise CommandError(
                "Cloudinary is not configured. Add CLOUDINARY_URL, or all three split credentials, to python/.env."
            )

        config = cloudinary.config()
        if not all((config.cloud_name, config.api_key, config.api_secret)):
            raise CommandError(
                "Cloudinary configuration is incomplete. Use a valid CLOUDINARY_URL or provide cloud name, API key, and API secret."
            )

        try:
            result = cloudinary.api.ping()
        except Exception as exc:
            raise CommandError(
                "Cloudinary did not accept the configured credentials or could not be reached. Check python/.env and your network."
            ) from exc

        if result.get("status") != "ok":
            raise CommandError("Cloudinary returned an unexpected response to the connectivity check.")

        self.stdout.write(self.style.SUCCESS("Cloudinary credentials verified. No asset was uploaded."))
