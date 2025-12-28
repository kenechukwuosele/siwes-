from django.contrib.auth.models import AbstractUser
from django.db import models
from institutions.models import Institution

class CustomUser(AbstractUser):
    class Role(models.TextChoices):
        STUDENT = 'STUDENT', 'Student'
        SUPERVISOR = 'SUPERVISOR', 'Supervisor'
        ITF_OFFICER = 'ITF_OFFICER', 'ITF Officer'

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.STUDENT)
    
    # Student specific fields
    matric_number = models.CharField(max_length=50, blank=True, null=True, unique=True)
    institution = models.ForeignKey(Institution, on_delete=models.SET_NULL, null=True, blank=True, related_name='students')
    course = models.CharField(max_length=255, blank=True, null=True)
    placement_org = models.CharField(max_length=255, blank=True, null=True)
    acceptance_letter = models.FileField(upload_to='acceptance_letters/', blank=True, null=True)
    
    # Validation helper
    def is_student(self):
        return self.role == self.Role.STUDENT

    def __str__(self):
        return self.email or self.username
