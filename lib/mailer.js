'use strict';
const Config = require('./config');
const Fs = require('fs');
const Handlebars = require('handlebars');
const Markdown = require('nodemailer-markdown').markdown;
const Nodemailer = require('nodemailer');
const Path = require('path');

const templateCache = {};
const transport = Nodemailer.createTransport(Config.get('/nodemailer'));

transport.use('compile', Markdown({ useEmbeddedImages: true }));

class Mailer {
  static renderTemplate (signature, context, callback) {
    if (templateCache[signature]) {
      return callback(null, templateCache[signature](context));
    }

    const filePath = Path.resolve(__dirname, `emails/${signature}.hbs.md`);
    const options = { encoding: 'utf-8' };

    Fs.readFile(filePath, options, (err, source) => {
      if (err) {
        return callback(err);
      }

      templateCache[signature] = Handlebars.compile(source);
      callback(null, templateCache[signature](context));
    });
  }

  static sendEmail (options, template, context, callback) {
    this.renderTemplate(template, context, (err, content) => {
      if (err) {
        return callback(err);
      }

      options.from = Config.get('/mail/from');
      options.markdown = content;

      transport.sendMail(options, callback);
    });
  }
}

module.exports = Mailer;
