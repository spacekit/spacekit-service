# SpaceKit Service

[![Build Status](https://travis-ci.org/spacekit/spacekit-service.svg?branch=master)](https://travis-ci.org/spacekit/spacekit-service)
[![Dependency Status](https://david-dm.org/spacekit/spacekit-service.svg?style=flat)](https://david-dm.org/spacekit/spacekit-service)
[![devDependency Status](https://david-dm.org/spacekit/spacekit-service/dev-status.svg?style=flat)](https://david-dm.org/spacekit/spacekit-service#info=devDependencies)


## Install

```bash
$ npm install spacekit-service -g
```


## Usage

You'll need a `spacekit-service.json` file in the directory you run the
service. Here's an example config:

```json
{
  "postgres": "postgres://username:password@host:port/dbname",
  "service": {
    "domain": "spacekit.io",
    "subdomains": {
      "api": "api.spacekit.io",
      "web": "www.spacekit.io"
    },
    "ports": {
      "http": 80,
      "https": 443,
      "range": {
        "start": 8000,
        "end": 8999
      }
    }
  },
  "letsEncrypt": {
    "email": "spacekit.io@gmail.com"
  },
  "aws": {
    "hostedZoneId": null,
    "accessKeyId": null,
    "secretAccessKey": null,
    "recordSetTtl": 1
  },
  "mail": {
    "from": {
      "name": "SpaceKit",
      "address": "spacekit.io@gmail.com"
    }
  },
  "smtp": {
    "host": "smtp.gmail.com",
    "secure": true,
    "user": "spacekit.io@gmail.com",
    "pass": null
  }
}
```


## Logs

Log files will be stored in the directory you run `spacekit-service` from.
They're named `spacekit-service.log` and will rotate for 3 days
(`spacekit-service.log.0`, `spacekit-service.log.1`, etc..).


## Certificates

Certificate files will be stored in the directory you run `spacekit-service`
from under the `./certs` folder.


## License

MIT
