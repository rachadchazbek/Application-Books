// on assume que le serveur SocketIO est sur la même machine que le client
const urlString = `http://${window.location.hostname}:5020`;
const socket = io(urlString);

configureBaseSocketFeatures();
configureSendMessagesToServer();
configureRoomCommunication();

function configureBaseSocketFeatures() {
    // Afficher l'identifiant du Socket dans l'interface
    socket.on("connect", () => {
        document.getElementById('socketIdField').textContent = socket.id;
    });
    
    // Afficher le message envoyé lors de la connexion avec le serveur
    socket.on("hello", (message) => {
        document.getElementById('messageField').textContent = message;
    });
    
    // Afficher le message envoyé à chaque émission de l'événement "clock" du serveur
    socket.on("clock", (time) => {
        document.getElementById('serverClock').textContent = time;
    });

    // Se déconnecter du serveur
    document.getElementById('disconnect').addEventListener('click', () => {
        socket.disconnect();
    });

    // Envoyer un mot à valider au serveur
    document.getElementById('validateByServer').addEventListener('click', () => {
        const wordToValidate = document.getElementById('wordInput').value;
        socket.emit('validate', wordToValidate);
        document.getElementById('wordInput').value = '';
    });

    // Gérer l'événement envoyé par le serveur : afficher le résultat de validation
    socket.on('wordValidated', (isValid) => {
        const validationString = `Le mot est ${isValid ? "valide" : "invalide"}`;
        document.getElementById('serverValidationResult').textContent = validationString;
    });

}

function configureSendMessagesToServer() {
    // Envoyer un message au serveur seulement
    document.getElementById('sendToServer').addEventListener('click', () => {
        const messageToServer = document.getElementById('messageToServer').value;
        socket.emit('message', messageToServer);
        document.getElementById('messageToServer').value = '';
    });

    // Envoyer un message destiné à être transmis à tous les clients connectés
    document.getElementById('broadcastToServer').addEventListener('click', () => {
        const broadcastMessage = document.getElementById('messageBroadcast').value;
        socket.emit('broadcastAll', broadcastMessage);
        document.getElementById('messageBroadcast').value = '';
    });

    // Gérer l'événement envoyé par le serveur : afficher le message envoyé par un client connecté
    socket.on('massMessage', (broadcastMessage) => {
        const listItem = document.createElement('li');
        listItem.textContent = broadcastMessage;
        document.getElementById('serverBroadcastList').appendChild(listItem);
    });
}

function configureRoomCommunication() {

    // Se connecter à une salle SocketIO
    document.getElementById('joinRoomBtn').addEventListener('click', () => {
        socket.emit('joinRoom');
    });

    // Envoyer un message dans la salle
    document.getElementById('messageToRoom').addEventListener('click', () => {
        const broadcastMessage = document.getElementById('messageRoom').value;
        socket.emit('roomMessage', broadcastMessage);
        document.getElementById('messageRoom').value = '';
    });

    // Gérer l'événement envoyé par le serveur : afficher le message envoyé par un membre de la salle
    socket.on('roomMessage', (broadcastMessage) => {
        const listItem = document.createElement('li');
        listItem.textContent = broadcastMessage;
        document.getElementById('roomMessageList').appendChild(listItem);
    });
}
