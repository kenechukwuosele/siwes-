from rest_framework import serializers
from django.contrib.auth import get_user_model
from institutions.serializers import InstitutionSerializer
from institutions.models import Institution

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    institution_details = InstitutionSerializer(source='institution', read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'first_name', 'last_name', 
                  'matric_number', 'course', 'placement_org', 'institution', 'institution_details',
                  'acceptance_letter', 'date_joined']
        read_only_fields = ['id']

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    institution = serializers.CharField(required=False, allow_blank=True)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'role', 'first_name', 'last_name', 
                  'matric_number', 'institution', 'course']
    
    def validate(self, data):
        role = data.get('role', 'STUDENT')
        if role in ['STUDENT', 'SUPERVISOR']:
            if not data.get('institution'):
                raise serializers.ValidationError({"institution": "Institution is required for students and supervisors."})
            
            if role == 'STUDENT' and not data.get('matric_number'):
                 raise serializers.ValidationError({"matric_number": "Matric number is required for students."})
                 
        elif role == 'ITF_OFFICER':
             # ITF Officers should not have matric_number or institution (usually independent)
            if data.get('matric_number'):
                raise serializers.ValidationError({"matric_number": "ITF Officers cannot have a matric number."})

        return data

    def create(self, validated_data):
        role = validated_data.get('role', 'STUDENT')
        
        institution = None
        if role in ['STUDENT', 'SUPERVISOR']:
            inst_name = validated_data.get('institution')
            if inst_name:
                import hashlib
                # Deterministic color generation
                hash_object = hashlib.md5(inst_name.encode())
                hex_dig = hash_object.hexdigest()
                color = f"#{hex_dig[:6]}"
                
                # Create or get institution
                # Generate a simple code if creating new
                from django.utils.text import slugify
                base_code = slugify(inst_name)[:40]
                code = f"{base_code}-{hex_dig[:4]}"
                
                institution, created = Institution.objects.get_or_create(
                    name=inst_name,
                    defaults={
                        'code': code,
                        'brand_color': color
                    }
                )

        # Ensure non-student roles don't get student-specific fields
        matric_number = validated_data.get('matric_number') if role == 'STUDENT' else None
        course = validated_data.get('course') if role == 'STUDENT' else None

        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
            role=role,
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            matric_number=matric_number,
            institution=institution,
            course=course
        )
        return user
