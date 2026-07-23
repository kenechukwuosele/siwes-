from django.db import models
from django.conf import settings

class LogEntry(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'

    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='logs')
    date = models.DateField()
    week_number = models.PositiveIntegerField()
    activity_description = models.TextField()
    evidence_image = models.ImageField(upload_to='logs/', blank=True, null=True)
    
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    supervisor_comment = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f"{self.student.username} - {self.date}"


class LogEvidence(models.Model):
    log_entry = models.ForeignKey(LogEntry, on_delete=models.CASCADE, related_name='evidence_items')
    image = models.ImageField(upload_to='logs/')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['id']
