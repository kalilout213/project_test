from django.urls import path
from .views import DashboardStatsView, ReconciliationReportView

urlpatterns = [
    path('dashboard/', DashboardStatsView.as_view(), name='dashboard'),
    path('reconciliation/<int:session_id>/', ReconciliationReportView.as_view(), name='reconciliation_report'),
]
