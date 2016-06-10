'use strict';
const CreateLogger = require('./create-logger');
const Net = require('net');
const Sni = require('sni');

const log = CreateLogger('NetProxy');

class NetProxy {
  /**
   * Create a server that extracts the hostname from incoming TLS (SNI)
   * connections, puts the data back on the socket, and hands you back the
   * socket and hostname.
   *
   * @param {function(socket, hostname)} connectionHandler
   * @return {Net.Server}
   */
  static createTlsServer (connectionHandler) {
    const server = Net.createServer((socket) => {
      socket.on('error', (err) => {
        log.error(err, 'proxied socket error');
      });

      socket.once('data', (initialData) => {
        socket.pause();
        socket.unshift(initialData);

        const hostname = Sni(initialData);

        connectionHandler(socket, hostname);

        socket.resume();
      });
    });

    server.on('error', (err) => {
      log.error(err, 'tls server error');
    });

    return server;
  }

  /**
   * Create a server that extracts the hostname and path from incoming tcp
   * connections, puts the data back on the socket, and hands you back the
   * socket and hostname.
   *
   * @param {function(socket, hostname, path)} connectionHandler
   * @return {Net.Server}
   */
  static createTcpServer (connectionHandler) {
    const server = Net.createServer((socket) => {
      socket.on('error', (err) => {
        log.error(err, 'proxied socket error');
      });

      let head = '';

      socket.on('data', (data) => {
        head += data.toString('ascii');

        const hostname = NetProxy.parseHostFromHeader(head);

        if (hostname === undefined) {
          const message = 'Parsing exception';
          socket.end(`HTTP/1.1 500 ${message}\r\n\r\n${message}`);
        } else if (hostname === null) {
          // waiting for more data
        } else {
          const path = NetProxy.parsePathFromHeader(head);

          socket.removeAllListeners('data');
          socket.pause();
          socket.unshift(new Buffer(head, 'ascii'));

          connectionHandler(socket, hostname, path);

          socket.resume();
        }
      });
    });

    server.on('error', (err) => {
      log.error(err, 'tcp server error');
    });

    return server;
  }

  static parseHostFromHeader (head) {
    const hostMatch = /^Host:\s*(.*?)\r\n/im.exec(head);

    if (hostMatch) {
      return hostMatch[1];
    } else if (head.length > 8 * 1024) {
      const err = Error('header too long');
      log.error(err, 'potentially malicious socket');
      return undefined;
    } else if (head.indexOf('\r\n\r\n') !== -1) {
      const err = Error('no hostname provided');
      log.error(err, 'potentially malicious socket');
      return undefined;
    } else {
      return null;
    }
  }

  static parsePathFromHeader (head) {
    const pathMatch = /^[A-Za-z]+\s+(.*?)\s/.exec(head);

    if (pathMatch) {
      return pathMatch[1];
    } else {
      return '';
    }
  }
}

module.exports = NetProxy;
