from rest_framework import generics, viewsets, permissions
from .models import CustomUser, InstitutionNotification, SupervisorInvitation
from .serializers import InstitutionNotificationSerializer, SupervisorInvitationSerializer, UserSerializer, RegisterSerializer
from .services import activate_supervisor, invite_supervisor, manually_assign_student
import csv
import io
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import password_validation
from django.conf import settings

class RegisterView(generics.CreateAPIView):
    queryset = CustomUser.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = RegisterSerializer


class ActivateSupervisorView(generics.GenericAPIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        token = request.data.get('token', '')
        password = request.data.get('password', '')
        if not token or not password:
            return Response({'detail': 'Token and password are required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            password_validation.validate_password(password)
            activate_supervisor(token, password)
        except Exception as error:
            return Response({'detail': str(error)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'detail': 'Supervisor account activated.'})

class UserViewSet(viewsets.ModelViewSet):
    queryset = CustomUser.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return CustomUser.objects.all()
        if user.role == 'STUDENT':
            return CustomUser.objects.filter(id=user.id)
        elif user.role == 'SUPERVISOR':
            return CustomUser.objects.filter(assigned_supervisor=user, role='STUDENT')
        elif user.role == 'INSTITUTION_ADMIN' and user.institution_id:
            return CustomUser.objects.filter(institution=user.institution)
        return CustomUser.objects.none()

    def get_permissions(self):
        if self.action == 'create':
            return [permissions.IsAdminUser()]
        return [permissions.IsAuthenticated()]

    def perform_update(self, serializer):
        # A user may only update their own profile; staff retain controlled access.
        if not self.request.user.is_staff and serializer.instance != self.request.user:
            raise permissions.PermissionDenied("You may only update your own profile.")
        serializer.save()

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

    @action(detail=False, methods=['POST'])
    def change_password(self, request):
        current_password = request.data.get('current_password', '')
        new_password = request.data.get('new_password', '')
        if not request.user.check_password(current_password):
            return Response({'detail': 'Current password is incorrect.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            password_validation.validate_password(new_password, request.user)
        except Exception as error:
            return Response({'detail': list(error.messages)}, status=status.HTTP_400_BAD_REQUEST)
        request.user.set_password(new_password)
        request.user.save(update_fields=['password'])
        return Response({'detail': 'Password updated successfully.'})

    @action(detail=True, methods=['POST'], url_path='assign-supervisor')
    def assign_supervisor(self, request, pk=None):
        student = self.get_object()
        is_institution_admin = request.user.role == CustomUser.Role.INSTITUTION_ADMIN and request.user.institution_id == student.institution_id
        if not request.user.is_staff and not is_institution_admin:
            return Response({'detail': 'Administrator access is required.'}, status=status.HTTP_403_FORBIDDEN)
        supervisor_id = request.data.get('supervisor_id')
        if not supervisor_id:
            return Response({'supervisor_id': 'This field is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            supervisor = CustomUser.objects.get(pk=supervisor_id)
            force = request.data.get('force', False) in (True, 1, '1', 'true', 'True')
            if force and not (request.user.is_staff or is_institution_admin):
                return Response({'detail': 'Capacity override is not permitted.'}, status=status.HTTP_403_FORBIDDEN)
            student = manually_assign_student(
                student, supervisor, request.user,
                reason=request.data.get('reason', ''), force=force,
            )
        except CustomUser.DoesNotExist:
            return Response({'supervisor_id': 'Supervisor not found.'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as error:
            return Response({'detail': str(error)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(self.get_serializer(student).data)

    @action(detail=False, methods=['GET'])
    def notifications(self, request):
        notifications = InstitutionNotification.objects.filter(recipient=request.user)
        return Response(InstitutionNotificationSerializer(notifications, many=True).data)

    @action(detail=False, methods=['POST'], url_path=r'notifications/(?P<notification_id>[^/.]+)/read')
    def mark_notification_read(self, request, notification_id=None):
        updated = InstitutionNotification.objects.filter(pk=notification_id, recipient=request.user).update(is_read=True)
        if not updated:
            return Response({'detail': 'Notification not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response({'detail': 'Notification marked as read.'})

    @action(detail=False, methods=['GET'])
    def assignment_settings(self, request):
        return Response({'supervisor_capacity': settings.SUPERVISOR_CAPACITY})

    def _institution_admin_required(self, request):
        if request.user.role != CustomUser.Role.INSTITUTION_ADMIN or not request.user.institution_id:
            raise permissions.PermissionDenied('Only an institution administrator can manage supervisor invitations.')

    @action(detail=False, methods=['GET', 'POST'], url_path='supervisor-invitations')
    def supervisor_invitations(self, request):
        self._institution_admin_required(request)
        if request.method == 'GET':
            invitations = SupervisorInvitation.objects.filter(institution=request.user.institution).select_related('supervisor')
            return Response(SupervisorInvitationSerializer(invitations, many=True).data)
        supervisors = request.data.get('supervisors', [])
        if not isinstance(supervisors, list) or not supervisors:
            return Response({'supervisors': 'Provide at least one supervisor.'}, status=status.HTTP_400_BAD_REQUEST)
        created, errors = [], []
        for row in supervisors:
            required = ('first_name', 'last_name', 'email', 'staff_id')
            if not all(str(row.get(field, '')).strip() for field in required):
                errors.append({'row': row, 'detail': 'first_name, last_name, email, and staff_id are required.'})
                continue
            try:
                invitation, _ = invite_supervisor(request.user.institution, request.user, row)
                created.append(SupervisorInvitationSerializer(invitation).data)
            except Exception as error:
                errors.append({'row': row, 'detail': str(error)})
        return Response({'created': created, 'errors': errors}, status=status.HTTP_201_CREATED if created else status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['POST'], url_path='supervisor-invitations/import')
    def import_supervisor_invitations(self, request):
        self._institution_admin_required(request)
        csv_file = request.FILES.get('csv_file')
        if not csv_file:
            return Response({'csv_file': 'Upload a CSV file.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            rows = list(csv.DictReader(io.StringIO(csv_file.read().decode('utf-8-sig'))))
        except UnicodeDecodeError:
            return Response({'csv_file': 'CSV must be UTF-8 encoded.'}, status=status.HTTP_400_BAD_REQUEST)
        request._full_data = {'supervisors': rows}
        return self.supervisor_invitations(request)
