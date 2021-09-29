// on assume que le serveur SocketIO est sur la même machine que le client
const urlString = `http://${window.location.hostname}:5020`;
const socket = io(urlString);

handleSocket();
addListeners();


function handleSocket() {
    socket.on("connect", () => {
        const socketId = document.getElementById('socketIdField');
        socketId.textContent = socket.id;
    });

    socket.on("hello", (message) => {
        document.getElementById('messageField').textContent = message;
    });

    socket.on("clock", (time) => {
        const messageParagraph = document.getElementById('serverClock');
        messageParagraph.textContent = time;
    });

    socket.on('wordValidated', (isValid) => {
        const validationString = `Le mot est ${isValid ? "valide" : "invalide"}`;
        document.getElementById('serverValidationResult').textContent = validationString;
    })

    socket.on('massMessage', (broadcastMessage) => {
        const listItem = document.createElement('li');
        listItem.textContent = broadcastMessage;
        document.getElementById('serverBroadcastList').appendChild(listItem);
    })

    socket.on('roomMessage', (broadcastMessage) => {
        const listItem = document.createElement('li');
        listItem.textContent = broadcastMessage;
        document.getElementById('roomMessageList').appendChild(listItem);
    })
}

function addListeners() {
    document.getElementById('disconnect').addEventListener('click', () => {
        socket.disconnect();
    })

    document.getElementById('sendToServer').addEventListener('click', () => {
        const messageToServer = document.getElementById('messageToServer').value;
        socket.emit('message', messageToServer);
        document.getElementById('messageToServer').value = '';
    })

    document.getElementById('validateByServer').addEventListener('click', () => {
        const wordToValidate = document.getElementById('wordInput').value;
        socket.emit('validate', wordToValidate);
        document.getElementById('wordInput').value = '';
    })

    document.getElementById('broadcastToServer').addEventListener('click', () => {
        const broadcastMessage = document.getElementById('messageBroadcast').value;
        socket.emit('broadcastAll', broadcastMessage);
        document.getElementById('messageBroadcast').value = '';
    })

    document.getElementById('joinRoomBtn').addEventListener('click', () => {
        socket.emit('joinRoom');
    })

    document.getElementById('messageToRoom').addEventListener('click', () => {
        const broadcastMessage = document.getElementById('messageRoom').value;
        socket.emit('roomMessage', broadcastMessage);
        document.getElementById('messageRoom').value = '';
    })
}

