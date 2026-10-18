#!/bin/zsh
set -e

MSG="${1:-feat: update VitalBudget}"
CURRENT_BRANCH=$(git branch --show-current)

if [ -z "$(git status --porcelain)" ]; then
  echo "✨ Aucun changement en attente dans le dossier (working tree clean)."
  echo "🚀 Votre code est déjà 100% synchronisé avec GitHub et Vercel !"
  exit 0
fi

# Si on est sur main, on crée automatiquement une branche dédiée pour la Pull Request
if [ "$CURRENT_BRANCH" = "main" ]; then
  BRANCH_NAME="update-$(date +%Y%m%d-%H%M%S)"
  echo "🌿 Création de la branche $BRANCH_NAME..."
  git checkout -b "$BRANCH_NAME"
else
  BRANCH_NAME="$CURRENT_BRANCH"
fi

echo "📦 Ajout et commit des modifications..."
git add -A
git commit -m "$MSG"

echo "🚀 Envoi de la branche $BRANCH_NAME sur GitHub..."
git push -u origin "$BRANCH_NAME"

echo "🔀 Création automatique de la Pull Request sur GitHub..."
PR_URL=$(gh pr create --base main --head "$BRANCH_NAME" --title "$MSG" --body "Pull Request générée automatiquement depuis le clone local VitalBudget." 2>/dev/null || gh pr view --json url -q .url)

echo "✅ Pull Request prête : $PR_URL"
open "$PR_URL"

# Retour propre sur main pour la suite
git checkout main
