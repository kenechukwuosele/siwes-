from django.test import TestCase
from django.test import override_settings
from datetime import date
from io import BytesIO
from PIL import Image
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from institutions.models import Institution
from .models import CustomUser, InstitutionNotification
from .services import automatically_assign_student, manually_assign_student
from logbooks.models import LogEntry


class RegistrationAndPasswordTests(TestCase):
    def test_public_registration_cannot_create_supervisor(self):
        response = self.client.post('/api/auth/register/', {
            'username': 'staff1', 'email': 'staff@example.com', 'password': 'safe-password-123',
            'role': 'SUPERVISOR', 'institution': 'Example University',
        })
        self.assertEqual(response.status_code, 400)

    def test_password_change_requires_current_password(self):
        user = CustomUser.objects.create_user(username='student1', password='old-password-123')
        client = APIClient()
        client.force_authenticate(user)
        response = client.post('/api/users/change_password/', {
            'current_password': 'wrong-password', 'new_password': 'new-password-123',
        })
        self.assertEqual(response.status_code, 400)
        self.assertTrue(user.check_password('old-password-123'))


class AutomaticAssignmentTests(TestCase):
    def setUp(self):
        self.institution = Institution.objects.create(name='CU', code='CU')
        self.other_institution = Institution.objects.create(name='Babcock', code='BAB')
        self.admin = CustomUser.objects.create_user(
            username='cu-admin', password='password-123', role='INSTITUTION_ADMIN', institution=self.institution,
        )
        self.first_supervisor = CustomUser.objects.create_user(
            username='first-supervisor', password='password-123', role='SUPERVISOR', institution=self.institution,
        )
        self.second_supervisor = CustomUser.objects.create_user(
            username='second-supervisor', password='password-123', role='SUPERVISOR', institution=self.institution,
        )

    def test_uses_least_loaded_supervisor_and_deterministic_tie_breaker(self):
        student = CustomUser.objects.create_user(username='student-1', password='password-123', role='STUDENT', institution=self.institution)
        automatically_assign_student(student)
        student.refresh_from_db()
        self.assertEqual(student.assigned_supervisor, self.first_supervisor)
        self.assertEqual(student.assignment_status, 'ASSIGNED')

        student_two = CustomUser.objects.create_user(username='student-2', password='password-123', role='STUDENT', institution=self.institution)
        automatically_assign_student(student_two)
        student_two.refresh_from_db()
        self.assertEqual(student_two.assigned_supervisor, self.second_supervisor)

    @override_settings(SUPERVISOR_CAPACITY=1)
    def test_marks_student_awaiting_and_notifies_institution_admin_when_full(self):
        for index, supervisor in enumerate((self.first_supervisor, self.second_supervisor), start=1):
            student = CustomUser.objects.create_user(username=f'assigned-{index}', password='password-123', role='STUDENT', institution=self.institution)
            manually_assign_student(student, supervisor, self.admin)
        waiting_student = CustomUser.objects.create_user(username='waiting', password='password-123', role='STUDENT', institution=self.institution)
        with self.captureOnCommitCallbacks(execute=True):
            automatically_assign_student(waiting_student)
        waiting_student.refresh_from_db()
        self.assertEqual(waiting_student.assignment_status, 'AWAITING')
        self.assertTrue(InstitutionNotification.objects.filter(recipient=self.admin, student=waiting_student).exists())

    def test_manual_assignment_never_crosses_institutions(self):
        babcock_supervisor = CustomUser.objects.create_user(
            username='babcock-supervisor', password='password-123', role='SUPERVISOR', institution=self.other_institution,
        )
        student = CustomUser.objects.create_user(username='cu-student', password='password-123', role='STUDENT', institution=self.institution)
        with self.assertRaises(Exception):
            manually_assign_student(student, babcock_supervisor, self.admin)


class CompleteWorkflowTests(TestCase):
    def _image_upload(self):
        output = BytesIO()
        Image.new('RGB', (8, 8), color='green').save(output, format='PNG')
        return SimpleUploadedFile('evidence.png', output.getvalue(), content_type='image/png')

    def setUp(self):
        self.cu = Institution.objects.create(name='Covenant University', code='CU-WF')
        self.babcock = Institution.objects.create(name='Babcock University', code='BB-WF')
        self.cu_admin = CustomUser.objects.create_user(username='cu-admin-workflow', password='password-123', role='INSTITUTION_ADMIN', institution=self.cu)
        self.cu_supervisor = CustomUser.objects.create_user(username='cu-supervisor-workflow', password='password-123', role='SUPERVISOR', institution=self.cu)
        self.cu_supervisor_two = CustomUser.objects.create_user(username='cu-supervisor-two-workflow', password='password-123', role='SUPERVISOR', institution=self.cu)
        self.babcock_supervisor = CustomUser.objects.create_user(username='bb-supervisor-workflow', password='password-123', role='SUPERVISOR', institution=self.babcock)
        self.itf = CustomUser.objects.create_user(username='itf-workflow', password='password-123', role='ITF_OFFICER')

    def test_student_supervisor_itf_workflow_and_school_isolation(self):
        registration = self.client.post('/api/auth/register/', {
            'username': 'cu-student-workflow', 'email': 'student@cu.example', 'password': 'password-123',
            'role': 'STUDENT', 'first_name': 'CU', 'last_name': 'Student', 'matric_number': 'CU/001',
            'institution': self.cu.id, 'course': 'Computer Science',
        })
        self.assertEqual(registration.status_code, 201)
        student = CustomUser.objects.get(username='cu-student-workflow')
        self.assertEqual(student.assigned_supervisor, self.cu_supervisor)
        self.assertEqual(student.assignment_status, 'ASSIGNED')

        student_client = APIClient()
        student_client.force_authenticate(student)
        created_log = student_client.post('/api/logs/', {
            'date': date.today().isoformat(), 'week_number': 1,
            'activity_description': 'Configured the test workstation and documented the completed validation steps.',
            'evidence_image': self._image_upload(),
        }, format='multipart')
        self.assertEqual(created_log.status_code, 201)
        log = LogEntry.objects.get(pk=created_log.data['id'])
        self.assertEqual(log.status, 'PENDING')

        supervisor_client = APIClient()
        supervisor_client.force_authenticate(self.cu_supervisor)
        self.assertEqual(supervisor_client.get('/api/logs/').data[0]['id'], log.id)
        self.assertEqual(supervisor_client.patch(f'/api/logs/{log.id}/', {'status': 'APPROVED'}, format='json').status_code, 200)

        # An institution admin sees CU users but cannot read a Babcock student.
        babcock_student = CustomUser.objects.create_user(username='bb-student-workflow', password='password-123', role='STUDENT', institution=self.babcock, assigned_supervisor=self.babcock_supervisor, assignment_status='ASSIGNED')
        admin_client = APIClient()
        admin_client.force_authenticate(self.cu_admin)
        admin_usernames = {entry['username'] for entry in admin_client.get('/api/users/').data}
        self.assertIn(student.username, admin_usernames)
        self.assertNotIn(babcock_student.username, admin_usernames)
        reassignment = admin_client.post(
            f'/api/users/{student.id}/assign-supervisor/', {'supervisor_id': self.cu_supervisor_two.id}, format='json'
        )
        self.assertEqual(reassignment.status_code, 200)
        student.refresh_from_db()
        self.assertEqual(student.assigned_supervisor, self.cu_supervisor_two)
        cross_school_assignment = admin_client.post(
            f'/api/users/{student.id}/assign-supervisor/', {'supervisor_id': self.babcock_supervisor.id}, format='json'
        )
        self.assertEqual(cross_school_assignment.status_code, 400)

        # ITF sees the approved CU evidence nationally, but has no write access.
        itf_client = APIClient()
        itf_client.force_authenticate(self.itf)
        itf_logs = itf_client.get('/api/logs/')
        self.assertEqual(itf_logs.status_code, 200)
        self.assertIn(log.id, [entry['id'] for entry in itf_logs.data])
        self.assertTrue(next(entry for entry in itf_logs.data if entry['id'] == log.id)['evidence_available'])
        self.assertEqual(itf_client.get(f'/api/logs/{log.id}/evidence/').status_code, 200)
        self.assertEqual(itf_client.patch(f'/api/logs/{log.id}/', {'status': 'REJECTED'}, format='json').status_code, 403)

    def test_student_can_attach_multiple_protected_evidence_images(self):
        student = CustomUser.objects.create_user(username='multi-image-student', password='password-123', role='STUDENT', institution=self.cu, assigned_supervisor=self.cu_supervisor, assignment_status='ASSIGNED')
        client = APIClient()
        client.force_authenticate(student)
        response = client.post('/api/logs/', {
            'date': date.today().isoformat(), 'week_number': 1,
            'activity_description': 'Captured multiple site images to document the completed installation activity.',
            'evidence_images': [self._image_upload(), self._image_upload()],
        }, format='multipart')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(len(response.data['evidence_items']), 2)
        log_id = response.data['id']
        self.assertEqual(client.get(f"/api/logs/{log_id}/evidence/{response.data['evidence_items'][0]['id']}/").status_code, 200)

# Create your tests here.
