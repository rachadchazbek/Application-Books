import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { Socket } from 'socket.io-client';
import { AppComponent } from './app.component';
import { SocketTestHelper } from './classes/socket-test-helper';
import { SocketClientService } from './services/socket-client.service';

class SocketClientServiceMock extends SocketClientService {
  override connect() { }
}

describe('AppComponent', () => {
  let component: AppComponent;
  let socketServiceMock: SocketClientServiceMock;
  let socketHelper: SocketTestHelper;
  beforeEach(async () => {
    socketHelper = new SocketTestHelper();
    socketServiceMock = new SocketClientServiceMock();
    socketServiceMock.socket = socketHelper as unknown as Socket;
    await TestBed.configureTestingModule({
      declarations: [AppComponent],
      providers: [{ provide: SocketClientService, useValue: socketServiceMock }],
      imports: [FormsModule],
    }).compileComponents();


  });

  beforeEach(() => {
    const fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should get the id of the socket', () => {
    socketServiceMock.socket.id = "123";
    const socketId = component.socketId;
    expect(socketId).toEqual("123");
  })

  describe('Receiving events', () => {
    it('should handle connect event', () => {
      const consoleSpy = spyOn(console, 'log').and.callThrough();
      socketHelper.peerSideEmit("connect");
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should handle hello event with a message from the server', () => {
      const serverMessage = 'test';
      socketHelper.peerSideEmit("hello", serverMessage);
      expect(component.serverMessage).toBe(serverMessage);
    });

    it('should handle clock event with a time from the Server', () => {
      const serverTime = new Date();
      socketHelper.peerSideEmit("clock", serverTime);
      expect(component.serverClock).toBe(serverTime);
    });

    it('should handle wordValidated event with a false message from server', () => {
      const serverValidation = false;
      socketHelper.peerSideEmit("wordValidated", serverValidation);
      expect(component.serverValidationResult).toContain('invalide');
    });

    it('should handle wordValidated event with a true message from server', () => {
      const serverValidation = true;
      socketHelper.peerSideEmit("wordValidated", serverValidation);
      expect(component.serverValidationResult).toContain('valide');
    });

  })

  describe('Emiting events', () => {
    it('should add a message to serverMessages array from server on massMessage event', () => {
      const serverMessage = 'message 1';
      socketHelper.peerSideEmit("massMessage", serverMessage);
      expect(component.serverMessages.length).toBe(1);
      expect(component.serverMessages).toContain(serverMessage);
    });

    it('should add multiple messages to serverMessages array from server on multiple massMessage events', () => {
      const serverMessages = ['message 1', 'message 2', 'message 3'];
      serverMessages.forEach(message => socketHelper.peerSideEmit("massMessage", message));
      expect(component.serverMessages.length).toBe(serverMessages.length);
      expect(component.serverMessages).toEqual(serverMessages);
    });

    it('should add a message to roomMessages array from server on roomMessage event', () => {
      const roomMessage = 'message 1';
      socketHelper.peerSideEmit("roomMessage", roomMessage);
      expect(component.roomMessages.length).toBe(1);
      expect(component.roomMessages).toContain(roomMessage);
    });

    it('should add multiple messages to roomMessages array from server on multiple roomMessage events', () => {
      const roomMessages = ['message 1', 'message 2', 'message 3'];
      roomMessages.forEach(message => socketHelper.peerSideEmit("roomMessage", message));
      expect(component.roomMessages.length).toBe(roomMessages.length);
      expect(component.roomMessages).toEqual(roomMessages);
    });

    it('should send a word to server and reset wordInput with a valide event', () => {
      const spy = spyOn(component.socketService, "send");
      const eventName = "validate";
      const testString = 'test';
      component.wordInput = testString;
      component.sendWordValidation();
      expect(spy).toHaveBeenCalledWith(eventName, testString);
      expect(component.wordInput).toEqual('');
    });

    it('should send an invalid word to server and handle the response with an acknowledgment', () => {
      const spy = spyOn(component.socketService, "send").and.callFake((event, data, cb:Function) => {
        cb({ isValid: false });
      });
      const eventName = 'validateWithAck';
      const testString = 'test';
      component.wordInputAck = testString;
      component.sendWorldValidationAck();
      expect(spy).toHaveBeenCalledWith(eventName, testString, jasmine.any(Function));
      expect(component.wordInputAck).toEqual('');
      expect(component.serverValidationResultAck.endsWith(' invalide')).toBeTrue();
    });

    it('should send a valid word to server and handle the response with an acknowledgment', () => {
      const spy = spyOn(component.socketService, "send").and.callFake((event, data, cb:Function) => {
        cb({ isValid: true });
      });
      const eventName = 'validateWithAck';
      const testString = 'test';
      component.wordInputAck = testString;
      component.sendWorldValidationAck();
      expect(spy).toHaveBeenCalledWith(eventName, testString, jasmine.any(Function));
      expect(component.wordInputAck).toEqual('');
      expect(component.serverValidationResultAck.endsWith(' valide')).toBeTrue();
    });

    it('should send a broadcast message to server and reset broadcastMessage with a broadcastAll event', () => {
      const spy = spyOn(component.socketService, "send");
      const eventName = 'broadcastAll';
      const testString = 'test';
      component.broadcastMessage = testString;
      component.broadcastMessageToAll();
      expect(spy).toHaveBeenCalledWith(eventName, testString);
      expect(component.broadcastMessage).toEqual('');
    });

    it('should send a message to a specific room on the server and reset roomMessage with a roomMessage event', () => {
      const spy = spyOn(component.socketService, "send");
      const eventName = 'roomMessage';
      const testString = 'test';
      component.roomMessage = testString;
      component.sendToRoom();
      expect(spy).toHaveBeenCalledWith(eventName, testString);
      expect(component.roomMessage).toEqual('');
    });

    it('should send a joinRoom event', () => {
      const spy = spyOn(component.socketService, "send");
      const eventName = "joinRoom";
      component.joinRoom();
      expect(spy).toHaveBeenCalledWith(eventName);
    })
  })

});
