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

            socket.on('getSparqlAuthorData', (sparqlQuery: string) => {
                const url = 'https://query.wikidata.org/sparql?query=' + encodeURIComponent(sparqlQuery) + '&format=json';
                fetch(url)
                .then(response => response.json())
                .then(data => {
                    socket.emit('sparqlResultsAuthor', data);
                    // Log the data to the console
                    console.log(data);
                });
            });            

            socket.on('getSparqlData', (sparqlQuery: string) => {
                console.log('In Server');
                console.log(sparqlQuery);
                const repositoryUrl = 'http://Rachads-MacBook-Pro-2.local:7200/repositories/Books-app';  // <-- change made here
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
