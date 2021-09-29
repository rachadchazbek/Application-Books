# Exemple de SocketIO

Projet de base pour présenter le fonctionnement de la communication réseau à travers la librairie Socket.IO.

Consultez la [documentation](https://socket.io/docs/v4/) pour une explication plus détaillée de la librairie Client et Serveur.

## Installation des dépendances

Lancer la commande `npm ci` dans chaque projet pour installer les dépendances nécessaires. 

Dans le cas du client, seulement le serveur HTTP statique `lite-server` est nécessaire. Vous pouvez lancer le site web en ouvrant `index.html` dans votre navigateur directement. Le code de Socket.IO est obtenu à travers la balise `script` dans le fichier HTML.

## Lancement

Lancer la commande `npm start` dans chaque projet.

Le serveur NodeJS sera déployé sur le port **5020** de la machine locale. Un changement dans le code source relancera le serveur à nouveau à l'aide de l'outil `nodemon`.

Le site web sera déployé sur le port **5000** de la machine locale.

# Serveur
Le projet dans `/server` contient un serveur NodeJS qui joue le rôle de serveur SocketIO.

### Événements Socket
Le serveur réagit à plusieurs événements différents définis dans la fonction `handleSockets` :
- L'événement de connexion par Socket affichera l'identifiant (`id`) du socket dans la console et enverra un message **Hello World!** au client connecté.
- L'événement de déconnexion d'un socket affichera l'identifiant et la raison de déconnexion. Voir la [documentation](https://socket.io/docs/v4/server-socket-instance/#disconnect) pour les différentes raisons possibles.
- L'événement `message` affichera le message envoyé par le client dans la console.
- L'événement `validate` contient un mot à valider. Le serveur renvoie `true` si le mot a plus de 5 caractères, `false` sinon. Le retour est fait à travers l'événement `wordValidated`.
- L'événement `broadcastAll` contiens un message de la part d'un client à retransmettre à tous les autres clients connectés au serveur. Le serveur retransmet le message à travers l'événement `massMessage` accompagné de l'identifiant de l'auteur du message.
- L'événement `joinRoom` ajoute le client à la salle du serveur. Il y a une seule salle par serveur.
- L'événement `roomMessage` retransmet le message envoyé seulement aux clients connectés au serveur ayant rejoint la salle à travers l'événement `joinRoom`. Le serveur retransmet le message à travers l'événement `roomMessage` accompagné de l'identifiant de l'auteur du message.
  
Le serveur envoie également l'heure locale de sa machine à un intervalle de 1000 ms à travers l'événement `clock`. Cet événement est envoyé à tous les clients connectés au serveur.

# Client

Le projet dans `/client` contient une simple page Web qui permet de faire une démonstration rapide de la librairie client de SocketIO.

Lors du chargement de la page, le site se connecte au serveur NodeJS à travers une connexion SocketIO. 
**Note** : le client assume que le serveur qui sert la page Web est déployé sur la même adresse IP que le serveur NodeJS et ne fonctionnera pas autrement.

### Événements Socket

Lors du chargement de la page, le site web affichera l'identifiant de son socket, le message reçu de la part du serveur ainsi qu'un affichage dynamique de l'heure locale du serveur. Cet affichage se fait à partir de la réception et gestion de l'événement `clock` envoyé par le serveur à chaque 1000 ms.

Le bouton "**Déconnexion**" envoie un événement `disconnect` au serveur. Après cet événement, l'horloge arrête de se mettre à jour et le serveur n'est plus accessible.

Le bouton "**Valider**!" envoie un événement `validate` avec le contenu du champ de saisi au serveur. Le client réagit par la suite à l'événement `wordValidated` du serveur qui contient le résultat de la validation. Ce résultat est affiché sur la page Web lorsque reçu.

Le bouton "**Envoyer au server**" envoie un événement `message` avec le contenu du champ de saisi au serveur directement. Aucune réponse n'est renvoyée du serveur.

Le bouton "**Envoyer à tous!**" envoie un événement `broadcastAll` avec le contenu du champ de saisi au serveur directement. Le serveur répond à travers l'événement `massMessage` accompagné de l'identifiant de l'auteur du message à tous les clients connectés. Chaque message est affiché dans une liste avec les autres messages envoyés à travers `broadcastAll`.

Le bouton "**Rejoindre une salle**" envoie un événement `joinRoom` au serveur. Après cet événement, le client est rajouté dans la salle du serveur et peut envoyer des messages qui ciblent seulement les autres clients dans cette salle.

Le bouton "**Envoyer dans la salle!**" envoie un événement `roomMessage` avec le contenu du champ de saisi au serveur directement. Le serveur répond à travers l'événement `roomMessage` accompagné de l'identifiant de l'auteur du message à tous les clients connectés ET ayant rejoint la salle au préalable. Chaque message est affiché dans une liste avec les autres messages envoyés à travers `roomMessage`.