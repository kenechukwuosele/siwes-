from django.contrib import admin
from django.urls import path, include
from rest_framework import routers
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from users.views import RegisterView, UserViewSet
from logbooks.views import LogEntryViewSet
from institutions.views import InstitutionViewSet

router = routers.DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'logs', LogEntryViewSet, basename='logentry')
router.register(r'institutions', InstitutionViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Auth Endpoints
    path('api/auth/register/', RegisterView.as_view(), name='auth_register'),
    path('api/auth/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # API Router
    path('api/', include(router.urls)),
]
