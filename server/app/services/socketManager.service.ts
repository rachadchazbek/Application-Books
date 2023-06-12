import * as io from 'socket.io';
import * as http from 'http';
import axios from 'axios';

export class SocketManager {

    private sio: io.Server;
    constructor(server: http.Server) {
        this.sio = new io.Server(server, { cors: { origin: '*', methods: ["GET", "POST"] } });
    }

    public handleSockets(): void {
        this.sio.on('connection', (socket) => {
            console.log(`Connexion par l'utilisateur avec id : ${socket.id}`)

            socket.on('getSparqlData', (sparqlQuery: string) => {
                console.log('In Server');
                const repositoryUrl = 'http://localhost:7200/repositories/BookDB_PBS';  // <-- change made here
                axios.post(repositoryUrl, sparqlQuery, {
                    headers: {
                        'Content-Type': 'application/sparql-query',
                        'Accept': 'application/sparql-results+json'
                    }
                })
                .then((response: any) => {
                    socket.emit('sparqlResults', response.data);
                    console.log(response.data);
                })
                .catch((error: any) => {
                    console.error(error);
                    socket.emit('sparqlError', error.message);
                });
            });
        });
    }
}
