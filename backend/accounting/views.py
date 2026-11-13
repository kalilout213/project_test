from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction as db_transaction

from .models import AccountingJournal, AccountingEntry, AccountingImport
from .serializers import AccountingJournalSerializer, AccountingEntrySerializer, AccountingImportSerializer
from .import_service import get_accounting_import_service
from users.permissions import CanWrite, IsAdministrateurOrReadOnly


class AccountingJournalViewSet(viewsets.ModelViewSet):
    queryset = AccountingJournal.objects.select_related('bank_account').all()
    serializer_class = AccountingJournalSerializer
    permission_classes = [IsAuthenticated, IsAdministrateurOrReadOnly]
    filterset_fields = ['journal_type', 'is_active']
    search_fields = ['code', 'name']


class AccountingEntryViewSet(viewsets.ModelViewSet):
    queryset = AccountingEntry.objects.select_related('journal').all()
    serializer_class = AccountingEntrySerializer
    permission_classes = [IsAuthenticated, CanWrite]
    filterset_fields = ['journal', 'is_reconciled', 'account_code']
    search_fields = ['description', 'reference', 'piece_number', 'account_code']
    ordering_fields = ['entry_date', 'debit', 'credit']

    @action(detail=False, methods=['post'])
    def import_file(self, request):
        file = request.FILES.get('file')
        journal_id = request.data.get('journal')
        file_format = request.data.get('file_format', 'CSV').upper()

        if not file or not journal_id:
            return Response({'detail': 'Champs requis: file, journal'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            service = get_accounting_import_service(file_format)
            entries_data = service.parse(file.read(), journal_id)

            if not entries_data:
                return Response({'detail': 'Aucune écriture trouvée'}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)

            with db_transaction.atomic():
                from .models import AccountingEntry as AE
                objs = [AE(**d) for d in entries_data]
                AE.objects.bulk_create(objs)

                AccountingImport.objects.create(
                    journal_id=journal_id,
                    file_name=file.name,
                    imported_by=request.user,
                    entry_count=len(objs),
                )

            return Response({'detail': f'{len(objs)} écritures importées'}, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
