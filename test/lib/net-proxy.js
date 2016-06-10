'use strict';
const Code = require('code');
const Lab = require('lab');
const Net = require('net');
const NetProxy = require('../../lib/net-proxy');
const Portfinder = require('portfinder');

const lab = exports.lab = Lab.script();

lab.experiment('NetProxy Tls', () => {
  let port;

  lab.beforeEach((done) => {
    Portfinder.getPort((err, availablePort) => {
      port = availablePort;
      done(err);
    });
  });

  lab.test('it creates a tls proxy server', (done) => {
    const tlsProxyServer = NetProxy.createTlsServer(() => {});

    Code.expect(tlsProxyServer).to.exist();

    done();
  });

  lab.test('it handles a server error event', (done) => {
    const tlsProxyServer = NetProxy.createTlsServer(() => {});

    tlsProxyServer.on('error', () => {
      done();
    });

    tlsProxyServer.emit('error', Error('sorry pal'));
  });

  lab.test('it handles a socket error event', (done) => {
    const connectionHandler = function (socket, hostname, path) {
      socket.on('error', () => {
        done();
      });

      socket.emit('error', Error('sorry pal'));
    };
    const tlsProxyServer = NetProxy.createTlsServer(connectionHandler);

    tlsProxyServer.listen(port, () => {
      const socket = new Net.Socket();

      socket.connect(port, () => {
        socket.write('GET / HTTP/1.0\r\nHost: localhost\r\n\r\n');
      });
    });
  });

  lab.test('it parses the sni hostname successfully', (done) => {
    const connectionHandler = function (socket, hostname, path) {
      Code.expect(hostname).to.equal('cbks1.google.com');

      done();
    };
    const tlsProxyServer = NetProxy.createTlsServer(connectionHandler);

    tlsProxyServer.listen(port, () => {
      const socket = new Net.Socket();

      socket.connect(port, () => {
        let data = '16030100b7010000b303014f2d7b3fb3847e21eb29';
        data += '7c07f8a7c4621b5ebe664790961f9e9b2dd49d6c1ab60';
        data += '00048c00ac0140088008700390038c00fc00500840035';
        data += 'c007c009c011c01300450044006600330032c00cc00ec';
        data += '002c0040096004100040005002fc008c01200160013c0';
        data += '0dc003feff000a0201000041000000150013000010636';
        data += '26b73312e676f6f676c652e636f6dff01000100000a00';
        data += '080006001700180019000b00020100002300003374000';
        data += '0000500050100000000';

        socket.write(new Buffer(data, 'hex'));
      });
    });
  });
});

lab.experiment('NetProxy Tcp', () => {
  let port;

  lab.beforeEach((done) => {
    Portfinder.getPort((err, availablePort) => {
      port = availablePort;
      done(err);
    });
  });

  lab.test('it creates a tcp proxy server', (done) => {
    const tcpProxyServer = NetProxy.createTcpServer(() => {});

    Code.expect(tcpProxyServer).to.exist();

    done();
  });

  lab.test('it handles a server error event', (done) => {
    const tcpProxyServer = NetProxy.createTcpServer(() => {});

    tcpProxyServer.on('error', () => {
      done();
    });

    tcpProxyServer.emit('error', Error('sorry pal'));
  });

  lab.test('it handles a socket error event', (done) => {
    const connectionHandler = function (socket, hostname, path) {
      socket.on('error', () => {
        done();
      });

      socket.emit('error', Error('sorry pal'));
    };
    const tcpProxyServer = NetProxy.createTcpServer(connectionHandler);

    tcpProxyServer.listen(port, () => {
      const socket = new Net.Socket();

      socket.connect(port, () => {
        socket.write('GET / HTTP/1.0\r\nHo');

        setTimeout(() => {
          socket.write('st: localhost\r\n\r\n');
        }, 0);
      });
    });
  });

  lab.test('it ends a request when the hostname is missing', (done) => {
    const tcpProxyServer = NetProxy.createTcpServer(() => {});

    tcpProxyServer.listen(port, () => {
      const socket = new Net.Socket();

      socket.connect(port, () => {
        socket.write('GET / HTTP/1.0\r\n\r\n');
      });

      socket.on('close', (msg) => {
        done();
      });
    });
  });
});

lab.experiment('NetProxy host header parsing', () => {
  lab.test('it parses the hostname successfully', (done) => {
    const head = 'GET / HTTP/1.0\r\nHost: localhost\r\n\r\n\r\n';
    const hostname = NetProxy.parseHostFromHeader(head);

    Code.expect(hostname).to.be.equal('localhost');

    done();
  });

  lab.test('it returns null with an incomplete header', (done) => {
    const head = 'GET / HTTP/1.0\r\nHost: local';
    const hostname = NetProxy.parseHostFromHeader(head);

    Code.expect(hostname).to.be.equal(null);

    done();
  });

  lab.test('it returns undefined for a missing host header', (done) => {
    const head = 'GET / HTTP/1.0\r\n\r\n';
    const hostname = NetProxy.parseHostFromHeader(head);

    Code.expect(hostname).to.be.equal(undefined);

    done();
  });

  lab.test('it returns undefined for oversized request head', (done) => {
    let head = 'GET / HTTP/1.0\r\n';
    for (let i = 1000; i < 1500; i++) {
      head += `X-Custom-${i}: ${i}\r\n`;
    }
    head += '\r\n\r\n';

    const hostname = NetProxy.parseHostFromHeader(head);

    Code.expect(hostname).to.be.equal(undefined);

    done();
  });
});

lab.experiment('NetProxy path header parsing', () => {
  lab.test('it parses the path successfully', (done) => {
    const head = 'GET /friends HTTP/1.0\r\nHost: localhost\r\n\r\n\r\n';
    const path = NetProxy.parsePathFromHeader(head);

    Code.expect(path).to.be.equal('/friends');

    done();
  });

  lab.test('it returns empty string for missing path', (done) => {
    const head = 'Host: localhost\r\n\r\n\r\n';
    const path = NetProxy.parsePathFromHeader(head);

    Code.expect(path).to.be.equal('');

    done();
  });
});
