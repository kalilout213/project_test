from difflib import SequenceMatcher
from decimal import Decimal


def calculate_match_score(bank_tx, accounting_entry) -> int:
    score = 0

    # Reference matching (up to 100 pts)
    bank_ref = (bank_tx.reference or '').strip().upper()
    entry_ref = (accounting_entry.reference or '').strip().upper()
    piece = (accounting_entry.piece_number or '').strip().upper()

    if bank_ref and entry_ref and bank_ref == entry_ref:
        score += 100
    elif bank_ref and piece and bank_ref == piece:
        score += 100
    elif bank_ref and entry_ref:
        # Partial reference match
        if bank_ref in entry_ref or entry_ref in bank_ref:
            score += 60
        else:
            ratio = SequenceMatcher(None, bank_ref, entry_ref).ratio()
            score += int(ratio * 50)

    # Amount matching (up to 50 pts)
    bank_amount = abs(bank_tx.amount)
    entry_amount = abs(accounting_entry.amount)
    if bank_amount > 0 and entry_amount > 0:
        if bank_amount == entry_amount:
            score += 50
        else:
            diff_pct = abs(bank_amount - entry_amount) / max(bank_amount, entry_amount)
            if diff_pct <= Decimal('0.001'):
                score += 48
            elif diff_pct <= Decimal('0.01'):
                score += 40
            elif diff_pct <= Decimal('0.05'):
                score += 20

    # Date proximity (up to 20 pts)
    delta = abs((bank_tx.transaction_date - accounting_entry.entry_date).days)
    if delta == 0:
        score += 20
    elif delta <= 2:
        score += 18
    elif delta <= 5:
        score += 15
    elif delta <= 10:
        score += 10
    elif delta <= 15:
        score += 5

    # Description similarity (up to 20 pts)
    bank_desc = (bank_tx.description or '').lower()
    entry_desc = (accounting_entry.description or '').lower()
    if bank_desc and entry_desc:
        ratio = SequenceMatcher(None, bank_desc, entry_desc).ratio()
        score += int(ratio * 20)

    return min(score, 200)


class ReconciliationEngine:
    def __init__(self, session):
        self.session = session

    def _get_bank_transactions(self):
        from statements.models import BankTransaction
        return list(
            BankTransaction.objects.filter(
                statement__bank_account=self.session.bank_account,
                transaction_date__gte=self.session.period_start,
                transaction_date__lte=self.session.period_end,
                is_reconciled=False,
            )
        )

    def _get_accounting_entries(self):
        return list(
            self.session.journal.entries.filter(
                entry_date__gte=self.session.period_start,
                entry_date__lte=self.session.period_end,
                is_reconciled=False,
            )
        )

    def run_auto_match(self):
        from .models import ReconciliationMatch, ReconciliationGap, GapType

        bank_txs = self._get_bank_transactions()
        entries = self._get_accounting_entries()

        threshold = self.session.auto_match_threshold
        matches_created = 0
        used_tx_ids = set()
        used_entry_ids = set()

        # Score all pairs
        scored = []
        for tx in bank_txs:
            for entry in entries:
                # Only match same direction
                if tx.transaction_type != entry.transaction_type:
                    continue
                score = calculate_match_score(tx, entry)
                if score >= threshold:
                    scored.append((score, tx, entry))

        # Greedy: highest score first
        scored.sort(key=lambda x: -x[0])

        for score, tx, entry in scored:
            if tx.id in used_tx_ids or entry.id in used_entry_ids:
                continue
            ReconciliationMatch.objects.create(
                session=self.session,
                bank_transaction=tx,
                accounting_entry=entry,
                score=score,
                is_manual=False,
            )
            tx.is_reconciled = True
            tx.reconciliation_id = self.session.id
            tx.save(update_fields=['is_reconciled', 'reconciliation_id'])
            entry.is_reconciled = True
            entry.reconciliation_id = self.session.id
            entry.save(update_fields=['is_reconciled', 'reconciliation_id'])
            used_tx_ids.add(tx.id)
            used_entry_ids.add(entry.id)
            matches_created += 1

        # Create gaps for unmatched
        for tx in bank_txs:
            if tx.id not in used_tx_ids:
                ReconciliationGap.objects.get_or_create(
                    session=self.session,
                    bank_transaction=tx,
                    gap_type=GapType.BANQUE_SANS_COMPTA,
                )

        for entry in entries:
            if entry.id not in used_entry_ids:
                ReconciliationGap.objects.get_or_create(
                    session=self.session,
                    accounting_entry=entry,
                    gap_type=GapType.COMPTA_SANS_BANQUE,
                )

        return matches_created

    def suggest_matches(self, bank_tx_id, limit=5):
        from statements.models import BankTransaction
        tx = BankTransaction.objects.get(id=bank_tx_id)
        entries = self._get_accounting_entries()

        scored = []
        for entry in entries:
            score = calculate_match_score(tx, entry)
            scored.append((score, entry))

        scored.sort(key=lambda x: -x[0])
        return [(score, entry) for score, entry in scored[:limit] if score > 0]
