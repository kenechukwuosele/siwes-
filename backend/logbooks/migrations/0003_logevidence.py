from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [('logbooks', '0002_initial')]
    operations = [
        migrations.CreateModel(
            name='LogEvidence',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('image', models.ImageField(upload_to='logs/')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('log_entry', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='evidence_items', to='logbooks.logentry')),
            ],
            options={'ordering': ['id']},
        ),
    ]
