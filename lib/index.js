'use strict';
const ApiServer = require('./api/index');
const CreateLogger = require('./create-logger');
const Config = require('./config');
const DynamicDns = require('./dynamic-dns');
const Https = require('https');
const NetProxy = require('./net-proxy');
const Session = require('./db/session');
const TlsCertificate = require('./tls-certificate');
const WebServer = require('./web/index');
const WebSocketRelay = require('./web-socket-relay');
const WebSocketServer = require('ws').Server;

const log = CreateLogger('SpaceKitService');

/**
 * The SpaceKitService listens for TLS connections. Depending on the hostname
 * (provided by SNI) of the connection, we'll do the following:
 *
 * If the hostname of the incoming connection is the hostname of
 * SpaceKitService, we will handle the request ourselves (either a WebSocket or
 * HTTPS request).
 *
 * Otherwise, we will transparently proxy that connection to one of the
 * connected client relays serving the requested hostname (if available).
 *
 * If configured, SpaceKitService will act as a dynamic DNS service, updating
 * DNS records to the appropriate client relay.
 */
class SpaceKitService {
  constructor () {
    this.domain = Config.get('/service/domain');
    this.apiHostname = Config.get('/service/subdomains/api');
    this.webHostname = Config.get('/service/subdomains/web');
    this.certificates = new Map();
    this.servers = [];
    this.relays = new Map(); // hostname -> WebSocketRelay

    // Fill the tlsPorts array.
    const tlsPorts = [];
    const rangeStart = Config.get('/service/ports/range/start');
    const rangeEnd = Config.get('/service/ports/range/end');
    tlsPorts.push(Config.get('/service/ports/https'));
    for (let i = rangeStart; i <= rangeEnd; i++) {
      tlsPorts.push(i);
    }

    // Listen for incoming Tls connections.
    tlsPorts.forEach((port) => {
      const tlsServer = NetProxy.createTlsServer(this.handleTlsConnection.bind(this, port));
      tlsServer.listen(port);
      this.servers.push(tlsServer);
    });

    // Listen for incoming Tcp connections.
    const tcpServer = NetProxy.createTcpServer(this.handleTcpConnection.bind(this));
    tcpServer.listen(Config.get('/service/ports/http'));
    this.servers.push(tcpServer);

    // An HTTPS server will handle api requests and relay WebSocket upgrades.
    // Note: This server doesn't actually bind itself to a port; we hand it
    // established connections from a TLS proxy handler.
    this.apiHttpServer = Https.createServer({
      SNICallback: this.sniCallback.bind(this)
    });
    this.apiServer = ApiServer(this.apiHttpServer);

    // A WebSocket server will handle relay client connections for the api
    // server.
    this.wss = new WebSocketServer({ server: this.apiHttpServer });
    this.wss.on('connection', this.authenticateRelayConnection.bind(this));
    this.wss.on('headers', (headers) => {
      headers['Access-Control-Allow-Origin'] = '*';
    });
    this.wss.on('error', (err) => {
      log.error(err, 'WebSocketServer error event');
    });

    // An HTTPS server will handle website requests. Note: This server doesn't
    // actually bind itself to a port; we hand it established connections from
    // a TLS proxy handler.
    this.webHttpServer = Https.createServer({
      SNICallback: this.sniCallback.bind(this)
    });
    this.webServer = WebServer(this.webHttpServer);

    log.info('the service has started');
  }

  /**
   * Closes all the servers
   */
  close () {
    this.servers.forEach((server) => {
      server.close();
    });
  }

  /**
   * Gets the TlsCertificate for a hostname or creates one if it doesn't exist.
   */
  getCertificate (hostname) {
    const cacheHit = this.certificates.get(hostname);

    if (cacheHit) {
      return cacheHit;
    }

    const cert = new TlsCertificate(hostname);

    this.certificates.set(hostname, cert);

    return cert;
  }

  /**
   * Handles the SNI callback for our https servers
   */
  sniCallback (serverName, cb) {
    this.getCertificate(serverName).getSecureContext(cb);
  }

  /**
   * Handle a TLS connection that needs to be forwarded to `hostname`.
   *
   * If this connection's hostname is one of SpaceKit's services, we forward
   * the request to our own HTTPS server.
   *
   * Otherwise, pass the connection onto a client relay for that hostname, if
   * one is available.
   */
  handleTlsConnection (serverPort, socket, hostname) {
    log.info({ for: hostname }, 'new Tls connection');

    if (hostname === this.apiHostname) {
      this.apiHttpServer.emit('connection', socket);
    } else if (hostname === this.webHostname || hostname === this.domain) {
      // this.webServer will ensure the "www." subdomain redirect
      this.webHttpServer.emit('connection', socket);
    } else {
      const relay = this.relays.get(hostname);

      if (!relay) {
        socket.end();
        return;
      }

      relay.addSocket(socket, hostname, serverPort);
    }
  }

  /**
   * Handle an insecure connection that needs to be forwarded to `hostname`.
   *
   * If this connection's hostname is one of SpaceKit's services, we redirect
   * the request to the secure location.
   *
   * Otherwise we forward ACME certificate exchange requests to a connected
   * relay, so that users can run providers like Let's Encrypt themselves to
   * receive certificates.
   */
  handleTcpConnection (socket, hostname, path) {
    log.info({ for: hostname, path: path }, 'new tcp connection');

    if (hostname === this.domain) {
      // redirect to https
      socket.end(`HTTP/1.1 301\r\nLocation: https://${this.webHostname}${path}\r\n\r\n`);
    } else if (path.startsWith('/.well-known/acme-challenge/')) {
      // handle ACME challenges for our own web and api servers
      if (hostname === this.apiHostname || hostname === this.webHostname) {
        const cert = this.getCertificate(hostname);

        socket.end('HTTP/1.0 200 OK\r\n\r\n' + cert.challengeValue);
      } else {
        // relays handle their own challenge requests
        const relay = this.relays.get(hostname);

        if (!relay) {
          socket.end();
          return;
        }

        relay.addSocket(socket, hostname, Config.get('/service/ports/http'));
      }
    } else {
      // redirect all other requests to https
      socket.end(`HTTP/1.1 301\r\nLocation: https://${hostname}${path}\r\n\r\n`);
    }
  }

  /**
   * Authenticate an incoming connection from a client relay.
   */
  authenticateRelayConnection (webSocket) {
    const subdomain = webSocket.upgradeReq.headers['x-spacekit-subdomain'];
    const username = webSocket.upgradeReq.headers['x-spacekit-username'];
    const authKey = webSocket.upgradeReq.headers['x-spacekit-authkey'];
    const hostname = `${subdomain}.${username}.${this.domain}`;
    const existingRelay = this.relays.get(hostname);

    webSocket.log = log.child({ for: hostname });

    if (existingRelay) {
      webSocket.log.info('existing relay found, closing it');
      existingRelay.webSocket.close(1001); // 1001 (going away)
    }

    Session.authenticate(username, authKey, (err, success) => {
      if (err) {
        webSocket.log.error(err, 'relay auth failed (query error)');
        return webSocket.close();
      }

      if (success === false) {
        webSocket.log.info('relay auth failed');
        webSocket.close();
        return;
      }

      webSocket.log.info('relay auth success');

      this.handleRelayConnection(webSocket, hostname);
    });
  }

  /**
   * Handle an authenticated connection from a client relay.
   *
   * The webSocket here will send events to any TLS sockets it is associated
   * with. (that magic happens in WebSocketRelay)
   *
   * Finally, update DNS records.
   */
  handleRelayConnection (webSocket, hostname) {
    const relay = new WebSocketRelay(webSocket);

    this.relays.set(hostname, relay);

    webSocket.on('error', (err) => {
      webSocket.log.error({ err: err }, 'relay web socket error event');
    });

    webSocket.on('close', () => {
      this.relays.delete(hostname);
    });

    DynamicDns.upsert(hostname, (err, data) => {
      if (err) {
        log.error(err, 'dynamic dns error');
        return webSocket.close();
      }

      log.info('dynamic dns upsert success');
    });
  }
}

module.exports = SpaceKitService;
