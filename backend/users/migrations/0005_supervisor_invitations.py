import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('users', '0004_assignment_workflow')]
    operations = [
        migrations.AddField(model_name='customuser', name='department', field=models.CharField(blank=True, max_length=255, null=True)),
        migrations.AddField(model_name='customuser', name='staff_id', field=models.CharField(blank=True, max_length=50, null=True, unique=True)),
        migrations.CreateModel(
            name='SupervisorInvitation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('token_hash', models.CharField(max_length=128)),
                ('status', models.CharField(choices=[('PENDING', 'Pending'), ('ACTIVATED', 'Activated'), ('EXPIRED', 'Expired'), ('REVOKED', 'Revoked')], default='PENDING', max_length=16)),
                ('expires_at', models.DateTimeField()),
                ('activated_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('institution', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='supervisor_invitations', to='institutions.institution')),
                ('invited_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='sent_supervisor_invitations', to=settings.AUTH_USER_MODEL)),
                ('supervisor', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='supervisor_invitation', to=settings.AUTH_USER_MODEL)),
            ],
            options={'ordering': ['-created_at']},
        ),
    ]
