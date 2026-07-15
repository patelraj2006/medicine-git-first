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
]

# Custom view to serve React app or show a helpful error if not built
from django.http import FileResponse, HttpResponseNotFound
import os

def serve_react(request, path=None):
    index_path = os.path.join(FRONTEND_DIST_DIR, 'index.html')
    if os.path.exists(index_path):
        return FileResponse(open(index_path, 'rb'))
    return HttpResponseNotFound(
        "<h1>404 Not Found - Frontend Not Built</h1>"
        "<p>The React frontend has not been built yet. If you are on Render, ensure your Build Command is set to <code>./render-build.sh</code>.</p>"
    )

urlpatterns.append(re_path(r'^.*$', serve_react))