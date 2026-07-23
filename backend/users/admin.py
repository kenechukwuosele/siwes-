from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import AssignmentAudit, CustomUser, InstitutionNotification

@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'role', 'institution', 'assigned_supervisor', 'assignment_status', 'is_active')
    list_filter = ('role', 'assignment_status', 'institution', 'is_active')
    search_fields = ('username', 'email', 'matric_number')
    fieldsets = UserAdmin.fieldsets + (
        ('SIWES', {'fields': ('role', 'institution', 'assigned_supervisor', 'assignment_status', 'matric_number', 'course', 'placement_org', 'acceptance_letter')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('SIWES', {'fields': ('role', 'institution', 'assigned_supervisor', 'assignment_status', 'matric_number', 'course', 'placement_org')}),
    )


@admin.register(AssignmentAudit)
class AssignmentAuditAdmin(admin.ModelAdmin):
    list_display = ('student', 'action', 'previous_supervisor', 'new_supervisor', 'assigned_by', 'created_at')
    list_filter = ('action', 'created_at')
    readonly_fields = ('student', 'previous_supervisor', 'new_supervisor', 'assigned_by', 'action', 'reason', 'created_at')


@admin.register(InstitutionNotification)
class InstitutionNotificationAdmin(admin.ModelAdmin):
    list_display = ('recipient', 'student', 'is_read', 'created_at')
    list_filter = ('is_read', 'created_at')
    readonly_fields = ('recipient', 'student', 'message', 'created_at')
