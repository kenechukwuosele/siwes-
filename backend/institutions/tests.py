from django.test import TestCase
from .models import Institution


class InstitutionPermissionTests(TestCase):
    def test_public_users_may_list_but_not_create_institutions(self):
        Institution.objects.create(name='Example University', code='EXU')
        self.assertEqual(self.client.get('/api/institutions/').status_code, 200)
        response = self.client.post('/api/institutions/', {'name': 'Unauthorized', 'code': 'NOPE'})
        self.assertEqual(response.status_code, 401)

# Create your tests here.
