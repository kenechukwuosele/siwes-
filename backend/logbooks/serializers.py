from rest_framework import serializers
from .models import LogEntry, LogEvidence
from users.serializers import UserSerializer
from PIL import Image


class LogEvidenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = LogEvidence
        fields = ['id', 'created_at']

class LogEntrySerializer(serializers.ModelSerializer):
    student_details = UserSerializer(source='student', read_only=True)
    evidence_available = serializers.SerializerMethodField()
    evidence_items = LogEvidenceSerializer(many=True, read_only=True)
    
    class Meta:
        model = LogEntry
        fields = ['id', 'student', 'student_details', 'date', 'week_number',
                  'activity_description', 'evidence_image', 'evidence_available', 'evidence_items', 'status',
                  'supervisor_comment', 'created_at', 'updated_at']
        read_only_fields = ['id', 'student', 'status', 'supervisor_comment', 'created_at', 'updated_at', 'evidence_available', 'evidence_items']
        extra_kwargs = {'evidence_image': {'write_only': True, 'required': False}}

    def get_evidence_available(self, obj):
        return bool(obj.evidence_image)

    def validate_week_number(self, value):
        if not 1 <= value <= 52:
            raise serializers.ValidationError("Week number must be between 1 and 52.")
        return value

    def validate_activity_description(self, value):
        value = value.strip()
        if len(value) < 20:
            raise serializers.ValidationError("Describe the activity in at least 20 characters.")
        return value

    def validate_evidence_image(self, value):
        if value.size > 5 * 1024 * 1024:
            raise serializers.ValidationError("Evidence images must be 5 MB or smaller.")
        try:
            image = Image.open(value)
            image.verify()
        except Exception as error:
            raise serializers.ValidationError("Upload a valid image file.") from error
        finally:
            value.seek(0)
        return value

    def create(self, validated_data):
        # Automatically assign the request user as the student
        validated_data['student'] = self.context['request'].user
        return super().create(validated_data)


class LogReviewSerializer(LogEntrySerializer):
    """Review fields are deliberately writable only in the supervisor/admin endpoint path."""

    class Meta(LogEntrySerializer.Meta):
        read_only_fields = ['id', 'student', 'created_at', 'updated_at']
