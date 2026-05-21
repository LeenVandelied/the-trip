# Prompt à passer dans Claude Design

```
# Produit
"The Trip" — un mini-site web privé pour qu'un groupe de 5-10 potes
organise ensemble un roadtrip moto de 7 jours.
Accès par lien direct, pas de compte, juste un pseudo libre.

# Public
Motards trentenaires/quarantenaires sur sportives, roadsters
et trails. C'est un **trip route** (asphalte, cols, twisties)
— pas d'off-road, pas d'enduro. Esprit "carnet de route",
on prépare le voyage ensemble depuis le canapé.

# Ambiance visuelle
Choix libre, mais cadre :
- Dark mode par défaut (light optionnel)
- Vibe "roadbook" : carnet de voyage, papier, encre, panneaux routiers
- Pas corporate, pas SaaS, pas neon-gradient-techbro, pas racing-rouge-agressif
- Typo titre serif slab assumée, corps sans-serif lisible
- Iconographie trait simple style panneau routier
- Bordures dashed acceptées sur séparateurs

Tu as carte blanche sur la palette précise, la texture de fond,
et le choix des tuiles de carte (sombres type Dark Matter ou
claires type topo papier — celle qui sert le mieux la vibe).

# Navigation
Barre top fixe : logo "THE TRIP" + nav inline
[ Dates · Carte · Itinéraires · Budget · Roadbook ]
Pastille pseudo à droite (clic = changer son pseudo en local).

# Écrans

## 1. Landing (/)
- Hero : titre "The Trip", sous-titre dynamique
  "7 jours · X motos · ≈ ?? km"
- Bloc "Embarque" : input pseudo + bouton "C'est parti"
- Compteur participants : avatars initiales en ligne
- Illustration hero : moto sur route sinueuse, trait simple,
  pas de photo stock

## 2. Dates (/dates)
- Titre "Quand on part ?"
- Cards horizontales des plages proposées :
  "12 → 19 juillet" + barre Dispo/Peut-être/Non + 3 boutons radio
- "+ Proposer une plage" → modal date range picker
- Plage gagnante mise en avant en bas

## 3. Carte (/map)
- Carte plein écran
- Panneau latéral droit rétractable :
  - Onglets "Lieux" / "GPX par jour"
  - Lieux : liste pins + ajouté-par + 👍/👎 + bouton voter
  - GPX : pills J1→J7, liste des tracés du jour sélectionné
- Bouton flottant "+ Ajouter" (Lieu ou GPX)
- GPX : couleur de trait différente par jour

## 4. Itinéraires (/routes)
- 7 sections empilées J1 → J7
- Chaque jour = card "carnet" :
  - Numéro jour énorme
  - Liste des GPX proposés : nom · km · D+ · proposé par · 👍 X / 👎 Y
  - Mini preview carte par tracé
  - Bouton "+ Proposer un GPX" (drag&drop)
- Vote 👍/👎 uniquement, pas d'étoile

## 5. Budget (/budget)
- Form 2 colonnes :
  - Gauche "Mes paramètres" : conso L/100, prix essence €/L, modèle moto
  - Droite "Trip" (partagé) : logement €/nuit, repas €/jour, péages €
- Résultat : gros chiffre "≈ XXX € par personne"
- Breakdown barre stack horizontale : carburant · logement · repas · péages
- Note : km totaux = somme des GPX "gagnants" par jour (sinon estim manuelle)

## 6. Roadbook (/roadbook)
- Vue printable style page de carnet relié
- Par jour : date · GPX retenu (mini carte) · lieux · météo (emoji)
- Boutons "Imprimer" et "Exporter .ics"

# Composants transverses
- Avatar : cercle avec initiale, couleur dérivée du pseudo
- Card : bg légèrement contrasté, border 1px (dashed bienvenu)
- Bouton primaire : ton accent chaud
- Bouton secondaire : bordure seule, hover rempli
- Tag vote : pill compact icône + nombre

# États à designer
- Empty ("Aucun GPX pour J3 — propose le premier")
- Loading (skeleton carnet)
- Erreur upload GPX ("Fichier invalide")

# Responsive
Mobile-first obligatoire (vote depuis le tel à l'apéro) :
- Nav → hamburger
- Carte plein écran
- Panneau latéral → bottom-sheet
```
