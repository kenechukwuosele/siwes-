from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.contrib.auth.hashers import check_password, make_password
from django.utils import timezone
from django.utils.crypto import get_random_string
from datetime import timedelta
from django.db import transaction
from django.db.models import Count, Q

from .models import AssignmentAudit, CustomUser, InstitutionNotification, SupervisorInvitation


def _capacity():
    return max(1, int(getattr(settings, 'SUPERVISOR_CAPACITY', 25)))


def invite_supervisor(institution, invited_by, data):
    email = data['email'].strip().lower()
    staff_id = data['staff_id'].strip()
    if CustomUser.objects.filter(email__iexact=email).exists() or CustomUser.objects.filter(staff_id=staff_id).exists():
        raise ValidationError(f'{email} or staff ID {staff_id} already belongs to an account.')
    username = staff_id
    if CustomUser.objects.filter(username=username).exists():
        raise ValidationError(f'Staff ID {staff_id} is already in use.')
    supervisor = CustomUser.objects.create_user(
        username=username, email=email, password=None, is_active=False,
        role=CustomUser.Role.SUPERVISOR, institution=institution, staff_id=staff_id,
        first_name=data.get('first_name', '').strip(), last_name=data.get('last_name', '').strip(),
        department=data.get('department', '').strip(),
    )
    token = get_random_string(48)
    invitation = SupervisorInvitation.objects.create(
        institution=institution, supervisor=supervisor, invited_by=invited_by,
        token_hash=make_password(token), expires_at=timezone.now() + timedelta(days=7),
    )
    activation_url = f"{getattr(settings, 'FRONTEND_URL', 'http://localhost:3000').rstrip('/')}/activate-supervisor?token={token}"
    if getattr(settings, 'SUPERVISOR_INVITATION_EMAIL_ENABLED', False):
        send_mail('Activate your SIWES supervisor account', f'Activate your account: {activation_url}', settings.DEFAULT_FROM_EMAIL, [email], fail_silently=True)
    return invitation, activation_url


def activate_supervisor(token, password):
    for invitation in SupervisorInvitation.objects.filter(status=SupervisorInvitation.Status.PENDING).select_related('supervisor'):
        if check_password(token, invitation.token_hash):
            if invitation.expires_at <= timezone.now():
                invitation.status = SupervisorInvitation.Status.EXPIRED
                invitation.save(update_fields=['status'])
                raise ValidationError('This invitation has expired.')
            supervisor = invitation.supervisor
            supervisor.set_password(password)
            supervisor.is_active = True
            supervisor.save(update_fields=['password', 'is_active'])
            invitation.status = SupervisorInvitation.Status.ACTIVATED
            invitation.activated_at = timezone.now()
            invitation.save(update_fields=['status', 'activated_at'])
            return supervisor
    raise ValidationError('This invitation is invalid.')


def _assigned_count(supervisor):
    return supervisor.assigned_students.filter(
        role=CustomUser.Role.STUDENT,
        assignment_status=CustomUser.AssignmentStatus.ASSIGNED,
    ).count()


def _notify_awaiting_assignment(student):
    administrators = CustomUser.objects.filter(
        role=CustomUser.Role.INSTITUTION_ADMIN,
        institution=student.institution,
        is_active=True,
    )
    notifications = InstitutionNotification.objects.bulk_create([
        InstitutionNotification(
            recipient=administrator,
            student=student,
            message=f'{student.get_full_name() or student.username} is awaiting supervisor assignment.',
        )
        for administrator in administrators
    ])
    if getattr(settings, 'ASSIGNMENT_NOTIFICATION_EMAIL_ENABLED', False):
        for notification in notifications:
            if notification.recipient.email:
                send_mail('SIWES assignment requires attention', notification.message, settings.DEFAULT_FROM_EMAIL, [notification.recipient.email], fail_silently=True)


def automatically_assign_student(student):
    """Assign the least-loaded active in-institution supervisor, deterministically by ID."""
    if student.role != CustomUser.Role.STUDENT or not student.institution_id:
        return student

    with transaction.atomic():
        supervisors = (
            CustomUser.objects.select_for_update()
            .filter(role=CustomUser.Role.SUPERVISOR, institution_id=student.institution_id, is_active=True)
            .annotate(assignment_count=Count(
                'assigned_students',
                filter=Q(
                    assigned_students__role=CustomUser.Role.STUDENT,
                    assigned_students__assignment_status=CustomUser.AssignmentStatus.ASSIGNED,
                ),
            ))
            .filter(assignment_count__lt=_capacity())
            .order_by('assignment_count', 'id')
        )
        supervisor = supervisors.first()
        if supervisor:
            student.assigned_supervisor = supervisor
            student.assignment_status = CustomUser.AssignmentStatus.ASSIGNED
            student.save(update_fields=['assigned_supervisor', 'assignment_status'])
            AssignmentAudit.objects.create(
                student=student,
                new_supervisor=supervisor,
                action=AssignmentAudit.Action.AUTO_ASSIGNED,
                reason='Least-loaded eligible supervisor selected automatically.',
            )
        else:
            student.assigned_supervisor = None
            student.assignment_status = CustomUser.AssignmentStatus.AWAITING
            student.save(update_fields=['assigned_supervisor', 'assignment_status'])
            AssignmentAudit.objects.create(
                student=student,
                action=AssignmentAudit.Action.AWAITING_ASSIGNMENT,
                reason='No active same-institution supervisor had available capacity.',
            )
            transaction.on_commit(lambda: _notify_awaiting_assignment(student))
    return student


def manually_assign_student(student, supervisor, assigned_by, reason='', force=False):
    if force and not reason.strip():
        raise ValidationError('A reason is required when overriding supervisor capacity.')
    with transaction.atomic():
        student = CustomUser.objects.select_for_update().get(pk=student.pk)
        supervisor = CustomUser.objects.select_for_update().get(pk=supervisor.pk)
        return _manually_assign_locked(student, supervisor, assigned_by, reason, force)


def _manually_assign_locked(student, supervisor, assigned_by, reason, force):
    if student.role != CustomUser.Role.STUDENT or supervisor.role != CustomUser.Role.SUPERVISOR:
        raise ValidationError('Only students can be assigned to supervisors.')
    if not student.institution_id or student.institution_id != supervisor.institution_id:
        raise ValidationError('Students may only be assigned to supervisors in their own institution.')
    if not supervisor.is_active:
        raise ValidationError('Inactive supervisors cannot receive assignments.')
    if student.assigned_supervisor_id != supervisor.id and _assigned_count(supervisor) >= _capacity() and not force:
        raise ValidationError('This supervisor is at capacity. Use an authorized override to continue.')

    previous_supervisor = student.assigned_supervisor
    student.assigned_supervisor = supervisor
    student.assignment_status = CustomUser.AssignmentStatus.ASSIGNED
    student.full_clean()
    student.save(update_fields=['assigned_supervisor', 'assignment_status'])
    AssignmentAudit.objects.create(
        student=student,
        previous_supervisor=previous_supervisor,
        new_supervisor=supervisor,
        assigned_by=assigned_by,
        action=AssignmentAudit.Action.MANUAL_ASSIGNED,
        reason=reason or 'Manual administrator assignment.',
    )
    return student
