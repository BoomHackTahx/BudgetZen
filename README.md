# BudgetZen

BudgetZen est une application web de gestion de budget personnel. Elle permet de suivre ses revenus et ses dépenses, de consulter un résumé mensuel et de fixer des limites par catégorie.

L’interface est disponible en malagasy, en français et en anglais. La devise par défaut est l’ariary (MGA), mais chaque compte peut en choisir une autre. Le changement de devise modifie l’affichage des montants ; il ne convertit pas les opérations déjà enregistrées.

## Fonctionnalités

- Création de compte et connexion
- Ajout, modification, suppression et recherche de transactions
- Budgets mensuels par catégorie
- Tableau de bord avec revenus, dépenses et solde
- Modification du profil et du mot de passe
- Interface en malagasy, français et anglais
- Démo en lecture seule avec des données fictives

## Technologies

- React et Vite
- Node.js et Express
- MySQL
- Docker Compose pour la base de données en développement

## Lancer le projet en local

### Prérequis

- Node.js 20 ou plus récent
- Docker avec Compose, ou une instance MySQL 8

### Installation

À la racine du projet :

```bash
cp .env.example .env
```

Dans `.env`, remplace `JWT_SECRET`, `DB_PASSWORD` et `MYSQL_ROOT_PASSWORD` par des valeurs locales adaptées. Pour générer une clé aléatoire :

```bash
openssl rand -hex 32
```

Copie la valeur générée dans `JWT_SECRET`. Ne publie jamais `.env` : il contient la configuration locale et des secrets.

Démarre ensuite MySQL et l’application :

```bash
docker compose up -d
npm install
npm run db:init
npm run dev
```

Ouvre [http://localhost:5173](http://localhost:5173). Tu peux créer un compte local ou choisir **Andramo ny demo** pour parcourir les données fictives sans compte. Les transactions de la démo sont indépendantes de la base MySQL et ne sont pas modifiables.

Docker expose MySQL sur le port local `3307` afin d’éviter un conflit avec les installations qui utilisent déjà le port `3306`. La variable `DB_PORT` du fichier `.env` doit rester réglée sur `3307` avec cette configuration Compose.

## Tests et build

```bash
npm test
npm run build
```

## Publier la démo

Le workflow GitHub Actions publie une version statique en lecture seule sur GitHub Pages. Cette version utilise uniquement les données fictives intégrées : elle ne nécessite ni serveur API, ni base de données, ni secret.

Dans le dépôt GitHub, ouvre **Settings > Pages**, sélectionne **GitHub Actions** comme source de publication, puis laisse le workflow `Deploy BudgetZen demo` terminer. L’adresse de la démo apparaît dans **Settings > Pages** et dans l’environnement `github-pages` de l’exécution du workflow. Chaque push sur `main` republie la démo.

La démo est servie sous `https://boomhacktahx.github.io/BudgetZen/`. Pour tester localement exactement cette version statique :

```bash
VITE_DEMO_ONLY=true VITE_BASE_PATH=/BudgetZen/ npm run build -w client
npm run preview -w client
```

Le lancement normal avec `npm run dev` conserve les écrans de connexion et les routes API pour le développement local.

## À propos des données

BudgetZen ne se connecte pas aux banques. N’utilise pas d’identifiants bancaires dans l’application. La démo publique doit rester basée sur les données fictives fournies ; les comptes et données réels nécessitent un hébergement et une base de données configurés de façon appropriée.
