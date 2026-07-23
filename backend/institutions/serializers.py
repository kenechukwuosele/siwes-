from rest_framework import serializers
from .models import Institution
from logbooks.models import LogEntry

class InstitutionSerializer(serializers.ModelSerializer):
    active_students = serializers.SerializerMethodField()
    total_students = serializers.SerializerMethodField()
    approved_logs = serializers.SerializerMethodField()

    class Meta:
        model = Institution
        fields = ['id', 'name', 'code', 'brand_color', 'active_students', 'total_students', 'approved_logs']
        read_only_fields = ['code']

    def get_active_students(self, obj):
        return obj.students.count()

    def get_total_students(self, obj):
        return obj.students.count() # For now same as active

    def get_approved_logs(self, obj):
        return LogEntry.objects.filter(student__institution=obj, status='APPROVED').count()
