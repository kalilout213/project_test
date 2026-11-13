from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Count, Q
from django.utils import timezone
from datetime import timedelta, date
import calendar

from banks.models import BankAccount
from statements.models import BankTransaction, BankStatement
from accounting.models import AccountingEntry
from reconciliation.models import ReconciliationSession, ReconciliationMatch, ReconciliationGap


class DashboardStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = date.today()
        month_start = today.replace(day=1)

        total_accounts = BankAccount.objects.filter(is_active=True).count()
        total_sessions = ReconciliationSession.objects.count()
        validated_sessions = ReconciliationSession.objects.filter(status='VALIDATED').count()

        pending_gaps = ReconciliationGap.objects.filter(status='OUVERT').count()
        reconciled_this_month = ReconciliationMatch.objects.filter(
            matched_at__date__gte=month_start
        ).count()

        # Monthly data (last 6 months)
        monthly_data = []
        for i in range(5, -1, -1):
            d = today - timedelta(days=i * 30)
            m_start = d.replace(day=1)
            _, last_day = calendar.monthrange(d.year, d.month)
            m_end = d.replace(day=last_day)

            matches = ReconciliationMatch.objects.filter(
                matched_at__date__gte=m_start,
                matched_at__date__lte=m_end,
            ).count()

            gaps = ReconciliationGap.objects.filter(
                created_at__date__gte=m_start,
                created_at__date__lte=m_end,
                status='OUVERT',
            ).count()

            monthly_data.append({
                'month': m_start.strftime('%b %Y'),
                'matches': matches,
                'gaps': gaps,
            })

        # Bank accounts summary
        accounts = BankAccount.objects.filter(is_active=True).select_related('bank', 'currency')
        accounts_data = []
        for acc in accounts:
            last_stmt = acc.statements.filter(status='COMPLETED').order_by('-period_end').first()
            sessions_count = acc.reconciliation_sessions.count()
            accounts_data.append({
                'id': acc.id,
                'name': acc.account_name,
                'bank': acc.bank.name,
                'currency': acc.currency.code,
                'last_statement': last_stmt.period_end.isoformat() if last_stmt else None,
                'sessions_count': sessions_count,
            })

        # Recent sessions
        recent_sessions = ReconciliationSession.objects.select_related(
            'bank_account__bank', 'journal', 'created_by'
        ).order_by('-created_at')[:5]

        sessions_data = []
        for s in recent_sessions:
            match_count = s.matches.count()
            gap_count = s.gaps.filter(status='OUVERT').count()
            total = match_count + gap_count
            progress = round((match_count / total) * 100) if total > 0 else 0
            sessions_data.append({
                'id': s.id,
                'name': s.name,
                'status': s.status,
                'bank_account': s.bank_account.account_name,
                'bank': s.bank_account.bank.name,
                'period_start': s.period_start.isoformat(),
                'period_end': s.period_end.isoformat(),
                'match_count': match_count,
                'gap_count': gap_count,
                'progress': progress,
                'created_by': s.created_by.full_name,
                'created_at': s.created_at.isoformat(),
            })

        return Response({
            'kpis': {
                'total_accounts': total_accounts,
                'total_sessions': total_sessions,
                'validated_sessions': validated_sessions,
                'pending_gaps': pending_gaps,
                'reconciled_this_month': reconciled_this_month,
                'validation_rate': round((validated_sessions / total_sessions) * 100) if total_sessions > 0 else 0,
            },
            'monthly_data': monthly_data,
            'accounts': accounts_data,
            'recent_sessions': sessions_data,
        })


class ReconciliationReportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, session_id):
        try:
            session = ReconciliationSession.objects.select_related(
                'bank_account__bank', 'journal', 'created_by', 'validated_by'
            ).get(id=session_id)
        except ReconciliationSession.DoesNotExist:
            return Response({'detail': 'Session introuvable'}, status=404)

        matches = session.matches.select_related('bank_transaction', 'accounting_entry', 'matched_by').all()
        gaps = session.gaps.select_related('bank_transaction', 'accounting_entry').all()

        total_matched_amount = sum(
            abs(m.bank_transaction.amount) for m in matches
        )
        total_gap_amount = sum(
            abs(g.bank_transaction.amount) if g.bank_transaction else
            abs(g.accounting_entry.amount) if g.accounting_entry else 0
            for g in gaps
        )

        return Response({
            'session': {
                'id': session.id,
                'name': session.name,
                'status': session.status,
                'period_start': session.period_start.isoformat(),
                'period_end': session.period_end.isoformat(),
                'bank_account': session.bank_account.account_name,
                'bank': session.bank_account.bank.name,
                'journal': session.journal.name,
                'created_by': session.created_by.full_name,
                'validated_by': session.validated_by.full_name if session.validated_by else None,
                'validated_at': session.validated_at.isoformat() if session.validated_at else None,
            },
            'summary': {
                'match_count': matches.count(),
                'gap_count': gaps.count(),
                'open_gaps': gaps.filter(status='OUVERT').count(),
                'total_matched_amount': float(total_matched_amount),
                'total_gap_amount': float(total_gap_amount),
                'auto_matches': matches.filter(is_manual=False).count(),
                'manual_matches': matches.filter(is_manual=True).count(),
            },
            'gap_breakdown': {
                'banque_sans_compta': gaps.filter(gap_type='BANQUE_SANS_COMPTA').count(),
                'compta_sans_banque': gaps.filter(gap_type='COMPTA_SANS_BANQUE').count(),
                'montant_different': gaps.filter(gap_type='MONTANT_DIFFERENT').count(),
                'date_differente': gaps.filter(gap_type='DATE_DIFFERENTE').count(),
            },
        })
