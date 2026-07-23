from django.test import TestCase
from rest_framework.test import APIClient
from users.models import CustomUser
from .models import LogEntry


class LogEntryPermissionTests(TestCase):
    def setUp(self):
        self.student = CustomUser.objects.create_user(username='student', password='password-123', role='STUDENT')
        self.supervisor = CustomUser.objects.create_user(username='supervisor', password='password-123', role='SUPERVISOR')
        self.other_supervisor = CustomUser.objects.create_user(username='other-supervisor', password='password-123', role='SUPERVISOR')
        self.student.assigned_supervisor = self.supervisor
        self.student.save(update_fields=['assigned_supervisor'])
        self.log = LogEntry.objects.create(student=self.student, date='2026-07-21', week_number=1, activity_description='Configured and tested the production deployment environment.')

    def test_student_cannot_approve_own_entry(self):
        client = APIClient()
        client.force_authenticate(self.student)
        response = client.patch(f'/api/logs/{self.log.id}/', {'status': 'APPROVED'}, format='json')
        self.assertEqual(response.status_code, 403)

    def test_assigned_supervisor_can_review_entry(self):
        client = APIClient()
        client.force_authenticate(self.supervisor)
        response = client.patch(f'/api/logs/{self.log.id}/', {'status': 'APPROVED'}, format='json')
        self.assertEqual(response.status_code, 200)
        self.log.refresh_from_db()
        self.assertEqual(self.log.status, 'APPROVED')

    def test_unassigned_supervisor_cannot_access_entry(self):
        client = APIClient()
        client.force_authenticate(self.other_supervisor)
        response = client.get(f'/api/logs/{self.log.id}/')
        self.assertEqual(response.status_code, 404)

    def test_itf_can_only_read_approved_logs_across_institutions(self):
        itf = CustomUser.objects.create_user(username='itf', password='password-123', role='ITF_OFFICER')
        approved = LogEntry.objects.create(
            student=self.student, date='2026-07-22', week_number=1,
            activity_description='Completed the approved national oversight demonstration activity.',
            status='APPROVED',
        )
        client = APIClient()
        client.force_authenticate(itf)
        response = client.get('/api/logs/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual([entry['id'] for entry in response.data], [approved.id])
        self.assertEqual(client.patch(f'/api/logs/{approved.id}/', {'status': 'REJECTED'}, format='json').status_code, 403)

# Create your tests here.
