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
3. [Inviter Aude / récupérer un profil](#3-inviter-aude--récupérer-un-profil) · [Raccourcis & Siri](#3-bis-raccourcis-iphone-saisie-en-1-tap-siri-widget) · [Notifications](#3-ter-notifications)
4. [Sauvegarder et exporter](#4-sauvegarder-et-exporter) · [Recette sur iPhone](#4-bis-recette-sur-iphone-à-faire-une-fois-à-deux) · [Dépannage](#4-ter-dépannage)
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

## 3 bis. Raccourcis iPhone (saisie en 1 tap, Siri, widget)

Une PWA ne peut pas créer de widget iOS. La meilleure alternative est l'app **Raccourcis** d'Apple :
- *Réglages* de Biboun's → **Raccourcis iPhone & Siri** → **Créer mon jeton**, puis suis le pas-à-pas affiché (environ 5 min, une seule fois) ;
- chaque raccourci (« Biberon », « Pipi », « Dodo »…) ajoute une saisie, qui apparaît **en temps réel sur les deux téléphones** ;
- il se déclenche depuis le **widget Raccourcis** de l'écran d'accueil, avec **« Dis Siri, Biberon »**, ou en **touchant deux fois le dos de l'iPhone**.

Côté sécurité : le jeton (24 caractères aléatoires) n'est stocké que haché. Il ne permet **que d'ajouter** une saisie bébé, pas de lire vos données, et il est limité à 30 saisies par tranche de 10 minutes. On le désactive en un tap.

## 3 ter. Notifications

Sur chaque iPhone : ouvre l'appli **installée** → *Réglages* → **Notifications** → **Activer**, accepte, puis touche **Tester**. Il faut iOS 16.4 ou plus récent.

| Rappel | Quand |
|---|---|
| 📅 Rendez-vous | selon le rappel choisi sur le RDV (la veille, 2 h avant…) |
| 💉 Vaccins | 7 jours avant et le jour conseillé, à 9 h |
| ⏰ Échéances des listes | 3 jours avant et le jour J, à 9 h (au responsable, sinon aux deux) |
| 👉 Tâche attribuée | dès que ton binôme t'attribue un élément |
| 💌 Mots doux | à chaque mot doux de ton binôme |

Chaque catégorie se coupe séparément, par personne.

**Comment ça marche** : une fonction Supabase (`supabase/functions/push`) est appelée toutes les 5 minutes par une tâche planifiée de la base (`pg_cron`). Elle calcule les rappels (`_shared/reminders.ts`, testé) puis envoie des messages **chiffrés de bout en bout** (Web Push, RFC 8291 et 8292). Le chiffrement est fait sans bibliothèque externe, et nos tests le valident avec l'implémentation de référence. Apple et Google ne voient que des données chiffrées. Les clés VAPID sont créées automatiquement au premier déploiement et restent dans la base, inaccessibles à l'appli. Un journal empêche tout envoi en double.

## 3 quater. Les extras

| Fonction | Où | En bref |
|---|---|---|
| 📅 **Calendrier iPhone** | Réglages → Calendrier iPhone | RDV (avec leurs rappels), échéances des listes et vaccins conseillés dans l'app Calendrier. Lien personnel en lecture seule (fonction `calendar`), révocable. |
| 📜 **Projet de naissance** | Plus → Projet de naissance (et Jour J) | Souhaits à cocher à deux, envoyés en texte à la sage-femme ou à la maternité. |
| 💛 **Suivi des parents** | Suivi → Nous (après la naissance) | Un point par jour pour chacun (humeur, énergie, ressentis). Une carte d'aide apparaît si plusieurs jours difficiles s'enchaînent sur plus d'une semaine, avec le 3114. |
| 🌙 **Mode nuit** | Accueil (après la naissance) ou Plus | Noir et rouge tamisé, grande horloge, gros boutons, écran maintenu allumé. |
| 💌 **Lettres à Biboun** | Souvenirs → Lettres | Lettres datées, « scellées » si on veut jusqu'au 1er anniversaire, aux 18 ans ou à une date libre. C'est une enveloppe symbolique, pas du chiffrement. |
| 🖼️ **Faire-part** | Jour J (après « Bébé est né ») ou Souvenirs → Par mois | Image prête à envoyer (photo, prénom, date, poids, taille), dessinée sur le téléphone. |
| ❓ **Carnet de questions** | Bouton + → Question | Les questions notées au fil de l'eau ressortent dans l'onglet RDV (grossesse) ou Carnet de santé → RDV (bébé), à cocher avec la réponse. |
| 🌙 **Tour de garde des nuits** | Accueil (après la naissance) | Une nuit chacun, échange en 1 tap, notification à 21 h (« c'est ton tour » / « repose-toi »). |
| 🔊 **Bruit doux** | Mode nuit | Bruit brun généré par le téléphone, arrêt automatique (15 min, 30 min, 1 h ou sans fin). |
| 🎁 **Liste de naissance** | Une liste → icône cadeau | Lien public pour la famille : noms des articles seulement (ni prix, ni notes). Chacun réserve avec son prénom. Lien désactivable. |

## 4. Sauvegarder et exporter

*Réglages → Sauvegarde & données* :

- **Données** : un ZIP avec des **tableaux CSV** (suivi bébé, croissance, vaccins, rendez-vous, listes, souvenirs… lisibles dans Numbers ou Excel) et les **données complètes** en JSON. Choisis « Enregistrer dans Fichiers » → iCloud Drive.
- **Photos** : un ZIP de JPG **rangés par mois** (`souvenirs/2027-05_mai/2027-05-20_premier-sourire_1.jpg`), prêts pour un livre photo. Les photos sont découpées en lots de 120 pour ménager la mémoire de l'iPhone.
- **Livre de naissance** : une mise en page mois par mois (photos, mesures, premières fois). Touche **Imprimer / PDF**, puis dans la fenêtre d'impression **Partager → Enregistrer dans Fichiers**.
- **Rappel** : une notification le 1er de chaque mois, et la date du dernier export s'affiche.
- **Effacer des données de test** : suivi bébé, contractions, naissance de test, mots doux ou mesures, au choix.
- **Supprimer toutes nos données** : il faut taper `SUPPRIMER`. Les photos sont effacées, puis le foyer et tout son contenu, pour vous deux. C'est irréversible.

⚠️ L'offre gratuite de Supabase **n'inclut pas de sauvegarde téléchargeable** : l'export mensuel est **la** sauvegarde.

## 4 bis. Recette sur iPhone (à faire une fois, à deux)

- [ ] Les deux iPhone ont l'appli **installée** (icône sur l'écran d'accueil) et sont dans le même foyer
- [ ] Mot doux envoyé par l'un → visible chez l'autre en ~2 s, avec une notification
- [ ] Mode Avion : un biberon noté hors ligne → il arrive chez l'autre au retour du réseau
- [ ] Fermer et rouvrir l'appli : on reste connecté, sans écran de création de foyer
- [ ] Codes de secours de **chacun** copiés dans les Notes
- [ ] *Réglages → Notifications* : **Activer** puis **Tester** sur chaque iPhone
- [ ] Rendez-vous test dans 2 h 10 avec le rappel « 2 h avant » → notification en moins de 10 min
- [ ] Une photo ajoutée dans Souvenirs s'affiche sur l'autre téléphone
- [ ] Un raccourci « Biberon » créé dans l'app Raccourcis fonctionne (et « Dis Siri, Biberon »)
- [ ] Mode sombre (réglage iPhone) lisible la nuit
- [ ] Un **export** de données rangé dans iCloud Drive
- [ ] Données de test effacées (*Sauvegarde → Effacer des données de test*) et phase remise sur **Automatique**

## 4 ter. Dépannage

| Problème | Solution |
|---|---|
| L'appli ne se met pas à jour | La fermer complètement (balayer vers le haut) et la rouvrir, une ou deux fois |
| « Hors ligne » qui reste affiché | Toucher le badge pour relancer la synchro ; vérifier le réseau |
| Plus de notifications | *Réglages iPhone → Notifications → Biboun's* ; puis dans l'appli **Couper** puis **Activer** |
| Nouveau téléphone | Installer l'appli, puis **J'ai un code de secours** |
| Code d'invitation expiré | *Réglages → Notre foyer → Nouveau code d'invitation* |
| Une étape GitHub est rouge | Ouvrir l'onglet **Actions** du dépôt et lire le message ; le plus souvent, un secret Supabase est mal copié |
| Le projet Supabase est « en pause » | Le rouvrir depuis supabase.com (*Restore*) ; le ping quotidien évite normalement la pause |

## 5. Modifier les textes

Tous les textes de l'appli sont dans **`src/content/fr.ts`**. Pour en changer un depuis l'iPhone :

1. Ouvre le fichier sur GitHub → icône ✏️ (*Edit*).
2. Change le texte **entre les guillemets** seulement.
3. **Commit changes**. L'appli se met à jour toute seule ~3 min plus tard.

Les contenus de santé sont marqués `⚕️ CONTENU SANTÉ`, avec leurs sources et leur date de vérification. Les règles évoluent (vaccins, congés) : à revérifier une fois par an.

---

### Contenus santé et sources

- **Courbes de croissance** : Standards de croissance de l'enfant de l'**OMS** (2006), tables LMS 0-24 mois. Elles sont extraites par `scripts/build-growth.py`, qui contrôle les valeurs publiées. Le carnet de santé français utilise depuis 2018 des courbes françaises (AFPA – CRESS/Inserm), donc les repères peuvent légèrement différer : l'appli le signale.
- **Vaccins** : calendrier des vaccinations 2025 (ministère de la Santé / HAS), avec l'obligation des méningocoques B et ACWY depuis le 1er janvier 2025 et le nouveau schéma pneumocoque (Prevenar 20, avis HAS 2026). Le carnet papier et le médecin font foi.
- **Congés** : congé de paternité (3 j + 25 j) et congé supplémentaire de naissance (depuis le 1er juillet 2026), à vérifier sur service-public.fr.
- Tout est daté « vérifié nov. 2026 » dans `src/content/`. **À revérifier une fois par an** : le calendrier vaccinal change chaque année.

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
# Fonction de notifications (Deno) : supabase/functions/push — vérifiable avec `deno check`
npm run build
```

Pour brancher une vraie base en local, crée un fichier `.env.local` contenant `VITE_SUPABASE_URL=...` et `VITE_SUPABASE_ANON_KEY=...`.

### Feuille de route

- [x] **Phase 0** : base de données + RLS, foyer par code, synchro hors ligne + temps réel, PWA, design system, déploiement
- [x] **Phase 1** : accueil enrichi (fruit de la semaine), checklists, prénoms en swipe, suivi de grossesse
- [x] **Phase 2** : suivi bébé en 2 taps, carnet de santé (courbes OMS, vaccins), « qui fait quoi », raccourcis iPhone
- [x] **Phase 3** : souvenirs et photos, notifications push, mode Jour J complet
- [x] **Phase 4** : export ZIP/PDF, suppression des données, finitions (chargement à la demande, écran d'erreur, contrôle d'accessibilité axe-core sans violation)
