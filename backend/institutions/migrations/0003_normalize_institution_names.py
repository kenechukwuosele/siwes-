from django.db import migrations, models


def normalize_institutions(apps, schema_editor):
    Institution = apps.get_model('institutions', 'Institution')
    User = apps.get_model('users', 'CustomUser')
    canonical_by_name = {}
    for institution in Institution.objects.order_by('id'):
        normalized = ' '.join(institution.name.split()).casefold()
        canonical = canonical_by_name.get(normalized)
        if canonical:
            User.objects.filter(institution_id=institution.id).update(institution_id=canonical.id)
            institution.delete()
            continue
        institution.name = ' '.join(institution.name.split())
        institution.normalized_name = normalized
        institution.save(update_fields=['name', 'normalized_name'])
        canonical_by_name[normalized] = institution


class Migration(migrations.Migration):
    dependencies = [('institutions', '0002_institution_brand_color'), ('users', '0004_assignment_workflow')]

    operations = [
        migrations.AddField(model_name='institution', name='normalized_name', field=models.CharField(default='', editable=False, max_length=255)),
        migrations.RunPython(normalize_institutions, migrations.RunPython.noop),
        migrations.AlterField(model_name='institution', name='normalized_name', field=models.CharField(editable=False, max_length=255, unique=True)),
    ]
