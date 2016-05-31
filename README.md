# SpaceKit Service

[![Build Status](https://travis-ci.org/spacekit/spacekit-service.svg?branch=master)](https://travis-ci.org/spacekit/spacekit-service)
[![Dependency Status](https://david-dm.org/spacekit/spacekit-service.svg?style=flat)](https://david-dm.org/spacekit/spacekit-service)
[![devDependency Status](https://david-dm.org/spacekit/spacekit-service/dev-status.svg?style=flat)](https://david-dm.org/spacekit/spacekit-service#info=devDependencies)


## Install

```bash
$ npm install spacekit-service -g
```


## Usage

If there is a `spacekit-service.json` file in the directory you run
`spacekit-service` from, we'll use it to configure the client. Typical
options are as follows:

```json
{
  "pg": "postgres://username:password@host:port/dbname",
  "smtpUser": null,
  "smtpPass": null,
  "awsHostedZoneId": null,
  "awsAccessKeyId": null,
  "awsSecretAccessKey": null,
  "host": "spacekit.io"
}
```

## Logs

Log files will be stored in the directory you run `spacekit-service` from.
They're named `spacekit-service.log` and will rotate for 3 days
(`spacekit-service.log.0`, `spacekit-service.log.1`, etc..).


## License

Apache License, Version 2.0
