from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse


def health_check(request):
    return JsonResponse({'status': 'ok'})


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/health/', health_check),
    path('api/v1/auth/', include('users.urls')),
    path('api/v1/banks/', include('banks.urls')),
    path('api/v1/statements/', include('statements.urls')),
    path('api/v1/accounting/', include('accounting.urls')),
    path('api/v1/reconciliation/', include('reconciliation.urls')),
    path('api/v1/reports/', include('reports.urls')),
]
