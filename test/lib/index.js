'use strict';
const Code = require('code');
const Config = require('../../lib/config');
const Http = require('http');
const Https = require('https');
const Lab = require('lab');
const Pem = require('pem');
const Proxyquire = require('proxyquire');
const WebSocket = require('ws');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

const lab = exports.lab = Lab.script();
const stub = {
  Session: {},
  DynamicDns: {}
};
const SpaceKitService = Proxyquire('../../lib/index', {
  './db/session': stub.Session,
  './dynamic-dns': stub.DynamicDns
});
const service = new SpaceKitService();
const fetchPems = function (domain, callback) {
  const config = {
    days: 90,
    commonName: domain
  };

  Pem.createCertificate(config, (err, keys) => {
    if (err) {
      return callback(err);
    }

    const cert = {
      privkey: keys.serviceKey,
      fullchain: keys.certificate,
      ca: undefined,
      expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 90
    };

    callback(null, cert);
  });
};
const rootCert = service.getCertificate('spacekit.io');
const apiCert = service.getCertificate('api.spacekit.io');
const webCert = service.getCertificate('www.spacekit.io');
const testCert = service.getCertificate('test.spacekit.io');

rootCert.fetchPems = fetchPems.bind(rootCert, 'spacekit.io');
apiCert.fetchPems = fetchPems.bind(apiCert, 'api.spacekit.io');
webCert.fetchPems = fetchPems.bind(webCert, 'www.spacekit.io');
testCert.fetchPems = fetchPems.bind(testCert, 'test.spacekit.io');

lab.experiment('SpaceKitService certificate helpers', () => {
  lab.test('it gets a certificate when the cache misses and then hits', (done) => {
    const cacheMiss = service.getCertificate('test.spacekit.io');
    Code.expect(cacheMiss).to.exist();

    const cacheHit = service.getCertificate('test.spacekit.io');
    Code.expect(cacheHit).to.exist();

    done();
  });

  lab.test('it handles the sniCallback by producing the secure context', (done) => {
    service.sniCallback('test.spacekit.io', (err, secureContext) => {
      Code.expect(err).to.not.exist();
      Code.expect(secureContext).to.exist();

      done();
    });
  });
});

lab.experiment('WebSocketserver event handlers', () => {
  lab.test('it sets the access control header on the headers event', (done) => {
    const headerState = {};

    const headerEventHandler = function () {
      service.wss.removeListener('headers', headerEventHandler);

      Code.expect(headerState).to.have.length(1);

      done();
    };

    service.wss.on('headers', headerEventHandler);

    Code.expect(headerState).to.have.length(0);

    service.wss.emit('headers', headerState);
  });

  lab.test('it executes the error event handler', (done) => {
    const errorEventHandler = function () {
      service.wss.removeListener('headers', errorEventHandler);

      done();
    };

    service.wss.on('error', errorEventHandler);

    service.wss.emit('error', Error('sorry pal'));
  });
});

lab.experiment('WebSocketserver handle tls connnection', () => {
  lab.test('it emits a connection event to the api server', (done) => {
    const connectionHandler = function (socket) {
      service.apiHttpServer.removeListener('connection', connectionHandler);

      done();
    };

    service.apiHttpServer.on('connection', connectionHandler);

    const options = {
      hostname: '127.0.0.1',
      port: Config.get('/service/ports/https'),
      path: '/',
      method: 'GET',
      headers: {
        host: service.apiHostname
      }
    };

    const req = Https.request(options, () => {});

    req.on('error', (err) => {
      done(err);
    });

    req.end();
  });

  lab.test('it emits a connection event to the web server', (done) => {
    const connectionHandler = function (socket) {
      service.webHttpServer.removeListener('connection', connectionHandler);

      done();
    };

    service.webHttpServer.on('connection', connectionHandler);

    const options = {
      hostname: '127.0.0.1',
      port: Config.get('/service/ports/https'),
      path: '/',
      method: 'GET',
      headers: {
        host: service.webHostname
      }
    };

    const req = Https.request(options, () => {});

    req.on('error', (err) => {
      done(err);
    });

    req.end();
  });

  lab.test('it emits a connection event to the web server for the root domain', (done) => {
    const connectionHandler = function (socket) {
      service.webHttpServer.removeListener('connection', connectionHandler);

      done();
    };

    service.webHttpServer.on('connection', connectionHandler);

    const options = {
      hostname: '127.0.0.1',
      port: Config.get('/service/ports/https'),
      path: '/',
      method: 'GET',
      headers: {
        host: service.domain
      }
    };

    const req = Https.request(options, () => {});

    req.on('error', (err) => {
      done(err);
    });

    req.end();
  });

  lab.test('it closes the socket when no relays match', (done) => {
    const options = {
      hostname: '127.0.0.1',
      port: Config.get('/service/ports/https'),
      path: '/',
      method: 'GET',
      headers: {
        host: 'miss.relay.spacekit.io'
      }
    };

    const req = Https.request(options, () => {});

    req.on('error', (err) => {
      Code.expect(err).to.exist();

      done();
    });

    req.end();
  });

  lab.test('it adds the socket to the matching relay', (done) => {
    const mockRelay = {
      addSocket: function () {
        service.relays.delete('hit.relay.spacekit.io');

        done();
      }
    };

    service.relays.set('hit.relay.spacekit.io', mockRelay);

    const options = {
      hostname: '127.0.0.1',
      port: Config.get('/service/ports/https'),
      path: '/',
      method: 'GET',
      headers: {
        host: 'hit.relay.spacekit.io'
      }
    };

    const req = Https.request(options, () => {});

    req.on('error', (err) => {
      done(err);
    });

    req.end();
  });
});

lab.experiment('WebSocketserver handle tcp connnection', () => {
  lab.test('it replies with 301 for requests to the root domain', (done) => {
    const options = {
      hostname: '127.0.0.1',
      port: Config.get('/service/ports/http'),
      path: '/',
      method: 'GET',
      headers: {
        host: service.domain
      }
    };

    const req = Http.request(options, (res) => {
      Code.expect(res.statusCode).to.equal(301);
      Code.expect(res.headers.location).to.include(service.webHostname);

      done();
    });

    req.on('error', (err) => {
      done(err);
    });

    req.end();
  });

  lab.test('it replies with 301 for all other non-challenge requests', (done) => {
    const path = '/path/to/thing';
    const host = 'home.pal.spacekit.io';
    const options = {
      hostname: '127.0.0.1',
      port: Config.get('/service/ports/http'),
      path: path,
      method: 'GET',
      headers: {
        host: host
      }
    };

    const req = Http.request(options, (res) => {
      Code.expect(res.statusCode).to.equal(301);
      Code.expect(res.headers.location).to.include(host);
      Code.expect(res.headers.location).to.include(path);

      done();
    });

    req.on('error', (err) => {
      done(err);
    });

    req.end();
  });

  lab.test('it replies with the acme challenge answer for the api subdomain', (done) => {
    const path = '/.well-known/acme-challenge/abcxyz';
    const options = {
      hostname: '127.0.0.1',
      port: Config.get('/service/ports/http'),
      path: path,
      method: 'GET',
      headers: {
        host: service.apiHostname
      }
    };

    const req = Http.request(options, (res) => {
      Code.expect(res.statusCode).to.equal(200);

      let body = '';

      res.setEncoding('utf8');

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        Code.expect(body.length).to.be.above(0);

        done();
      });
    });

    req.on('error', (err) => {
      done(err);
    });

    req.end();
  });

  lab.test('it replies with the acme challenge answer for the web subdomain', (done) => {
    const path = '/.well-known/acme-challenge/abcxyz';
    const options = {
      hostname: '127.0.0.1',
      port: Config.get('/service/ports/http'),
      path: path,
      method: 'GET',
      headers: {
        host: service.webHostname
      }
    };

    const req = Http.request(options, (res) => {
      Code.expect(res.statusCode).to.equal(200);

      let body = '';

      res.setEncoding('utf8');

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        Code.expect(body.length).to.be.above(0);

        done();
      });
    });

    req.on('error', (err) => {
      done(err);
    });

    req.end();
  });

  lab.test('it closes the socket when no relays match', (done) => {
    const path = '/.well-known/acme-challenge/abcxyz';
    const options = {
      hostname: '127.0.0.1',
      port: Config.get('/service/ports/http'),
      path: path,
      method: 'GET',
      headers: {
        host: 'miss.relay.spacekit.io'
      }
    };

    const req = Http.request(options, () => {});

    req.on('error', (err) => {
      Code.expect(err).to.exist();

      done();
    });

    req.end();
  });

  lab.test('it adds the socket to the matching relay', (done) => {
    const mockRelay = {
      addSocket: function () {
        service.relays.delete('hit.relay.spacekit.io');

        done();
      }
    };

    service.relays.set('hit.relay.spacekit.io', mockRelay);

    const path = '/.well-known/acme-challenge/abcxyz';
    const options = {
      hostname: '127.0.0.1',
      port: Config.get('/service/ports/http'),
      path: path,
      method: 'GET',
      headers: {
        host: 'hit.relay.spacekit.io'
      }
    };

    const req = Http.request(options, () => {});

    req.on('error', (err) => {
      done(err);
    });

    req.end();
  });
});

lab.experiment('WebSocketserver relay connnection', () => {
  const port = Config.get('/service/ports/https');
  const wsHost = `wss://127.0.0.1:${port}/`;
  const wsProtocol = 'spacekit';
  const wsOptions = {
    headers: {
      'host': service.apiHostname,
      'x-spacekit-subdomain': 'relay',
      'x-spacekit-username': 'pal',
      'x-spacekit-apikey': 'youwish'
    }
  };
  const relayHostname = `relay.pal.${service.domain}`;

  lab.test('it closes the websocket when authentication goes boom', (done) => {
    const authenticate = stub.Session.authenticate;

    stub.Session.authenticate = function (username, authKey, callback) {
      stub.Session.authenticate = authenticate;

      callback(Error('sorry pal'));
    };

    const ws = new WebSocket(wsHost, wsProtocol, wsOptions);

    ws.on('close', () => {
      done();
    });

    ws.on('error', (err) => {
      done(err);
    });
  });

  lab.test('it closes the websocket when authentication fails', (done) => {
    const authenticate = stub.Session.authenticate;

    stub.Session.authenticate = function (username, authKey, callback) {
      stub.Session.authenticate = authenticate;

      callback(null, false);
    };

    const ws = new WebSocket(wsHost, wsProtocol, wsOptions);

    ws.on('close', () => {
      done();
    });

    ws.on('error', (err) => {
      done(err);
    });
  });

  lab.test('it closes an existing websocket when another connects with the same credentials', (done) => {
    const authenticate = stub.Session.authenticate;

    stub.Session.authenticate = function (username, authKey, callback) {
      stub.Session.authenticate = authenticate;

      callback(null, true);
    };

    const upsert = stub.DynamicDns.upsert;

    stub.DynamicDns.upsert = function (hostname, callback) {
      stub.DynamicDns.upsert = upsert;

      callback(null);
    };

    const ws1 = new WebSocket(wsHost, wsProtocol, wsOptions);

    ws1.on('close', () => {
      done();
    });

    ws1.on('error', (err) => {
      done(err);
    });

    const ws2 = new WebSocket(wsHost, wsProtocol, wsOptions);

    ws2.on('error', (err) => {
      done(err);
    });
  });

  lab.test('it handles the websocket error event', (done) => {
    const authenticate = stub.Session.authenticate;

    stub.Session.authenticate = function (username, authKey, callback) {
      stub.Session.authenticate = authenticate;

      callback(null, true);
    };

    const upsert = stub.DynamicDns.upsert;

    stub.DynamicDns.upsert = function (hostname, callback) {
      stub.DynamicDns.upsert = upsert;

      callback(null);
    };

    const ws = new WebSocket(wsHost, wsProtocol, wsOptions);

    ws.on('open', () => {
      const relay = service.relays.get(relayHostname);

      relay.webSocket.emit('error', Error('sorry pal'));

      done();
    });

    ws.on('error', (err) => {
      done(err);
    });
  });

  lab.test('it closes the websocket when dynamic dns goes boom', (done) => {
    const authenticate = stub.Session.authenticate;

    stub.Session.authenticate = function (username, authKey, callback) {
      stub.Session.authenticate = authenticate;

      callback(null, true);
    };

    const upsert = stub.DynamicDns.upsert;

    stub.DynamicDns.upsert = function (hostname, callback) {
      stub.DynamicDns.upsert = upsert;

      callback(Error('sorry pal'));
    };

    const ws = new WebSocket(wsHost, wsProtocol, wsOptions);

    ws.on('close', () => {
      done();
    });

    ws.on('error', (err) => {
      done(err);
    });
  });
});

lab.experiment('SpaceKitService close', () => {
  lab.test('it closes all the servers', (done) => {
    service.close();

    done();
  });
});
