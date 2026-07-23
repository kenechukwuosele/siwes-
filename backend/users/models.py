from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.db import models
from institutions.models import Institution

class CustomUser(AbstractUser):
    class Role(models.TextChoices):
        STUDENT = 'STUDENT', 'Student'
        SUPERVISOR = 'SUPERVISOR', 'Supervisor'
        INSTITUTION_ADMIN = 'INSTITUTION_ADMIN', 'Institution Admin'
        ITF_OFFICER = 'ITF_OFFICER', 'ITF Officer'

    class AssignmentStatus(models.TextChoices):
        AWAITING = 'AWAITING', 'Awaiting Assignment'
        ASSIGNED = 'ASSIGNED', 'Assigned'

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.STUDENT)
    
    # Student specific fields
    matric_number = models.CharField(max_length=50, blank=True, null=True, unique=True)
    institution = models.ForeignKey(Institution, on_delete=models.SET_NULL, null=True, blank=True, related_name='students')
    assigned_supervisor = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='assigned_students', limit_choices_to={'role': Role.SUPERVISOR}
    )
    assignment_status = models.CharField(max_length=20, choices=AssignmentStatus.choices, default=AssignmentStatus.AWAITING)
    course = models.CharField(max_length=255, blank=True, null=True)
    staff_id = models.CharField(max_length=50, blank=True, null=True, unique=True)
    department = models.CharField(max_length=255, blank=True, null=True)
    placement_org = models.CharField(max_length=255, blank=True, null=True)
    acceptance_letter = models.FileField(upload_to='acceptance_letters/', blank=True, null=True)
    
    # Validation helper
    def is_student(self):
        return self.role == self.Role.STUDENT

    def clean(self):
        super().clean()
        if self.assigned_supervisor:
            if self.role != self.Role.STUDENT:
                raise ValidationError({'assigned_supervisor': 'Only students can be assigned to a supervisor.'})
            if self.assigned_supervisor.role != self.Role.SUPERVISOR:
                raise ValidationError({'assigned_supervisor': 'Assigned user must be a supervisor.'})
            if not self.institution_id or self.assigned_supervisor.institution_id != self.institution_id:
                raise ValidationError({'assigned_supervisor': 'Students and supervisors must belong to the same institution.'})

    def __str__(self):
        return self.email or self.username


class AssignmentAudit(models.Model):
    class Action(models.TextChoices):
        AUTO_ASSIGNED = 'AUTO_ASSIGNED', 'Automatically assigned'
        AWAITING_ASSIGNMENT = 'AWAITING_ASSIGNMENT', 'Awaiting assignment'
        MANUAL_ASSIGNED = 'MANUAL_ASSIGNED', 'Manually assigned'

    student = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='assignment_audits')
    previous_supervisor = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    new_supervisor = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    assigned_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    action = models.CharField(max_length=32, choices=Action.choices)
    reason = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']


class InstitutionNotification(models.Model):
    recipient = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='institution_notifications')
    student = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='assignment_notifications')
    message = models.CharField(max_length=255)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']


class SupervisorInvitation(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        ACTIVATED = 'ACTIVATED', 'Activated'
        EXPIRED = 'EXPIRED', 'Expired'
        REVOKED = 'REVOKED', 'Revoked'

    institution = models.ForeignKey(Institution, on_delete=models.CASCADE, related_name='supervisor_invitations')
    supervisor = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='supervisor_invitation')
    invited_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, related_name='sent_supervisor_invitations')
    token_hash = models.CharField(max_length=128)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    expires_at = models.DateTimeField()
    activated_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
