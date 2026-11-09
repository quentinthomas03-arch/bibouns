# Biboun's 🧡

L'appli de **Quentin & Aude** pour vivre la grossesse, le Jour J et les premiers mois de bébé, à deux et en temps réel.

- 📱 **PWA** installable sur iPhone, qui marche hors ligne
- 🔄 **Synchro en temps réel** entre les deux téléphones
- 🔒 **Données privées** : hébergées en UE (Supabase Francfort) et protégées par la Row Level Security. Aucune pub, aucun traqueur.
- 🎨 Thème terracotta, avec un mode sombre « veilleuse » pour les nuits

> **Code public, données privées.** Le code de l'appli est visible sur GitHub, mais il ne contient **aucune donnée ni aucun secret**. Vos données sont dans votre base Supabase, et seul votre foyer peut les lire.

---

## Sommaire

1. [Mise en route (une seule fois, ~15 min, depuis l'iPhone)](#1-mise-en-route)
2. [Installer l'appli sur iPhone](#2-installer-lappli-sur-iphone)
3. [Inviter Aude / récupérer un profil](#3-inviter-aude--récupérer-un-profil)
4. [Sauvegarder et exporter les données](#4-sauvegarder-et-exporter)
5. [Modifier les textes](#5-modifier-les-textes)
6. [Comment ça marche (technique)](#6-comment-ça-marche)
7. [Développement](#7-développement)

---

## 1. Mise en route

Tout se fait **dans Safari sur l'iPhone**. Astuce : demande la « version pour ordinateur » (bouton **ᴀA** dans la barre d'adresse) quand une page s'affiche mal.

### Étape 1 — Créer le projet Supabase (la base de données)

Supabase est un service en ligne qui fournit la base de données, la connexion et la synchro en direct. L'offre gratuite suffit.

1. Va sur **https://supabase.com** → **Start your project** → connecte-toi **avec GitHub** (c'est le plus simple).
2. Si on te le demande, crée une organisation : nom `Bibouns`, type *Personal*, plan **Free**.
3. **New project** :
   - **Name** : `bibouns`
   - **Database Password** : clique sur **Generate a password**, puis **copie-le et garde-le dans tes Notes**. Tu en auras besoin à l'étape 2.
   - **Region** : **Central EU (Frankfurt)** ✅ (important : données en UE)
   - Plan **Free** → **Create new project**. Patiente environ 2 minutes.
4. Note **l'identifiant du projet** (*Project ref*) : ce sont les ~20 lettres dans l'adresse de la page, `supabase.com/dashboard/project/`**`abcdefghijklmnopqrst`**. Tu peux aussi le trouver dans **Project Settings → General → Project ID**.
5. Crée un **jeton d'accès** pour que GitHub puisse configurer la base automatiquement :
   - Clique sur ton avatar (en haut à droite) → **Account preferences** → **Access Tokens**. Ou ouvre directement https://supabase.com/dashboard/account/tokens
   - **Generate new token** → nom `github-bibouns` → **copie le jeton** (il ne s'affiche qu'une fois).

### Étape 2 — Donner ces 3 infos à GitHub (les « secrets »)

1. Ouvre **https://github.com/quentinthomas03-arch/bibouns/settings/secrets/actions**
2. Pour chaque ligne du tableau : **New repository secret** → colle le *Name* exactement, puis la valeur → **Add secret**.

| Name | Valeur |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | le jeton de l'étape 1.5 |
| `SUPABASE_PROJECT_REF` | l'identifiant du projet de l'étape 1.4 |
| `SUPABASE_DB_PASSWORD` | le mot de passe de l'étape 1.3 |

Ces secrets sont chiffrés par GitHub : personne ne peut les relire, même toi.

### Étape 3 — Activer GitHub Pages (l'hébergement)

1. Ouvre **https://github.com/quentinthomas03-arch/bibouns/settings/pages**
2. **Source** : choisis **GitHub Actions**. C'est tout.

### Étape 4 — Lancer le premier déploiement

1. Ouvre **https://github.com/quentinthomas03-arch/bibouns/actions/workflows/deploy.yml**
2. **Run workflow** → **Run workflow**.
3. Attends que les 5 étapes passent au vert ✅ (~3 min). Le workflow :
   - lance les tests ;
   - crée toutes les tables et les règles de sécurité dans Supabase ;
   - active la connexion anonyme ;
   - publie l'appli.

L'appli est alors en ligne sur : **https://quentinthomas03-arch.github.io/bibouns/**

> Ensuite, **chaque modification du code est déployée automatiquement**. Rien d'autre à faire.

**Si une étape est rouge** ❌ : clique dessus pour lire le message. Les cas les plus fréquents :
- *Mise à jour Supabase* échoue → un secret est mal copié (espace en trop ?). Recrée-le.
- *Publication GitHub Pages* échoue → l'étape 3 n'est pas faite.

---

## 2. Installer l'appli sur iPhone

⚠️ **Il faut installer l'appli AVANT de créer le foyer.** Sur iPhone, Safari et l'appli installée ne partagent pas leurs données.

1. Ouvre **https://quentinthomas03-arch.github.io/bibouns/** dans **Safari** (pas Chrome).
2. Touche **Partager** (le carré avec la flèche ↑).
3. **Sur l'écran d'accueil** → **Ajouter**.
4. Ouvre **Biboun's** depuis l'écran d'accueil.

Il faut iOS 16.4 ou plus récent pour les notifications (Phase 3).

---

## 3. Inviter Aude / récupérer un profil

**Créer le foyer (Quentin)** : *Créer notre foyer* → prénom, avatar, couleur, date prévue → l'appli affiche :
- un **code d'invitation** (6 caractères, valable 7 jours) → bouton **Envoyer le code** ;
- ton **code de secours** → **copie-le dans tes Notes** 🔑.

**Rejoindre (Aude)** : installe l'appli (section 2) → *J'ai un code d'invitation* → saisis le code. Elle reçoit aussi son propre code de secours.

**Nouveau téléphone / appli supprimée** : installe l'appli → *J'ai un code de secours*. Ton profil et toutes les données reviennent, et l'ancien téléphone est déconnecté.

Un code expiré ? *Réglages → Notre foyer → Nouveau code d'invitation*. Code de secours perdu ? Si tu es encore connecté : *Réglages → Sécurité → Générer un nouveau code de secours*.

---

## 4. Sauvegarder et exporter

- **Export complet** (Phase 4) : un fichier ZIP avec toutes les données (JSON + tableaux CSV lisibles dans Excel/Numbers) et toutes les photos en JPG rangées par mois, prêtes pour un livre photo. Plus un PDF « livre de naissance » mois par mois.
- **Enregistrer dans Photos** (Phase 3) : depuis un souvenir, via le menu de partage de l'iPhone.
- **Tout supprimer** (Phase 4) : *Réglages → Supprimer toutes nos données*, avec une double confirmation.
- **Important** : l'offre gratuite de Supabase **n'inclut pas de sauvegardes téléchargeables**. L'export ZIP, à faire régulièrement (par exemple une fois par mois, dans iCloud Drive), est donc **la** sauvegarde à conserver. L'appli vous le rappellera.

---

## 5. Modifier les textes

Tous les textes de l'appli sont dans **`src/content/fr.ts`**. Pour en changer un depuis l'iPhone :

1. Ouvre le fichier sur GitHub → icône ✏️ (*Edit*).
2. Change le texte **entre les guillemets** seulement.
3. **Commit changes**. L'appli se met à jour toute seule ~3 min plus tard.

Les contenus médicaux sont marqués `⚕️ À VALIDER (Aude)`.

---

### Données de prénoms

- Source : **INSEE, « Fichier des prénoms »**, édition nationale (naissances en France depuis 1900), sous **Licence Ouverte Etalab** : réutilisation libre, avec mention de la source (affichée dans l'appli).
- `scripts/build-names.py` convertit le fichier CSV de l'INSEE en `src/content/names.json`. Il garde environ 4 300 prénoms, avec pour chacun le sexe, le nombre de naissances sur 10 ans, l'année du pic et la tendance. Pour mettre à jour à la sortie d'une nouvelle édition, télécharge le CSV « France » sur insee.fr, puis lance `python3 scripts/build-names.py prenoms-XXXX-nat.csv`.
- Les **origines** ne sont pas fournies par l'INSEE : elles sont saisies à la main dans `src/content/nameOrigins.ts` (indicatives, à enrichir).
- Les votes sont **privés** : la base ne laisse lire à chacun que ses propres votes. Les matchs sont calculés côté serveur par une fonction qui ne renvoie que les « j'aime » communs.

## 6. Comment ça marche

```
iPhone Quentin ─┐                                   ┌─ iPhone Aude
  IndexedDB     │   HTTPS (chiffré)   Supabase UE   │   IndexedDB
  + file d'envoi├──────────────────▶ Postgres + RLS ◀┤   + file d'envoi
                │◀── Realtime ─────  (Francfort)  ──▶│
```

- **Connexion** : chaque téléphone a une session Supabase *anonyme* durable (pas d'email ni de mot de passe). Il est rattaché à un **membre** du **foyer** par des fonctions SQL contrôlées (`create_household`, `join_household`, `recover_member`). Un foyer = 2 membres maximum. Les codes de secours sont stockés hachés (SHA-256), et les essais de codes sont limités à 10 par heure.
- **Sécurité** : la Row Level Security fait que chaque table n'est lisible et modifiable que par les membres du foyer. Les votes de prénoms ne sont visibles que par leur auteur. Il n'y a pas de suppression physique côté client (suppression « douce »). Les tests de sécurité sont dans `tests/db/security.sql`.
- **Hors ligne d'abord** (`src/sync/`) :
  - toute saisie va d'abord dans la base locale **et** dans une **file d'envoi**, dans la même transaction ;
  - l'envoi est *idempotent* : chaque ligne a un UUID créé sur le téléphone, donc un renvoi ne crée pas de doublon ;
  - une entrée ne quitte la file qu'une fois le serveur a confirmé : aucune perte ;
  - conflits : **la dernière modification gagne** (`updated_at`), et c'est le serveur qui arbitre. Une modif hors ligne plus ancienne n'écrase pas une modif plus récente ;
  - réception : Realtime, plus un rattrapage par curseur `synced_at` à chaque retour de réseau ou réouverture de l'appli.
- **Pas de tiers** : polices embarquées, aucun CDN ni aucune analytics. Les seules connexions vont vers GitHub Pages (l'appli) et Supabase (vos données).

### Arborescence

```
src/
  app/         session, thème, phase, membres
  components/  design system (ui/), mascotte, barre d'onglets
  content/     ✏️ tous les textes (fr.ts)
  lib/         calculs (grossesse, âge, phase), client Supabase
  screens/     écrans
  sync/        moteur de synchro hors ligne
  sw.ts        service worker (hors ligne, notifications)
supabase/migrations/  schéma SQL (appliqué automatiquement)
tests/               tests unitaires + tests de sécurité SQL
.github/workflows/   tests, déploiement, maintien en éveil de Supabase
```

---

## 7. Développement

Sur un ordinateur, si un jour tu en as un :

```bash
npm install
npm run dev:demo   # mode démo : aucune donnée envoyée, tout est local
npm test           # tests unitaires (synchro, calculs)
npm run test:db    # tests de sécurité SQL (nécessite PostgreSQL)
npm run build
```

Pour brancher une vraie base en local, crée un fichier `.env.local` contenant `VITE_SUPABASE_URL=...` et `VITE_SUPABASE_ANON_KEY=...`.

### Feuille de route

- [x] **Phase 0** : base de données + RLS, foyer par code, synchro hors ligne + temps réel, PWA, design system, déploiement
- [x] **Phase 1** : accueil enrichi (fruit de la semaine), checklists, prénoms en swipe, suivi de grossesse
- [ ] **Phase 2** : suivi bébé en 2 taps, carnet de santé (courbes OMS, vaccins), « qui fait quoi »
- [ ] **Phase 3** : souvenirs et photos, notifications push, mode Jour J complet
- [ ] **Phase 4** : export ZIP/PDF, suppression des données, finitions
