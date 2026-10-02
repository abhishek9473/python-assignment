from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Comment, CommentAttachment, Task, TaskActivity, TaskAttachment
from .services import CloudinaryUploadError, upload_to_cloudinary

User = get_user_model()


class UserSummarySerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "username", "full_name")

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username


class TaskAttachmentSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = TaskAttachment
        fields = ("id", "url", "uploaded_at", "uploaded_by")
        read_only_fields = fields

    def get_url(self, obj):
        if obj.cloud_url:
            return obj.cloud_url
        if not obj.file:
            return None
        request = self.context.get("request")
        url = obj.file.url
        return request.build_absolute_uri(url) if request else url


class CommentAttachmentSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()
    filename = serializers.SerializerMethodField()

    class Meta:
        model = CommentAttachment
        fields = ("id", "url", "filename", "uploaded_at")
        read_only_fields = fields

    def get_url(self, obj):
        if obj.cloud_url:
            return obj.cloud_url
        if not obj.file:
            return None
        request = self.context.get("request")
        url = obj.file.url
        return request.build_absolute_uri(url) if request else url

    def get_filename(self, obj):
        if obj.original_filename:
            return obj.original_filename
        if not obj.file:
            return "attachment"
        return obj.file.name.rsplit("/", 1)[-1]


class CommentSerializer(serializers.ModelSerializer):
    author = UserSummarySerializer(read_only=True)
    attachments = CommentAttachmentSerializer(many=True, read_only=True)
    replies = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = ("id", "body", "parent", "author", "attachments", "replies", "created_at", "updated_at")
        read_only_fields = ("id", "author", "attachments", "replies", "created_at", "updated_at")

    def get_replies(self, obj):
        replies = obj.replies.select_related("author").prefetch_related("attachments")
        return CommentSerializer(replies, many=True, context=self.context).data


class TaskBaseSerializer(serializers.ModelSerializer):
    created_by = UserSummarySerializer(read_only=True)
    updated_by = UserSummarySerializer(read_only=True)
    attachments = TaskAttachmentSerializer(many=True, read_only=True)
    new_attachments = serializers.ListField(
        child=serializers.ImageField(), write_only=True, required=False, allow_empty=True
    )

    class Meta:
        model = Task
        fields = (
            "id", "code", "name", "description", "due_date", "priority", "status",
            "priority_position", "created_by", "updated_by", "attachments", "new_attachments",
            "created_at", "updated_at",
        )
        read_only_fields = ("id", "priority_position", "created_by", "updated_by", "created_at", "updated_at")
        extra_kwargs = {"code": {"required": False, "allow_blank": True, "allow_null": True}}

    def create(self, validated_data):
        files = validated_data.pop("new_attachments", [])
        user = self.context["request"].user
        task = Task.objects.create(created_by=user, updated_by=user, **validated_data)
        try:
            for file in files:
                asset = upload_to_cloudinary(file, folder="task-board/task-images", resource_type="image")
                if asset:
                    TaskAttachment.objects.create(task=task, uploaded_by=user, cloud_url=asset.url, cloud_public_id=asset.public_id, cloud_resource_type=asset.resource_type, original_filename=asset.filename)
                else:
                    TaskAttachment.objects.create(task=task, file=file, uploaded_by=user, original_filename=file.name)
        except CloudinaryUploadError as exc:
            task.delete()
            raise serializers.ValidationError({"new_attachments": str(exc)}) from exc
        return task

    def update(self, instance, validated_data):
        files = validated_data.pop("new_attachments", [])
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.updated_by = self.context["request"].user
        instance.save()
        try:
            for file in files:
                asset = upload_to_cloudinary(file, folder="task-board/task-images", resource_type="image")
                if asset:
                    TaskAttachment.objects.create(task=instance, uploaded_by=self.context["request"].user, cloud_url=asset.url, cloud_public_id=asset.public_id, cloud_resource_type=asset.resource_type, original_filename=asset.filename)
                else:
                    TaskAttachment.objects.create(task=instance, file=file, uploaded_by=self.context["request"].user, original_filename=file.name)
        except CloudinaryUploadError as exc:
            raise serializers.ValidationError({"new_attachments": str(exc)}) from exc
        return instance


class TaskListSerializer(TaskBaseSerializer):
    comment_count = serializers.IntegerField(read_only=True)

    class Meta(TaskBaseSerializer.Meta):
        fields = TaskBaseSerializer.Meta.fields + ("comment_count",)


class TaskDetailSerializer(TaskBaseSerializer):
    comments = serializers.SerializerMethodField()
    activities = serializers.SerializerMethodField()

    class Meta(TaskBaseSerializer.Meta):
        fields = TaskBaseSerializer.Meta.fields + ("comments", "activities")

    def get_comments(self, obj):
        comments = obj.comments.filter(parent__isnull=True).select_related("author").prefetch_related("attachments", "replies__author", "replies__attachments")
        return CommentSerializer(comments, many=True, context=self.context).data

    def get_activities(self, obj):
        activities = obj.activities.select_related("actor")[:50]
        return TaskActivitySerializer(activities, many=True).data


class CreateCommentSerializer(serializers.Serializer):
    body = serializers.CharField(max_length=5000)
    parent_id = serializers.IntegerField(required=False, allow_null=True)
    attachments = serializers.ListField(child=serializers.FileField(), write_only=True, required=False, allow_empty=True)

    def validate_attachments(self, files):
        allowed_types = {"image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"}
        for file in files:
            if getattr(file, "content_type", None) not in allowed_types:
                raise serializers.ValidationError("Only images and PDF files are allowed in comments.")
            if file.size > 10 * 1024 * 1024:
                raise serializers.ValidationError("Each attachment must be 10 MB or smaller.")
        return files


class TaskActivitySerializer(serializers.ModelSerializer):
    actor = UserSummarySerializer(read_only=True)

    class Meta:
        model = TaskActivity
        fields = ("id", "action", "detail", "actor", "created_at")
