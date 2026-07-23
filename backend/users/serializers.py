from rest_framework import serializers
from django.contrib.auth import get_user_model
from institutions.serializers import InstitutionSerializer
from institutions.models import Institution
from .services import automatically_assign_student
from .models import InstitutionNotification, SupervisorInvitation

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    institution_details = InstitutionSerializer(source='institution', read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'first_name', 'last_name', 
                  'matric_number', 'course', 'placement_org', 'institution', 'institution_details', 'assigned_supervisor', 'assignment_status', 'is_active',
                  'acceptance_letter', 'date_joined']
        read_only_fields = ['id', 'username', 'role', 'institution', 'assigned_supervisor', 'assignment_status', 'is_active', 'date_joined']

    def validate_acceptance_letter(self, value):
        if value and value.size > 5 * 1024 * 1024:
            raise serializers.ValidationError("Acceptance letters must be 5 MB or smaller.")
        return value


class InstitutionNotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = InstitutionNotification
        fields = ['id', 'student', 'message', 'is_read', 'created_at']
        read_only_fields = fields


class SupervisorInvitationSerializer(serializers.ModelSerializer):
    supervisor_name = serializers.SerializerMethodField()
    class Meta:
        model = SupervisorInvitation
        fields = ['id', 'supervisor_name', 'status', 'expires_at', 'activated_at', 'created_at']

    def get_supervisor_name(self, obj):
        return obj.supervisor.get_full_name() or obj.supervisor.username

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    institution = serializers.PrimaryKeyRelatedField(queryset=Institution.objects.all(), required=True)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'role', 'first_name', 'last_name',
                  'matric_number', 'institution', 'course']

    def validate_role(self, value):
        # Staff accounts are provisioned by platform administrators, never self-registered.
        if value != User.Role.STUDENT:
            raise serializers.ValidationError("Only student self-registration is available.")
        return value
    
    def validate(self, data):
        role = data.get('role', User.Role.STUDENT)
        if role == 'STUDENT' and not data.get('matric_number'):
            raise serializers.ValidationError({"matric_number": "Matric number is required for students."})
                 
        return data

    def create(self, validated_data):
        role = validated_data.get('role', 'STUDENT')
        
        institution = validated_data.pop('institution')

        # Ensure non-student roles don't get student-specific fields
        matric_number = validated_data.get('matric_number') if role == 'STUDENT' else None
        course = validated_data.get('course') if role == 'STUDENT' else None

        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
            role=role,
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            matric_number=matric_number,
            institution=institution,
            course=course
        )
        automatically_assign_student(user)
        return user
