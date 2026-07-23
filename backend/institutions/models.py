from django.db import models
import re

class Institution(models.Model):
    name = models.CharField(max_length=255)
    normalized_name = models.CharField(max_length=255, unique=True, editable=False)
    code = models.CharField(max_length=50, unique=True)
    address = models.TextField(blank=True, null=True)
    brand_color = models.CharField(max_length=7, default='#10b981', help_text="Hex code of the school's primary color")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        self.name = ' '.join(self.name.split())
        self.normalized_name = re.sub(r'\s+', ' ', self.name).casefold()
        super().save(*args, **kwargs)
