"""Media upload helpers shared by task and comment API flows."""

from dataclasses import dataclass

import cloudinary.uploader
from django.conf import settings


class CloudinaryUploadError(Exception):
    """A user-facing Cloudinary upload failure."""


@dataclass(frozen=True)
class CloudinaryAsset:
    url: str
    public_id: str
    resource_type: str
    filename: str


def upload_to_cloudinary(uploaded_file, *, folder: str, resource_type: str) -> CloudinaryAsset | None:
    """Upload once and return attachment metadata, or use local media when disabled."""
    if not settings.CLOUDINARY_ENABLED:
        return None
    try:
        result = cloudinary.uploader.upload(
            uploaded_file,
            folder=folder,
            resource_type=resource_type,
            use_filename=True,
            unique_filename=True,
            overwrite=False,
        )
    except Exception as exc:
        raise CloudinaryUploadError("Cloud upload failed. Check the Cloudinary credentials and try again.") from exc
    return CloudinaryAsset(
        url=result["secure_url"],
        public_id=result["public_id"],
        resource_type=result["resource_type"],
        filename=getattr(uploaded_file, "name", "attachment"),
    )


def delete_from_cloudinary(public_id: str, resource_type: str) -> None:
    """Best-effort cleanup; remote cleanup cannot block a database delete."""
    if not settings.CLOUDINARY_ENABLED or not public_id:
        return
    try:
        cloudinary.uploader.destroy(public_id, resource_type=resource_type or "image", invalidate=True)
    except Exception:
        pass
