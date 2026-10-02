from django.db import transaction
from django.db.models import Count, Q
from django.http import HttpResponse
from django.utils import timezone
from openpyxl import Workbook
from reportlab.lib.pagesizes import A4, landscape
from reportlab.pdfgen import canvas
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response

from .models import Comment, CommentAttachment, Task, TaskActivity
from .serializers import CreateCommentSerializer, CommentSerializer, TaskDetailSerializer, TaskListSerializer
from .services import CloudinaryUploadError, upload_to_cloudinary


class TaskQueryMixin:
    def filtered_tasks(self, queryset=None):
        queryset = Task.objects.all() if queryset is None else queryset
        params = self.request.query_params
        search = params.get("search", "").strip()
        if search:
            queryset = queryset.filter(Q(name__icontains=search) | Q(code__icontains=search))
        statuses = [item for item in params.get("status", "").split(",") if item]
        priorities = [item for item in params.get("priority", "").split(",") if item]
        if statuses:
            queryset = queryset.filter(status__in=statuses)
        if priorities:
            queryset = queryset.filter(priority__in=priorities)
        due_date_order = params.get("due_date_order")
        if due_date_order == "asc":
            return queryset.order_by("due_date", "priority_position")
        if due_date_order == "desc":
            return queryset.order_by("-due_date", "priority_position")
        return queryset.order_by("priority_position", "-created_at")


class TaskViewSet(TaskQueryMixin, viewsets.ModelViewSet):
    queryset = Task.objects.all()

    def get_queryset(self):
        queryset = Task.objects.select_related("created_by", "updated_by").prefetch_related("attachments")
        if self.action == "list":
            queryset = queryset.annotate(comment_count=Count("comments", distinct=True))
        return self.filtered_tasks(queryset)

    def get_serializer_class(self):
        return TaskDetailSerializer if self.action == "retrieve" else TaskListSerializer

    def get_permissions(self):
        if self.action in {"create", "update", "partial_update", "destroy", "reorder", "export"}:
            return [IsAdminUser()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        task = serializer.save()
        TaskActivity.objects.create(task=task, actor=self.request.user, action=TaskActivity.Action.CREATED, detail="Task created")

    def perform_update(self, serializer):
        task = serializer.save()
        TaskActivity.objects.create(task=task, actor=self.request.user, action=TaskActivity.Action.UPDATED, detail="Task details updated")

    @action(detail=True, methods=["patch"], url_path="status")
    def update_status(self, request, pk=None):
        task = self.get_object()
        new_status = request.data.get("status")
        valid_statuses = {choice for choice, _ in Task.Status.choices}
        if new_status not in valid_statuses:
            return Response({"status": "Choose a valid status."}, status=status.HTTP_400_BAD_REQUEST)
        if task.status == new_status:
            return Response(TaskListSerializer(task, context={"request": request}).data)
        old_status = task.get_status_display()
        task.status = new_status
        task.updated_by = request.user
        task.save(update_fields=["status", "updated_by", "updated_at"])
        TaskActivity.objects.create(
            task=task, actor=request.user, action=TaskActivity.Action.STATUS_CHANGED,
            detail=f"Moved from {old_status} to {task.get_status_display()}",
        )
        return Response(TaskListSerializer(task, context={"request": request}).data)

    @action(detail=False, methods=["post"])
    def reorder(self, request):
        """Reorder a supplied set while preserving the global positions of every other task."""
        ordered_ids = request.data.get("ordered_task_ids")
        if not isinstance(ordered_ids, list) or not ordered_ids:
            return Response({"ordered_task_ids": "Provide a non-empty list of task IDs."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            ordered_ids = [int(task_id) for task_id in ordered_ids]
        except (TypeError, ValueError):
            return Response({"ordered_task_ids": "Task IDs must be integers."}, status=status.HTTP_400_BAD_REQUEST)
        if len(set(ordered_ids)) != len(ordered_ids):
            return Response({"ordered_task_ids": "Task IDs must be unique."}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            selected = list(Task.objects.select_for_update().filter(id__in=ordered_ids).order_by("priority_position", "id"))
            if len(selected) != len(ordered_ids):
                return Response({"ordered_task_ids": "One or more tasks no longer exist."}, status=status.HTTP_400_BAD_REQUEST)
            slots = [task.priority_position for task in selected]
            by_id = {task.id: task for task in selected}
            for position, task_id in zip(slots, ordered_ids):
                task = by_id[task_id]
                task.priority_position = position
                task.updated_by = request.user
                task.updated_at = timezone.now()
            Task.objects.bulk_update(selected, ["priority_position", "updated_by", "updated_at"])
            TaskActivity.objects.bulk_create([
                TaskActivity(task=task, actor=request.user, action=TaskActivity.Action.REORDERED, detail="Priority order adjusted")
                for task in selected
            ])
        return Response({"detail": "Priority order saved."})

    @action(detail=True, methods=["post"], url_path="comments")
    def create_comment(self, request, pk=None):
        task = self.get_object()
        serializer = CreateCommentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        parent_id = serializer.validated_data.get("parent_id")
        parent = None
        if parent_id:
            parent = Comment.objects.filter(pk=parent_id, task=task).first()
            if not parent:
                return Response({"parent_id": "The parent comment belongs to another task or does not exist."}, status=status.HTTP_400_BAD_REQUEST)
        comment = Comment.objects.create(task=task, author=request.user, parent=parent, body=serializer.validated_data["body"])
        try:
            for file in serializer.validated_data.get("attachments", []):
                asset = upload_to_cloudinary(file, folder="task-board/comment-attachments", resource_type="auto")
                if asset:
                    CommentAttachment.objects.create(comment=comment, cloud_url=asset.url, cloud_public_id=asset.public_id, cloud_resource_type=asset.resource_type, original_filename=asset.filename)
                else:
                    CommentAttachment.objects.create(comment=comment, file=file, original_filename=file.name)
        except CloudinaryUploadError as exc:
            comment.delete()
            return Response({"attachments": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
        TaskActivity.objects.create(task=task, actor=request.user, action=TaskActivity.Action.COMMENTED, detail="Added a comment")
        comment = Comment.objects.select_related("author").prefetch_related("attachments").get(pk=comment.pk)
        return Response(CommentSerializer(comment, context={"request": request}).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"])
    def export(self, request):
        export_format = request.query_params.get("format", "xlsx")
        tasks = self.filtered_tasks(Task.objects.select_related("created_by"))
        if export_format == "xlsx":
            return self._excel_export(tasks)
        if export_format == "pdf":
            return self._pdf_export(tasks)
        return Response({"format": "Use 'xlsx' or 'pdf'."}, status=status.HTTP_400_BAD_REQUEST)

    def _excel_export(self, tasks):
        workbook = Workbook()
        worksheet = workbook.active
        worksheet.title = "Tasks"
        worksheet.append(["Code", "Name", "Description", "Due date", "Priority", "Status", "Created by"])
        for task in tasks:
            worksheet.append([task.code, task.name, task.description, task.due_date, task.get_priority_display(), task.get_status_display(), task.created_by.get_full_name() or task.created_by.username])
        for column, width in {"A": 14, "B": 32, "C": 55, "D": 15, "E": 12, "F": 16, "G": 22}.items():
            worksheet.column_dimensions[column].width = width
        response = HttpResponse(content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        response["Content-Disposition"] = 'attachment; filename="tasks.xlsx"'
        workbook.save(response)
        return response

    def _pdf_export(self, tasks):
        response = HttpResponse(content_type="application/pdf")
        response["Content-Disposition"] = 'attachment; filename="tasks.pdf"'
        page = canvas.Canvas(response, pagesize=landscape(A4))
        width, height = landscape(A4)
        y = height - 38
        page.setFont("Helvetica-Bold", 14)
        page.drawString(34, y, "Task Board Export")
        y -= 28
        page.setFont("Helvetica-Bold", 9)
        headings = [(34, "Code"), (105, "Name"), (310, "Due"), (390, "Priority"), (462, "Status"), (555, "Created by")]
        for x, label in headings:
            page.drawString(x, y, label)
        y -= 15
        page.setFont("Helvetica", 8)
        for task in tasks:
            if y < 34:
                page.showPage()
                y = height - 36
                page.setFont("Helvetica", 8)
            values = [task.code or "", task.name[:34], task.due_date.isoformat() if task.due_date else "—", task.get_priority_display(), task.get_status_display(), (task.created_by.get_full_name() or task.created_by.username)[:20]]
            for (x, _), value in zip(headings, values):
                page.drawString(x, y, str(value))
            y -= 14
        page.save()
        return response
