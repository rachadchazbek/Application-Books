import { Server } from "app/server";
import { SocketManager } from "./socketManager.service";
import { assert, expect } from 'chai';
import * as sinon from 'sinon';
import { io as ioClient, Socket } from 'socket.io-client';
import { Container } from 'typedi';


const RESPONSE_DELAY = 200;
describe('SocketManager service tests', () => {
    let service: SocketManager;
    let server: Server;
    let clientSocket: Socket;

    const urlString = 'http://localhost:5020';

    beforeEach(async () => {
        server = Container.get(Server);
        server.init();
        service = server['socketManager'];
        clientSocket = ioClient(urlString);
        sinon.stub(console, "log"); //stop console.log
    });

    afterEach(() => {
        clientSocket.close();
        service['sio'].close();
        sinon.restore();
    });

    it('should handle a validate event and return true if word if longer than 5 letters', (done) => {
        const testMessage = 'Hello World';
        clientSocket.emit('validate', testMessage);
        clientSocket.on('wordValidated', (result: boolean) => {
            expect(result).to.be.true;
            done();
        });
    });

    it('should handle a validate event and return false if word if less than 5 letters', (done) => {
        const testMessage = 'Hello';
        clientSocket.emit('validate', testMessage);
        clientSocket.on('wordValidated', (result: boolean) => {
            expect(result).to.be.false;
            done();
        });
    });

    it('should handle a validateWithAck event and return an acknowledgment event', (done) => {
        const testMessage = 'HelloABC';
        const clientCallBack = (res: { isValid: boolean }) => {
            expect(res.isValid).to.be.true;
            done();
        }
        clientSocket.emit('validateWithAck', testMessage, clientCallBack);
    });

    it('should add the socket to the room after a join event', (done) => {
        clientSocket.emit('joinRoom');
        setTimeout(() => {
            const newRoomSize = service['sio'].sockets.adapter.rooms.get(service['room'])?.size;
            expect(newRoomSize).to.equal(1);
            done();
        }, RESPONSE_DELAY);
    });

    it('should not broadcast message to room if origin socket is not in room', (done) => {
        const testMessage = 'Hello World';
        const spy = sinon.spy(service['sio'], 'to');
        clientSocket.emit('roomMessage', testMessage);

        setTimeout(() => {
            assert(spy.notCalled);
            done();
        }, RESPONSE_DELAY);
    });

    it('should broadcast message to room if origin socket is in room', (done) => {
        const testMessage = 'Hello World';
        clientSocket.emit('joinRoom');
        clientSocket.emit('roomMessage', testMessage);

        clientSocket.on('roomMessage', (message: string) => {
            expect(message).to.contain(testMessage);
            done();
        });
    });

    it('should broadcast message to multiple clients on broadcastAll event', (done) => {
        const clientSocket2 = ioClient(urlString);
        const testMessage = 'Hello World';
        const spy = sinon.spy(service['sio'].sockets, 'emit');
        clientSocket.emit('broadcastAll', testMessage);

        clientSocket2.on('massMessage', (message: string) => {
            expect(message).to.contain(testMessage);
            assert(spy.called);
            done();
        });
    });


    it('should broadcast to all sockets when emiting time', () => {
        const spy = sinon.spy(service['sio'].sockets, 'emit');
        service['emitTime']();
        assert(spy.called);
    });

    it('should call emitTime on socket configuration', (done) => {
        const spy = sinon.spy(service, <any>'emitTime');
        clientSocket.on('clock', () => {
            assert(spy.called);
            done();
        });
    });
})