# TRAORE Bank Reconciliation

Application de rapprochement bancaire pour Groupe TRAORE — Django REST + React/TypeScript.

## Stack

- **Backend**: Django 4.2 · Django REST Framework · SimpleJWT · SQLite (dev) / PostgreSQL (prod)
- **Frontend**: React 18 · TypeScript · Vite 5 · Tailwind CSS 3 · TanStack Query
- **Import**: CSV, Excel (openpyxl), MT940, CAMT.053 (ISO 20022)
- **Déploiement**: Docker Compose

## Démarrage rapide (Mac / Linux)

### Prérequis

```bash
# macOS
brew install python@3.11 node libxml2 libxslt

# Ubuntu/Debian
sudo apt install python3.11 python3.11-venv nodejs npm libxml2-dev libxslt1-dev
```

### Backend

```bash
cd backend
python3.11 -m venv venv
source venv/bin/activate

# macOS : variables pour compiler lxml
export LDFLAGS="-L$(brew --prefix libxml2)/lib"
export CPPFLAGS="-I$(brew --prefix libxml2)/include"

pip install -r requirements.txt

cp .env.example .env   # puis éditez SECRET_KEY
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### Frontend

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

### Docker Compose (tout en un)

```bash
cp backend/.env.example backend/.env
docker compose up --build
# Backend : http://localhost:8000
# Frontend : http://localhost:3000
```

## Variables d'environnement

Créez `backend/.env` à partir du modèle ci-dessous :

```env
SECRET_KEY=changez-moi-en-production
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
# DATABASE_URL=postgres://user:pass@host:5432/dbname   # PostgreSQL optionnel
```

## Rôles utilisateurs

| Rôle | Lecture | Écriture | Validation |
|------|---------|----------|------------|
| Directeur Financier | ✓ | ✓ | ✓ |
| Comptable | ✓ | ✓ | — |
| Trésorier | ✓ | ✓ | — |
| Contrôleur de Gestion | ✓ | — | — |
| Auditeur Interne | ✓ | — | — |
| Administrateur | ✓ | ✓ | ✓ |

## Algorithme de rapprochement

Le moteur calcule un score 0–200 pour chaque paire (transaction bancaire, écriture comptable) :

| Critère | Poids |
|---------|-------|
| Référence identique | 100 pts |
| Montant exact | 50 pts |
| Proximité de date (≤ 3 jours) | 20 pts |
| Similarité de description | 20 pts |
| Devise identique | 10 pts |

Les paires dont le score dépasse le seuil configuré sur la session sont proposées en rapprochement automatique.

## API

Documentation Swagger disponible sur `http://localhost:8000/api/v1/schema/swagger-ui/` (DEBUG=True).

Endpoints principaux :
- `POST /api/v1/auth/login/` — obtenir les tokens JWT
- `GET /api/v1/banks/` — banques et comptes
- `POST /api/v1/statements/upload/` — importer un relevé
- `POST /api/v1/reconciliation/sessions/{id}/start_matching/` — lancer l'auto-match
- `GET /api/v1/reports/dashboard/` — statistiques tableau de bord
