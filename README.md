# Exemple de SocketIO

Projet de base pour présenter le fonctionnement de la communication réseau à travers la librairie Socket.IO.

Consultez la [documentation](https://socket.io/docs/v4/) pour une explication plus détaillée de la librairie Client et Serveur.

## Installation des dépendances

Lancer la commande `npm ci` dans chaque projet pour installer les dépendances nécessaires. 

Le site web est fait à l'aide du cadriciel *Angular* et doit installer plusieurs dépendances.

## Lancement

Lancer la commande `npm start` dans chaque projet.

Le serveur NodeJS sera déployé sur le port **5020** de la machine locale. Un changement dans le code source relancera le serveur à nouveau à l'aide de l'outil `nodemon`.

Le serveur statique de WebPack pour le site web sera déployé sur le port **4200** de la machine locale.

## Tests unitaires

Chaque projet est accompagné de tests unitaires qui peuvent être executés à travers la commande `npm test` ou la commande `npm run coverage` qui présente le taux de couverture également.

La classe [SocketTestHelper](./client/src/app/classes/socket-test-helper.ts) permet de _mock_ l'objet `Socket` pour les tests unitaires. La fonction `peerSideEmit` simule un `emit` d'un serveur externe. Voir les tests de [AppComponent](./client/src/app/app.component.spec.ts) pour plus d'exemples.

Du côté serveur, les tests unitaires utilisent de vrais clients `SocketIO` pour effectuer les appels. Dans le cas où le serveur n'envoie aucun événement durant son traitement du message, un délai est introduit pour permettre au gestionnaire `on(event,callback)` d'être exécuté avant de faire l'évaluation du test. 

# Serveur
Le projet dans `/server` contient un serveur NodeJS qui joue le rôle de serveur SocketIO.

### Événements Socket
Le serveur réagit à plusieurs événements différents définis dans la fonction `handleSockets` :
- L'événement de connexion par Socket affichera l'identifiant (`id`) du socket dans la console et enverra un message **Hello World!** au client connecté.
- L'événement de déconnexion d'un socket affichera l'identifiant et la raison de déconnexion. Voir la [documentation](https://socket.io/docs/v4/server-socket-instance/#disconnect) pour les différentes raisons possibles.
- L'événement `hello` affichera le message envoyé par le client dans la console.
- L'événement `validate` contient un mot à valider. Le serveur renvoie `true` si le mot a plus de 5 caractères, `false` sinon. Le retour est fait à travers l'événement `wordValidated`.
- L'événement `validateWithAck` se comporte de la même manière que `validate`, mais le retour est fait à travers un message de reconnaissance ([_acknowledgement_](https://socket.io/docs/v4/#acknowledgements)) directement et non un événement séparé. 
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

Le bouton "**Envoyer au server**" envoie un événement `validateWithAck` avec le contenu du champ de saisi au serveur directement. Le client réagit par la suite à la réponse du serveur qui contient le résultat de la validation. Ce résultat est affiché sur la page Web lorsque reçu.

Le bouton "**Envoyer à tous!**" envoie un événement `broadcastAll` avec le contenu du champ de saisi au serveur directement. Le serveur répond à travers l'événement `massMessage` accompagné de l'identifiant de l'auteur du message à tous les clients connectés. Chaque message est affiché dans une liste avec les autres messages envoyés à travers `broadcastAll`.

Le bouton "**Rejoindre une salle**" envoie un événement `joinRoom` au serveur. Après cet événement, le client est rajouté dans la salle du serveur et peut envoyer des messages qui ciblent seulement les autres clients dans cette salle.

Le bouton "**Envoyer dans la salle!**" envoie un événement `roomMessage` avec le contenu du champ de saisi au serveur directement. Le serveur répond à travers l'événement `roomMessage` accompagné de l'identifiant de l'auteur du message à tous les clients connectés ET ayant rejoint la salle au préalable. Chaque message est affiché dans une liste avec les autres messages envoyés à travers `roomMessage`.