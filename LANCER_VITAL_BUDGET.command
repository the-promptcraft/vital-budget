#!/bin/zsh
cd "$(dirname "$0")"
echo "🍏 Démarrage de VitalBudget sur http://localhost:3000 ..."
(sleep 2 && open "http://localhost:3000") &
npm run dev
