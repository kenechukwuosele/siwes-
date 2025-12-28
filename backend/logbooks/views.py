from rest_framework import viewsets, permissions
from .models import LogEntry
from .serializers import LogEntrySerializer

class LogEntryViewSet(viewsets.ModelViewSet):
    serializer_class = LogEntrySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'STUDENT':
            return LogEntry.objects.filter(student=user)
        # Supervisors and ITF see all for MVP / or filtered by logic
        return LogEntry.objects.all()

    def perform_create(self, serializer):
        serializer.save(student=self.request.user)
