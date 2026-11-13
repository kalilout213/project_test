from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction as db_transaction

from .models import BankStatement, BankTransaction, StatementStatus
from .serializers import BankStatementSerializer, BankTransactionSerializer
from .import_service import get_import_service
from users.permissions import CanWrite


class BankStatementViewSet(viewsets.ModelViewSet):
    queryset = BankStatement.objects.select_related('bank_account__bank', 'imported_by').all()
    serializer_class = BankStatementSerializer
    permission_classes = [IsAuthenticated, CanWrite]
    filterset_fields = ['bank_account', 'file_format', 'status']
    search_fields = ['file_name', 'bank_account__account_name']
    ordering_fields = ['imported_at', 'period_start', 'period_end']

    @action(detail=False, methods=['post'])
    def upload(self, request):
        file = request.FILES.get('file')
        bank_account_id = request.data.get('bank_account')
        file_format = request.data.get('file_format', '').upper()

        if not file or not bank_account_id or not file_format:
            return Response(
                {'detail': 'Champs requis: file, bank_account, file_format'},
                status=status.HTTP_400_BAD_REQUEST
            )

        statement = BankStatement.objects.create(
            bank_account_id=bank_account_id,
            file_name=file.name,
            file_format=file_format,
            status=StatementStatus.PROCESSING,
            imported_by=request.user,
        )

        try:
            service = get_import_service(file_format)
            parsed = service.parse(file.read())

            if not parsed:
                raise ValueError('Aucune transaction trouvée dans le fichier')

            with db_transaction.atomic():
                tx_objects = [
                    BankTransaction(statement=statement, **tx_data)
                    for tx_data in parsed
                ]
                BankTransaction.objects.bulk_create(tx_objects)

                dates = [tx.transaction_date for tx in tx_objects if tx.transaction_date]
                total_debit = sum(tx.amount for tx in tx_objects if tx.transaction_type == 'DEBIT')
                total_credit = sum(tx.amount for tx in tx_objects if tx.transaction_type == 'CREDIT')

                statement.transaction_count = len(tx_objects)
                statement.total_debit = total_debit
                statement.total_credit = total_credit
                statement.period_start = min(dates) if dates else None
                statement.period_end = max(dates) if dates else None
                statement.status = StatementStatus.COMPLETED
                statement.save()

        except Exception as e:
            statement.status = StatementStatus.ERROR
            statement.error_message = str(e)
            statement.save()
            return Response(
                {'detail': f'Erreur lors de l\'import: {e}'},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY
            )

        return Response(BankStatementSerializer(statement).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'])
    def transactions(self, request, pk=None):
        statement = self.get_object()
        qs = statement.transactions.all()
        is_reconciled = request.query_params.get('is_reconciled')
        if is_reconciled is not None:
            qs = qs.filter(is_reconciled=is_reconciled.lower() == 'true')
        page = self.paginate_queryset(qs)
        if page is not None:
            return self.get_paginated_response(BankTransactionSerializer(page, many=True).data)
        return Response(BankTransactionSerializer(qs, many=True).data)


class BankTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = BankTransaction.objects.select_related('statement__bank_account').all()
    serializer_class = BankTransactionSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['statement', 'transaction_type', 'is_reconciled']
    search_fields = ['description', 'reference']
    ordering_fields = ['transaction_date', 'amount']
