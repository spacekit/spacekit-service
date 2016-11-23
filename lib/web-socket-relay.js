'use strict';
const EventEmitter = require('events');
const Uuid = require('uuid');
const WebSocket = require('ws');

/**
 * A relay that tunnels multiple sockets into one WebSocket.
 * This is the server-side protocol of the relay that runs behind the firewall
 * on the client machine.
 *
 * Raw TCP streams are forwarded into the websocket using a simple protocol:
 *
 * socket.send(jsonHeader); // sent as string
 * socket.send(binaryBody); // sent as binary
 *
 * For now, these messages just proxy socket messages ('open', 'data', 'close').
 *
 * Events:
 *   - "bytes" (count)
 */
class WebSocketRelay extends EventEmitter {
  constructor (webSocket) {
    super();

    this.webSocket = webSocket;
    this.sockets = new Map();

    this.webSocket.on('close', () => {
      this.sockets.forEach((socket) => {
        socket.end();
      });
    });

    let currentMessageHeader = null;
    this.webSocket.on('message', (data) => {
      if (!currentMessageHeader) {
        currentMessageHeader = JSON.parse(data);
      } else {
        this.handleRelayMessage(currentMessageHeader, data);
        currentMessageHeader = null;
      }
    });
  }

  handleRelayMessage (header, data) {
    let socket = this.sockets.get(header.connectionId);
    if (!socket) {
      return;
    }

    switch (header.type) {
      case 'data':
        this.emit('bytes', data.length);
        socket.write(data);
        break;
      case 'close':
        socket.end();
        break;
    }
  }

  sendMessage (header, body) {
    if (this.webSocket.readyState === WebSocket.OPEN) {
      this.webSocket.send(JSON.stringify(header));
      this.webSocket.send(body || new Buffer(0));
    }
  }

  addSocket (socket, hostname, port) {
    let connectionId = Uuid.v4();

    this.sockets.set(connectionId, socket);

    this.sendMessage({
      connectionId: connectionId,
      type: 'open',
      hostname: hostname,
      port: port || 443
    }, null);

    socket.on('data', (data) => {
      this.sendMessage({
        connectionId: connectionId,
        type: 'data'
      }, data);
    });

    socket.on('close', () => {
      this.sockets.delete(connectionId);
      this.sendMessage({
        connectionId: connectionId,
        type: 'close'
      }, null);
    });

    socket.on('error', (err) => {
      this.webSocket.log.error(err, 'proxied socket error event');
    });
  }
}

module.exports = WebSocketRelay;
