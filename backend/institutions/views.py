from rest_framework import viewsets, permissions
from .models import Institution
from .serializers import InstitutionSerializer
from siwes_api.permissions import IsPlatformAdmin

class InstitutionViewSet(viewsets.ModelViewSet):
    queryset = Institution.objects.all()
    serializer_class = InstitutionSerializer
    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [permissions.AllowAny()]
        return [IsPlatformAdmin()]
