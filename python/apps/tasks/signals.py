from django.db.models.signals import post_delete
from django.dispatch import receiver

from .models import CommentAttachment, TaskAttachment
from .services import delete_from_cloudinary


@receiver(post_delete, sender=TaskAttachment)
def delete_task_attachment_from_cloudinary(sender, instance, **kwargs):
    delete_from_cloudinary(instance.cloud_public_id, instance.cloud_resource_type)


@receiver(post_delete, sender=CommentAttachment)
def delete_comment_attachment_from_cloudinary(sender, instance, **kwargs):
    delete_from_cloudinary(instance.cloud_public_id, instance.cloud_resource_type)
