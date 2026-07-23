from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [("users", "0002_customuser_acceptance_letter")]

    operations = [
        migrations.AddField(
            model_name="customuser",
            name="assigned_supervisor",
            field=models.ForeignKey(
                blank=True,
                limit_choices_to={"role": "SUPERVISOR"},
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="assigned_students",
                to="users.customuser",
            ),
        ),
    ]
