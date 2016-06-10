'use strict';
const EventEmitter = require('events');
const Uuid = require('node-uuid');
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

    let currentMessageHeader;

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
    const socket = this.sockets.get(header.connectionId);

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
    const connectionId = Uuid.v4();

    this.sockets.set(connectionId, socket);

    const openHeader = {
      connectionId: connectionId,
      type: 'open',
      hostname: hostname,
      port: port
    };

    this.sendMessage(openHeader, null);

    socket.on('data', (data) => {
      const dataHeader = {
        connectionId: connectionId,
        type: 'data'
      };

      this.sendMessage(dataHeader, data);
    });

    socket.on('close', () => {
      this.sockets.delete(connectionId);

      const closeHeader = {
        connectionId: connectionId,
        type: 'close'
      };

      this.sendMessage(closeHeader, null);
    });

    socket.on('error', (err) => {
      this.webSocket.log.error(err, 'proxied socket error event');
    });
  }
}

module.exports = WebSocketRelay;
