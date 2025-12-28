from rest_framework import generics, viewsets, permissions
from .models import CustomUser
from .serializers import UserSerializer, RegisterSerializer
from rest_framework.decorators import action
from rest_framework.response import Response

class RegisterView(generics.CreateAPIView):
    queryset = CustomUser.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = RegisterSerializer

class UserViewSet(viewsets.ModelViewSet):
    queryset = CustomUser.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'STUDENT':
            return CustomUser.objects.filter(id=user.id)
        elif user.role == 'SUPERVISOR':
            if user.institution:
                return CustomUser.objects.filter(institution=user.institution, role='STUDENT')
            return CustomUser.objects.none()
        return CustomUser.objects.all()

    @action(detail=False, methods=['GET', 'PATCH'])
    def me(self, request):
        serializer = self.get_serializer(request.user)
        if request.method == 'PATCH':
            serializer = self.get_serializer(request.user, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=400)
        return Response(serializer.data)
