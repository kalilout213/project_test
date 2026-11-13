import csv
import io
from decimal import Decimal, InvalidOperation
from datetime import date
import openpyxl
from dateutil import parser as date_parser


COLUMN_MAPPINGS = {
    'date': ['date', 'date opération', 'date operation', 'date_operation', 'op date', 'transaction date'],
    'value_date': ['date valeur', 'value date', 'valeur', 'date_valeur'],
    'description': ['libellé', 'libelle', 'description', 'motif', 'label', 'wording', 'narrative'],
    'debit': ['débit', 'debit', 'montant débit', 'sortie', 'retrait', 'withdrawal', 'amount debit'],
    'credit': ['crédit', 'credit', 'montant crédit', 'entrée', 'versement', 'dépôt', 'deposit', 'amount credit'],
    'amount': ['montant', 'amount', 'solde', 'balance'],
    'reference': ['référence', 'reference', 'ref', 'numéro', 'numero', 'id transaction'],
    'balance': ['solde après', 'balance after', 'running balance', 'solde'],
}


def _find_column(headers, key):
    aliases = COLUMN_MAPPINGS.get(key, [])
    for h in headers:
        if h.strip().lower() in aliases:
            return h
    return None


def _parse_decimal(value):
    if not value:
        return None
    cleaned = str(value).replace(' ', '').replace('\xa0', '').replace(',', '.').replace('−', '-')
    try:
        return Decimal(cleaned)
    except InvalidOperation:
        return None


def _parse_date(value):
    if not value:
        return None
    if isinstance(value, date):
        return value
    try:
        return date_parser.parse(str(value), dayfirst=True).date()
    except Exception:
        return None


def _build_transactions(rows):
    transactions = []
    for row in rows:
        tx_date = _parse_date(row.get('date'))
        if not tx_date:
            continue

        debit = _parse_decimal(row.get('debit'))
        credit = _parse_decimal(row.get('credit'))
        amount_raw = _parse_decimal(row.get('amount'))

        if debit and debit > 0:
            amount = debit
            tx_type = 'DEBIT'
        elif credit and credit > 0:
            amount = credit
            tx_type = 'CREDIT'
        elif amount_raw is not None:
            if amount_raw < 0:
                amount = abs(amount_raw)
                tx_type = 'DEBIT'
            else:
                amount = amount_raw
                tx_type = 'CREDIT'
        else:
            continue

        transactions.append({
            'transaction_date': tx_date,
            'value_date': _parse_date(row.get('value_date')),
            'description': str(row.get('description', '')).strip(),
            'reference': str(row.get('reference', '')).strip(),
            'amount': amount,
            'transaction_type': tx_type,
            'balance_after': _parse_decimal(row.get('balance')),
        })
    return transactions


class CSVImportService:
    def parse(self, file_content):
        content = file_content.decode('utf-8-sig') if isinstance(file_content, bytes) else file_content
        dialect = csv.Sniffer().sniff(content[:2048], delimiters=',;|\t')
        reader = csv.DictReader(io.StringIO(content), dialect=dialect)
        headers = reader.fieldnames or []
        col_map = {key: _find_column(headers, key) for key in COLUMN_MAPPINGS}

        rows = []
        for r in reader:
            row = {}
            for key, col in col_map.items():
                row[key] = r.get(col, '') if col else ''
            rows.append(row)
        return _build_transactions(rows)


class ExcelImportService:
    def parse(self, file_content):
        wb = openpyxl.load_workbook(io.BytesIO(file_content), read_only=True, data_only=True)
        ws = wb.active
        rows_iter = ws.iter_rows(values_only=True)
        headers = [str(h).strip() if h else '' for h in next(rows_iter, [])]
        col_map = {key: _find_column(headers, key) for key in COLUMN_MAPPINGS}

        rows = []
        for row_values in rows_iter:
            if all(v is None for v in row_values):
                continue
            row_dict = dict(zip(headers, row_values))
            row = {}
            for key, col in col_map.items():
                row[key] = row_dict.get(col, '') if col else ''
            rows.append(row)
        return _build_transactions(rows)


class MT940ImportService:
    def parse(self, file_content):
        try:
            import mt940
            content = file_content.decode('utf-8', errors='replace') if isinstance(file_content, bytes) else file_content
            transactions = mt940.models.Transactions()
            transactions.parse(content)
            result = []
            for tx in transactions:
                data = tx.data
                amount = data.get('amount')
                if amount is None:
                    continue
                tx_type = 'CREDIT' if amount.amount >= 0 else 'DEBIT'
                result.append({
                    'transaction_date': data.get('date'),
                    'value_date': data.get('entry_date'),
                    'description': str(data.get('transaction_details', '')).strip(),
                    'reference': str(data.get('id', '')).strip(),
                    'amount': abs(amount.amount),
                    'transaction_type': tx_type,
                    'balance_after': None,
                })
            return result
        except Exception as e:
            raise ValueError(f'Erreur parsing MT940: {e}')


class CAMT053ImportService:
    def parse(self, file_content):
        try:
            from lxml import etree
            root = etree.fromstring(file_content)
            ns = {'camt': 'urn:iso:std:iso:20022:tech:xsd:camt.053.001.02'}
            result = []
            for ntry in root.findall('.//camt:Ntry', ns):
                amt_el = ntry.find('camt:Amt', ns)
                if amt_el is None:
                    continue
                amount = Decimal(amt_el.text or '0')
                cd_el = ntry.find('.//camt:CdtDbtInd', ns)
                tx_type = 'CREDIT' if (cd_el is not None and cd_el.text == 'CRDT') else 'DEBIT'
                date_el = ntry.find('camt:ValDt/camt:Dt', ns) or ntry.find('camt:BookgDt/camt:Dt', ns)
                tx_date = _parse_date(date_el.text if date_el is not None else None)
                if not tx_date:
                    continue
                desc_el = ntry.find('.//camt:AddtlNtryInf', ns) or ntry.find('.//camt:Ustrd', ns)
                ref_el = ntry.find('.//camt:EndToEndId', ns) or ntry.find('.//camt:Ref', ns)
                result.append({
                    'transaction_date': tx_date,
                    'value_date': tx_date,
                    'description': desc_el.text.strip() if desc_el is not None else '',
                    'reference': ref_el.text.strip() if ref_el is not None else '',
                    'amount': amount,
                    'transaction_type': tx_type,
                    'balance_after': None,
                })
            return result
        except Exception as e:
            raise ValueError(f'Erreur parsing CAMT.053: {e}')


def get_import_service(file_format):
    return {
        'CSV': CSVImportService,
        'EXCEL': ExcelImportService,
        'MT940': MT940ImportService,
        'CAMT053': CAMT053ImportService,
    }[file_format]()
