from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone

from .models import ReconciliationSession, ReconciliationMatch, ReconciliationGap, SessionStatus, GapStatus
from .serializers import ReconciliationSessionSerializer, ReconciliationMatchSerializer, ReconciliationGapSerializer
from .matching_engine import ReconciliationEngine, calculate_match_score
from users.permissions import CanWrite, CanApprove
from statements.serializers import BankTransactionSerializer
from accounting.serializers import AccountingEntrySerializer


class ReconciliationSessionViewSet(viewsets.ModelViewSet):
    queryset = ReconciliationSession.objects.select_related(
        'bank_account__bank', 'journal', 'created_by', 'validated_by'
    ).all()
    serializer_class = ReconciliationSessionSerializer
    permission_classes = [IsAuthenticated, CanWrite]
    filterset_fields = ['status', 'bank_account', 'journal']
    search_fields = ['name']
    ordering_fields = ['created_at', 'period_start']

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def start_matching(self, request, pk=None):
        session = self.get_object()
        if session.status == SessionStatus.VALIDATED:
            return Response({'detail': 'Session déjà validée'}, status=status.HTTP_400_BAD_REQUEST)

        session.status = SessionStatus.IN_PROGRESS
        session.save()
        engine = ReconciliationEngine(session)
        count = engine.run_auto_match()
        return Response({'detail': f'{count} rapprochements automatiques créés'})

    @action(detail=True, methods=['post'])
    def validate(self, request, pk=None):
        session = self.get_object()
        if not request.user.can_approve:
            return Response({'detail': 'Permission insuffisante'}, status=status.HTTP_403_FORBIDDEN)
        session.status = SessionStatus.VALIDATED
        session.validated_by = request.user
        session.validated_at = timezone.now()
        session.save()
        return Response(ReconciliationSessionSerializer(session).data)

    @action(detail=True, methods=['get'])
    def unmatched_transactions(self, request, pk=None):
        session = self.get_object()
        from statements.models import BankTransaction
        qs = BankTransaction.objects.filter(
            statement__bank_account=session.bank_account,
            transaction_date__gte=session.period_start,
            transaction_date__lte=session.period_end,
            is_reconciled=False,
        )
        page = self.paginate_queryset(qs)
        if page is not None:
            return self.get_paginated_response(BankTransactionSerializer(page, many=True).data)
        return Response(BankTransactionSerializer(qs, many=True).data)

    @action(detail=True, methods=['get'])
    def unmatched_entries(self, request, pk=None):
        session = self.get_object()
        qs = session.journal.entries.filter(
            entry_date__gte=session.period_start,
            entry_date__lte=session.period_end,
            is_reconciled=False,
        )
        page = self.paginate_queryset(qs)
        if page is not None:
            return self.get_paginated_response(AccountingEntrySerializer(page, many=True).data)
        return Response(AccountingEntrySerializer(qs, many=True).data)

    @action(detail=True, methods=['get'])
    def suggest_matches(self, request, pk=None):
        session = self.get_object()
        tx_id = request.query_params.get('transaction_id')
        if not tx_id:
            return Response({'detail': 'transaction_id requis'}, status=status.HTTP_400_BAD_REQUEST)

        engine = ReconciliationEngine(session)
        suggestions = engine.suggest_matches(tx_id)
        return Response([
            {'score': score, 'entry': AccountingEntrySerializer(entry).data}
            for score, entry in suggestions
        ])


class ReconciliationMatchViewSet(viewsets.ModelViewSet):
    queryset = ReconciliationMatch.objects.select_related(
        'bank_transaction', 'accounting_entry', 'matched_by'
    ).all()
    serializer_class = ReconciliationMatchSerializer
    permission_classes = [IsAuthenticated, CanWrite]
    filterset_fields = ['session', 'is_manual']

    def perform_create(self, serializer):
        match = serializer.save(is_manual=True, matched_by=self.request.user)
        match.bank_transaction.is_reconciled = True
        match.bank_transaction.reconciliation_id = match.session.id
        match.bank_transaction.save(update_fields=['is_reconciled', 'reconciliation_id'])
        match.accounting_entry.is_reconciled = True
        match.accounting_entry.reconciliation_id = match.session.id
        match.accounting_entry.save(update_fields=['is_reconciled', 'reconciliation_id'])

    def perform_destroy(self, instance):
        instance.bank_transaction.is_reconciled = False
        instance.bank_transaction.reconciliation_id = None
        instance.bank_transaction.save(update_fields=['is_reconciled', 'reconciliation_id'])
        instance.accounting_entry.is_reconciled = False
        instance.accounting_entry.reconciliation_id = None
        instance.accounting_entry.save(update_fields=['is_reconciled', 'reconciliation_id'])
        instance.delete()


class ReconciliationGapViewSet(viewsets.ModelViewSet):
    queryset = ReconciliationGap.objects.select_related(
        'bank_transaction', 'accounting_entry', 'resolved_by'
    ).all()
    serializer_class = ReconciliationGapSerializer
    permission_classes = [IsAuthenticated, CanWrite]
    filterset_fields = ['session', 'gap_type', 'status']

    @action(detail=True, methods=['post'])
    def explain(self, request, pk=None):
        gap = self.get_object()
        justification = request.data.get('justification', '').strip()
        if not justification:
            return Response({'detail': 'Justification requise'}, status=status.HTTP_400_BAD_REQUEST)
        gap.status = GapStatus.EXPLIQUE
        gap.justification = justification
        gap.save()
        return Response(ReconciliationGapSerializer(gap).data)

    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        gap = self.get_object()
        gap.status = GapStatus.RESOLU
        gap.justification = request.data.get('justification', gap.justification)
        gap.resolved_by = request.user
        gap.save()
        return Response(ReconciliationGapSerializer(gap).data)
