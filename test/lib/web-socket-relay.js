'use strict';
const Async = require('async');
const Code = require('code');
const Http = require('http');
const Lab = require('lab');
const Net = require('net');
const Portfinder = require('portfinder');
const WebSocket = require('ws');
const WebSocketRelay = require('../../lib/web-socket-relay');
const WebSocketServer = require('ws').Server;

const lab = exports.lab = Lab.script();

lab.experiment('WebSocketRelay', () => {
  let client;
  let httpServer;
  let port;
  let relay;
  let wsServer;
  let tcpServer;
  let currentSocket;

  lab.before((done) => {
    Async.auto({
      port: function (done) {
        Portfinder.getPort(done);
      },
      server: ['port', function (results, done) {
        port = results.port;

        tcpServer = Net.createServer((socket) => {
          if (!relay) {
            httpServer.emit('connection', socket);
          } else {
            currentSocket = socket;
            relay.addSocket(socket, 'pal', port);
          }
        });

        httpServer = Http.createServer((req, res) => {
          res.end();
        });

        wsServer = new WebSocketServer({ server: httpServer });

        wsServer.on('connection', (webSocket) => {
          relay = new WebSocketRelay(webSocket);
        });

        wsServer.on('error', (err) => {
          console.error('WebSocketServer error', err);
        });

        tcpServer.listen(port, done);
      }]
    }, done);
  });

  lab.test('it creates a new relay when the client connects', (done) => {
    client = new WebSocket(`ws://localhost:${port}`);

    client.on('open', () => {
      Code.expect(relay).to.be.an.object();

      done();
    });
  });

  lab.test('it adds new sockets to the relay', (done) => {
    const socket = new Net.Socket();

    socket.connect(port, () => {
      Code.expect(relay.sockets.size).to.be.greaterThan(0);

      socket.destroy();
      done();
    });
  });

  lab.test('it relays a message', (done) => {
    let currentHeader;

    const messageHandler = function (data) {
      if (!currentHeader) {
        currentHeader = JSON.parse(data.toString());
      } else if (currentHeader.type === 'data') {
        Code.expect(data.toString()).to.be.equal('hey pal');

        client.removeListener('message', messageHandler);
        currentHeader = null;
        socket.destroy();
        done();
      } else {
        currentHeader = null;
      }
    };

    client.on('message', messageHandler);

    const socket = new Net.Socket();

    socket.connect(port, () => {
      socket.write('hey pal');
    });
  });

  lab.test('it handles a relayed message', (done) => {
    let currentHeader;
    let connectionId;

    const messageHandler = function (data) {
      if (!currentHeader) {
        currentHeader = JSON.parse(data.toString());
      } else if (currentHeader.type === 'data') {
        if (data.toString() === 'remember me') {
          connectionId = currentHeader.connectionId;
        }

        currentHeader = null;

        client.removeListener('message', messageHandler);

        client.send(`{
          "connectionId":"${connectionId}",
          "type": "data"
        }`);
        client.send('hey friend');
        client.send(`{
          "connectionId":"${connectionId}",
          "type": "close"
        }`);
        client.send(new Buffer(0));
      } else {
        currentHeader = null;
      }
    };

    client.on('message', messageHandler);

    const socket = new Net.Socket();

    socket.on('data', (data) => {
      Code.expect(data.toString()).to.be.equal('hey friend');
    });

    socket.on('close', (data) => {
      socket.destroy();
      done();
    });

    socket.connect(port, () => {
      socket.write('remember me');
    });
  });

  lab.test('it handles the error event for socket connections', (done) => {
    relay.webSocket.log = {
      error: function () {
        relay.webSocket.log = null;

        done();
      }
    };

    const socket = new Net.Socket();

    socket.connect(port, () => {
      currentSocket.emit('error', Error('sorry pal'));
    });
  });

  lab.test('it returns early from handling a message when the socket lookup misses', (done) => {
    relay.handleRelayMessage({ connectionId: 'blamo' }, null);

    done();
  });

  lab.test('it closes sockets when the client closes', (done) => {
    const socket = new Net.Socket();

    socket.on('close', (data) => {
      done();
    });

    socket.connect(port, () => {
      client.close();
    });
  });

  lab.test('it skips sending a message if the client connection is not open', (done) => {
    relay.sendMessage(null, null);

    done();
  });
});
