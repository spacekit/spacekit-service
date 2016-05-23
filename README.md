# SpaceKit Service

[![Build Status](https://travis-ci.org/spacekit/spacekit-service.svg?branch=master)](https://travis-ci.org/spacekit/spacekit-service)
[![Dependency Status](https://david-dm.org/spacekit/spacekit-service.svg?style=flat)](https://david-dm.org/spacekit/spacekit-service)
[![devDependency Status](https://david-dm.org/spacekit/spacekit-service/dev-status.svg?style=flat)](https://david-dm.org/spacekit/spacekit-service#info=devDependencies)


## Install

```bash
$ npm install spacekit-service -g
```


## Usage

```plain
Usage: spacekit-service \
       --pg $PG_CONN_STR \
       --apiKey /path/to/key --apiCert /path/to/cert \
       --webKey /path/to/key --webCert /path/to/cert \
       --awsHostedZoneId $HOSTED_ZONE_ID \
       --awsAccessKeyId $ACCESS_KEY_ID \
       --awsSecretAccessKey $SECRET_ACCESS_KEY

Options:
  --pg                  the Postgres connection string
                        (ex: "postgres://username:password@host/database")
                                                                      [required]
  --api                 the api subdomain; uses value with <host> to create
                        the complete hostname (ex: <api>.<host>)[default: "api"]
  --apiKey              path to the api TLS key                       [required]
  --apiCert             path to the api TLS cert                      [required]
  --web                 the web subdomain; uses value with <host> to create
                        the complete hostname (ex: <web>.<host>)[default: "www"]
  --webKey              path to the web TLS key                       [required]
  --webCert             path to the web TLS cert                      [required]
  --host                the root hostname of the service[default: "spacekit.io"]
  --smtpHost            the smtp host                [default: "smtp.gmail.com"]
  --smtpPort            the smtp post                             [default: 465]
  --smtpFrom            the smtp from address
                                   [default: "SpaceKit <spacekit.io@gmail.com>"]
  --smtpUser            the smtp username                             [required]
  --smtpPass            the smtp password                             [required]
  --awsHostedZoneId     the aws hosted zone id (for dynamic dns)
  --awsRecordSetTtl     the aws dns record set ttl (in seconds)   [default: 1]
  --awsAccessKeyId      the aws access key id
  --awsSecretAccessKey  the aws secret access key
  --help                Show help                                      [boolean]
```


## Config file

If there is a `spacekit-service.json` file in the directory you run
`spacekit-service` from, we'll use it to configure the the cli.


## Logs

Log files will be stored in the directory you run `spacekit-service` from.
They're named `spacekit-service.log` and will rotate for 3 days
(`spacekit-service.log.0`, `spacekit-service.log.1`, etc..).


## License

Apache License, Version 2.0
