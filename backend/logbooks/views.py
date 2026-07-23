from django.http import FileResponse
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from .models import LogEntry, LogEvidence
from .serializers import LogEntrySerializer, LogReviewSerializer

class LogEntryViewSet(viewsets.ModelViewSet):
    serializer_class = LogEntrySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ('update', 'partial_update') and (
            self.request.user.is_staff or self.request.user.role == 'SUPERVISOR'
        ):
            return LogReviewSerializer
        return LogEntrySerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return LogEntry.objects.all()
        if user.role == 'ITF_OFFICER':
            # ITF is a read-only national oversight role: only reviewed evidence is visible.
            return LogEntry.objects.filter(status=LogEntry.Status.APPROVED)
        if user.is_staff:
            return LogEntry.objects.all()
        if user.role == 'STUDENT':
            return LogEntry.objects.filter(student=user)
        if user.role == 'SUPERVISOR':
            return LogEntry.objects.filter(student__assigned_supervisor=user)
        return LogEntry.objects.none()

    def perform_create(self, serializer):
        if self.request.user.role != 'STUDENT':
            raise PermissionDenied("Only students may create log entries.")
        log = serializer.save(student=self.request.user)
        self._save_evidence(log)

    def perform_update(self, serializer):
        user = self.request.user
        log = serializer.instance
        if user.role == 'ITF_OFFICER':
            raise PermissionDenied("ITF officers have read-only access to approved logbooks.")
        if user.is_staff:
            log = serializer.save()
            self._save_evidence(log)
            return
        if user.role == 'STUDENT' and log.student_id == user.id:
            if log.status == LogEntry.Status.APPROVED:
                raise ValidationError("Approved log entries are locked.")
            log = serializer.save()
            self._save_evidence(log)
            return
        if user.role == 'SUPERVISOR' and log.student.assigned_supervisor_id == user.id:
            allowed_fields = {'status', 'supervisor_comment'}
            supplied_fields = set(serializer.validated_data)
            if not supplied_fields.issubset(allowed_fields):
                raise PermissionDenied("Supervisors may only review status and comments.")
            serializer.save()
            return
        raise PermissionDenied("You do not have permission to update this log entry.")

    def _save_evidence(self, log):
        files = self.request.FILES.getlist('evidence_images')
        if not files:
            return
        if len(files) + log.evidence_items.count() > 5:
            raise ValidationError('A log entry may contain at most five evidence images.')
        validator = LogEntrySerializer(context={'request': self.request})
        for uploaded_file in files:
            validator.validate_evidence_image(uploaded_file)
            LogEvidence.objects.create(log_entry=log, image=uploaded_file)

    def partial_update(self, request, *args, **kwargs):
        if request.user.role == 'STUDENT' and {'status', 'supervisor_comment'} & set(request.data):
            raise PermissionDenied("Students cannot review their own log entries.")
        return super().partial_update(request, *args, **kwargs)

    def perform_destroy(self, instance):
        if self.request.user.role == 'ITF_OFFICER':
            raise PermissionDenied("ITF officers cannot delete log entries.")
        if self.request.user.is_staff:
            instance.delete()
            return
        if self.request.user.role == 'STUDENT' and instance.student_id == self.request.user.id and instance.status != LogEntry.Status.APPROVED:
            instance.delete()
            return
        raise PermissionDenied("Only unapproved entries belonging to you can be deleted.")

    @action(detail=True, methods=['GET'], url_path='evidence')
    def evidence(self, request, pk=None):
        """Streams image evidence only after queryset-based role checks succeed."""
        log = self.get_object()
        if not log.evidence_image:
            raise ValidationError("This log entry has no evidence image.")
        return FileResponse(log.evidence_image.open('rb'), content_type='image/*')

    @action(detail=True, methods=['GET'], url_path=r'evidence/(?P<evidence_id>[^/.]+)')
    def evidence_item(self, request, pk=None, evidence_id=None):
        log = self.get_object()
        try:
            evidence = log.evidence_items.get(pk=evidence_id)
        except LogEvidence.DoesNotExist:
            raise ValidationError('Evidence image not found.')
        return FileResponse(evidence.image.open('rb'), content_type='image/*')
