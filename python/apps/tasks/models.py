from django.conf import settings
from django.core.validators import FileExtensionValidator
from django.db import models
from django.db.models import Max


class Task(models.Model):
    class Priority(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        IN_PROGRESS = "in_progress", "In Progress"
        COMPLETED = "completed", "Completed"

    code = models.CharField(max_length=32, unique=True, null=True, blank=True)
    name = models.CharField(max_length=180)
    description = models.TextField(blank=True)
    due_date = models.DateField(null=True, blank=True)
    priority = models.CharField(max_length=12, choices=Priority.choices, default=Priority.MEDIUM)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    priority_position = models.PositiveIntegerField(default=0, db_index=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="created_tasks")
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="updated_tasks", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("priority_position", "-created_at")
        indexes = [models.Index(fields=["status", "priority_position"])]

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        if is_new and not self.code:
            self.code = None
        if is_new and not self.priority_position:
            self.priority_position = (Task.objects.aggregate(last_position=Max("priority_position"))["last_position"] or 0) + 100
        super().save(*args, **kwargs)
        if is_new and not self.code:
            Task.objects.filter(pk=self.pk).update(code=f"TSK-{self.pk:04d}")
            self.code = f"TSK-{self.pk:04d}"

    def __str__(self):
        return f"{self.code}: {self.name}"


class TaskAttachment(models.Model):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="attachments")
    file = models.ImageField(upload_to="task_attachments/%Y/%m/", validators=[FileExtensionValidator(["jpg", "jpeg", "png", "gif", "webp"])], blank=True, null=True)
    cloud_url = models.URLField(blank=True)
    cloud_public_id = models.CharField(max_length=255, blank=True)
    cloud_resource_type = models.CharField(max_length=16, blank=True)
    original_filename = models.CharField(max_length=255, blank=True)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="task_attachments")
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.file.name


class Comment(models.Model):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="comments")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="task_comments")
    body = models.TextField()
    parent = models.ForeignKey("self", on_delete=models.CASCADE, null=True, blank=True, related_name="replies")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("created_at",)


class CommentAttachment(models.Model):
    comment = models.ForeignKey(Comment, on_delete=models.CASCADE, related_name="attachments")
    file = models.FileField(upload_to="comment_attachments/%Y/%m/", validators=[FileExtensionValidator(["jpg", "jpeg", "png", "gif", "webp", "pdf"])], blank=True, null=True)
    cloud_url = models.URLField(blank=True)
    cloud_public_id = models.CharField(max_length=255, blank=True)
    cloud_resource_type = models.CharField(max_length=16, blank=True)
    original_filename = models.CharField(max_length=255, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)


class TaskActivity(models.Model):
    class Action(models.TextChoices):
        CREATED = "created", "Created"
        UPDATED = "updated", "Updated"
        STATUS_CHANGED = "status_changed", "Status changed"
        REORDERED = "reordered", "Reordered"
        COMMENTED = "commented", "Commented"

    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="activities")
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="task_activities")
    action = models.CharField(max_length=20, choices=Action.choices)
    detail = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
