# 🍏 SPECIFICATION & ARCHITECTURE DOCUMENT: VITALBUDGET (V1.0 PROD)
> **Type de Projet :** Progressive Web App (PWA) Mobile-First — Suivi Financier Style Bourse, Optimisation Économique des Courses & Batch Cooking Nutritionnel.  
> **Cible de Déploiement :** Vercel (Frontend/API) + Supabase (PostgreSQL Database) + LocalStorage Fallback (Mode Rapide/Hors-ligne).  
> **Philosophie Design :** Apple Human Interface Guidelines (iOS 18 / Apple Stocks / Apple Health / Apple Wallet) — Elevated Dark Mode.

## 1. VISION DU PRODUIT & OBJECTIFS
1. **Piloter ses finances personnelles comme un portefeuille boursier (Style Apple Stocks) :** Visualiser son *Reste à vivre*, sa *Vélocité d'épargne* (Burn Rate), ses enveloppes budgétaires et ses charges fixes avec des courbes financières interactives (7J, 1M, 3M, Tout).
2. **Maximiser les économies sur l'alimentation sans sacrifier la santé :** Suivre les courses au niveau du produit et des **familles nutritionnelles** (Légumes & Vitamines, Fruits & Antioxydants, Protéines Brutes, Glucides Complexes, Bons Lipides, Extras/À réduire) avec calcul automatique du prix au kg/L.
3. **Planifier du Batch Cooking rentable & vitaminé :** Calculer automatiquement le **coût par portion (en €)** et la densité nutritionnelle (Score Vitamines/Minéraux) de recettes préparées en masse (4 à 6 portions) avec gestion du stock au frigo.

## 2. APPLE DESIGN SYSTEM ("ELEVATED DARK MODE")
- **Background Primary :** `#121214` (jamais de noir pur `#000000`).
- **Background Elevated 1 (Cartes) :** `#1C1C1E`.
- **Background Elevated 2 (Sheets/Inputs) :** `#2C2C2E`.
- **Glassmorphism :** `backdrop-blur-xl bg-[#1C1C1E]/80` avec bordures `border-white/[0.08]`.
- **Accents :** Bullish/Économie `#30D158`, Warning `#FF9F0A`, Bearish/Dépassement `#FF453A`, Finance `#0A84FF`, Vitamines `#64D2FF`.
- **Typographie :** Police système Apple (`-apple-system`, `SF Pro`, `Inter`) + `tabular-nums` obligatoire sur tous les chiffres.
- **Ergonomie Mobile :** Bottom Tab Bar fixe (4 onglets + bouton central `+`), Bottom Sheets glissantes pour toutes les saisies.

## 3. LES 4 ONGLETS MOBILES
1. **📈 Marché & Budget (Apple Stocks) :** Reste à vivre réel en grand, budget quotidien autorisé (`€/jour`), graphique interactif Burn Rate vs Trajectoire idéale, Watchlist des enveloppes budgétaires sous forme de tickers boursiers, et Charges Fixes mensuelles.
2. **🛒 Courses Éco & Nutriments :** Grille "1-Tap Favoris Éco" (ajout en 1 clic des produits de base avec dernier prix), calculateur automatique de Prix au Kg/L, indicateur d'inflation, et jauge de qualité du panier (Aliments Bruts Vitaminés vs Extras).
3. **🍲 Batch Cooking (Repas en Masse) :** Créateur et catalogue de recettes en masse, calcul automatique du coût par portion (`€/portion`), économie réalisée vs repas extérieur, badges des vitamines présentes (Vit C, B12, Fer, Magnésium, Oméga-3), et compteur de portions restantes au frigo (`-1 portion`).
4. **📊 Analyses & Data :** Radar de couverture des sous-familles de légumes (Verts/Crucifères, Oranges/Rouges, Alliacés/Racines, Légumineuses), Top produits rentables au kilo, Export/Import JSON & CSV, et configuration Supabase.

## 4. ARCHITECTURE DONNÉES & FICHIERS
- `src/store/useFinanceStore.ts` : Store Zustand persistant (`localStorage`) + synchro Supabase optionnelle.
- `src/lib/seedData.ts` : Données pré-remplies (budget mensuel réaliste, 15 produits bruts économiques classés par vitamines/familles, 3 recettes de Batch Cooking comme Pâtes Thon Pesto Citron, Poulet Curry Légumes Verts & Riz, Overnight Oats).
- `supabase/schema.sql` : Script SQL complet des tables (`monthly_budgets`, `fixed_expenses`, `transactions`, `staple_products`, `grocery_items`, `batch_meals`).
