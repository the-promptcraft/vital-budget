#!/bin/zsh
cd "$(dirname "$0")"

echo "========================================================"
echo "🚀 ÉTAPE 1/3 : CONNEXION À TON COMPTE GITHUB (the-promptcraft)"
echo "========================================================"
if ! gh auth status >/dev/null 2>&1; then
  gh auth login --hostname github.com --git-protocol https --web
fi

echo ""
echo "========================================================"
echo "📦 ÉTAPE 2/3 : CRÉATION & ENVOI DU REPO SUR GITHUB"
echo "========================================================"
gh auth setup-git
git branch -M main
if ! gh repo view the-promptcraft/vital-budget >/dev/null 2>&1; then
  gh repo create the-promptcraft/vital-budget --public --source=. --remote=origin --push
else
  git remote remove origin 2>/dev/null || true
  git remote add origin https://github.com/the-promptcraft/vital-budget.git
  git push -u origin main
fi

echo ""
echo "========================================================"
echo "▲ ÉTAPE 3/3 : CONNEXION À TON COMPTE VERCEL & LIAISON GITHUB"
echo "========================================================"
npx vercel login
npx vercel link --yes
npx vercel git connect https://github.com/the-promptcraft/vital-budget.git || true
npx vercel --prod --yes

echo ""
echo "✅ TERMINÉ ! Ton repo GitHub (the-promptcraft/vital-budget) et ton compte Vercel sont liés !"
open "https://github.com/the-promptcraft/vital-budget"
read -k1 "?Appuie sur une touche pour fermer cette fenêtre..."
