# Mon Shop (Stripe + Printful)

## 🚀 Déploiement
1. Cloner le repo
2. Ajouter les variables d'environnement sur Vercel :
   - `STRIPE_SK` = clé secrète Stripe
   - `STRIPE_WEBHOOK_SECRET` = secret webhook Stripe
   - `PRINTFUL_API_KEY` = clé API Printful
3. Déployer sur Vercel

## 🔄 Workflow
- Client paie via `checkout.html`
- `/backend/create-payment-intent` crée un paiement Stripe
- Stripe appelle `/backend/stripe-webhook` après succès
- Le webhook envoie la commande à Printful
- `/merci.html` affiche le récap via `/backend/get-intent`
