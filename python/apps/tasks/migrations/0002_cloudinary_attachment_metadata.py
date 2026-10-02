import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("tasks", "0001_initial")]

    operations = [
        migrations.AddField(model_name="taskattachment", name="cloud_public_id", field=models.CharField(blank=True, max_length=255)),
        migrations.AddField(model_name="taskattachment", name="cloud_resource_type", field=models.CharField(blank=True, max_length=16)),
        migrations.AddField(model_name="taskattachment", name="cloud_url", field=models.URLField(blank=True)),
        migrations.AddField(model_name="taskattachment", name="original_filename", field=models.CharField(blank=True, max_length=255)),
        migrations.AlterField(
            model_name="taskattachment",
            name="file",
            field=models.ImageField(blank=True, null=True, upload_to="task_attachments/%Y/%m/", validators=[django.core.validators.FileExtensionValidator(["jpg", "jpeg", "png", "gif", "webp"])]),
        ),
        migrations.AddField(model_name="commentattachment", name="cloud_public_id", field=models.CharField(blank=True, max_length=255)),
        migrations.AddField(model_name="commentattachment", name="cloud_resource_type", field=models.CharField(blank=True, max_length=16)),
        migrations.AddField(model_name="commentattachment", name="cloud_url", field=models.URLField(blank=True)),
        migrations.AddField(model_name="commentattachment", name="original_filename", field=models.CharField(blank=True, max_length=255)),
        migrations.AlterField(
            model_name="commentattachment",
            name="file",
            field=models.FileField(blank=True, null=True, upload_to="comment_attachments/%Y/%m/", validators=[django.core.validators.FileExtensionValidator(["jpg", "jpeg", "png", "gif", "webp", "pdf"])]),
        ),
    ]
