import csv
import io
from decimal import Decimal, InvalidOperation
from dateutil import parser as date_parser
import openpyxl


COLUMN_MAPPINGS = {
    'date': ['date', 'date écriture', 'date ecriture', 'date_ecriture', 'date pièce', 'date piece'],
    'piece': ['pièce', 'piece', 'numéro pièce', 'num pièce', 'n° pièce', 'piece_number'],
    'account_code': ['compte', 'code compte', 'n° compte', 'account', 'account_code'],
    'account_label': ['intitulé', 'intitule', 'libellé compte', 'account label'],
    'description': ['libellé', 'libelle', 'description', 'motif', 'wording'],
    'reference': ['référence', 'reference', 'ref', 'id'],
    'debit': ['débit', 'debit', 'montant débit'],
    'credit': ['crédit', 'credit', 'montant crédit'],
}


def _find_col(headers, key):
    aliases = COLUMN_MAPPINGS.get(key, [])
    for h in headers:
        if h.strip().lower() in aliases:
            return h
    return None


def _parse_decimal(v):
    if not v:
        return Decimal('0')
    cleaned = str(v).replace(' ', '').replace('\xa0', '').replace(',', '.').replace('−', '-')
    try:
        return Decimal(cleaned)
    except InvalidOperation:
        return Decimal('0')


def _parse_date(v):
    if not v:
        return None
    try:
        return date_parser.parse(str(v), dayfirst=True).date()
    except Exception:
        return None


def _build_entries(rows, journal_id):
    entries = []
    for row in rows:
        entry_date = _parse_date(row.get('date'))
        if not entry_date:
            continue
        entries.append({
            'journal_id': journal_id,
            'entry_date': entry_date,
            'piece_number': str(row.get('piece', '')).strip(),
            'account_code': str(row.get('account_code', '')).strip(),
            'account_label': str(row.get('account_label', '')).strip(),
            'description': str(row.get('description', '')).strip(),
            'reference': str(row.get('reference', '')).strip(),
            'debit': _parse_decimal(row.get('debit')),
            'credit': _parse_decimal(row.get('credit')),
        })
    return entries


class AccountingCSVImportService:
    def parse(self, file_content, journal_id):
        content = file_content.decode('utf-8-sig') if isinstance(file_content, bytes) else file_content
        dialect = csv.Sniffer().sniff(content[:2048], delimiters=',;|\t')
        reader = csv.DictReader(io.StringIO(content), dialect=dialect)
        headers = reader.fieldnames or []
        col_map = {key: _find_col(headers, key) for key in COLUMN_MAPPINGS}
        rows = []
        for r in reader:
            row = {key: r.get(col, '') if col else '' for key, col in col_map.items()}
            rows.append(row)
        return _build_entries(rows, journal_id)


class AccountingExcelImportService:
    def parse(self, file_content, journal_id):
        wb = openpyxl.load_workbook(io.BytesIO(file_content), read_only=True, data_only=True)
        ws = wb.active
        rows_iter = ws.iter_rows(values_only=True)
        headers = [str(h).strip() if h else '' for h in next(rows_iter, [])]
        col_map = {key: _find_col(headers, key) for key in COLUMN_MAPPINGS}
        rows = []
        for rv in rows_iter:
            if all(v is None for v in rv):
                continue
            rd = dict(zip(headers, rv))
            row = {key: rd.get(col, '') if col else '' for key, col in col_map.items()}
            rows.append(row)
        return _build_entries(rows, journal_id)


def get_accounting_import_service(file_format):
    if file_format.upper() in ('CSV', 'TEXT'):
        return AccountingCSVImportService()
    return AccountingExcelImportService()
