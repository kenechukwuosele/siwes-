from rest_framework import serializers
from .models import LogEntry
from users.serializers import UserSerializer

class LogEntrySerializer(serializers.ModelSerializer):
    student_details = UserSerializer(source='student', read_only=True)
    
    class Meta:
        model = LogEntry
        fields = ['id', 'student', 'student_details', 'date', 'week_number', 
                  'activity_description', 'evidence_image', 'status', 
                  'supervisor_comment', 'created_at']
        read_only_fields = ['id', 'student', 'created_at']

    def create(self, validated_data):
        # Automatically assign the request user as the student
        validated_data['student'] = self.context['request'].user
        return super().create(validated_data)
