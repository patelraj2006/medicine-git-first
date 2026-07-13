import os
# pyrefly: ignore [missing-import]
from django.contrib import admin
# pyrefly: ignore [missing-import]
from django.urls import path, include, re_path
# pyrefly: ignore [missing-import]
from django.views.static import serve
# pyrefly: ignore [missing-import]
from django.conf import settings

# Build paths using pathlib Path objects and convert to string for serve
FRONTEND_DIST_DIR = settings.BASE_DIR.parent / 'frontend' / 'dist'

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('medicines.urls')),
    
    # Serve assets folder
    re_path(r'^assets/(?P<path>.*)$', serve, {
        'document_root': str(FRONTEND_DIST_DIR / 'assets')
    }),
    
    # Serve favicon and icons
    re_path(r'^favicon.svg$', serve, {
        'document_root': str(FRONTEND_DIST_DIR),
        'path': 'favicon.svg'
    }),
    re_path(r'^icons.svg$', serve, {
        'document_root': str(FRONTEND_DIST_DIR),
        'path': 'icons.svg'
    }),
    
    # Catch-all to serve index.html for React routing
    re_path(r'^.*$', serve, {
        'document_root': str(FRONTEND_DIST_DIR),
        'path': 'index.html'
    }),
]