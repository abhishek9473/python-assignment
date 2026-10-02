from django.contrib import admin
from .models import Comment, CommentAttachment, Task, TaskActivity, TaskAttachment


class TaskAttachmentInline(admin.TabularInline):
    model = TaskAttachment
    extra = 0


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "status", "priority", "priority_position", "due_date")
    list_filter = ("status", "priority")
    search_fields = ("code", "name")
    inlines = [TaskAttachmentInline]


admin.site.register(Comment)
admin.site.register(CommentAttachment)
admin.site.register(TaskActivity)
