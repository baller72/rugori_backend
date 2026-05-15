# RUGORI GAZ - Backend API

Backend API pour la plateforme de commande et livraison de gaz RUGORI GAZ au Burundi.

## Technologies

- **Node.js** 18+
- **Express.js** 4.x
- **MySQL** 8.0+ (mysql2 driver)
- **JWT** pour authentification
- **Bcrypt** pour hashage des mots de passe
- **Multer** pour upload de fichiers
- **Nodemailer** pour envoi d'emails
- **Winston** pour logging

## Installation

```bash
# Cloner le repository
git clone [url-repo]

# Installer les dépendances
npm install

# Copier le fichier d'environnement
cp .env.example .env

# Configurer les variables d'environnement dans .env

# Créer la base de données (utiliser le script SQL fourni)

# Lancer les migrations/seeds (optionnel)
npm run seed

# Démarrer en développement
npm run dev

# Démarrer en production
npm start