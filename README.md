# DMS frontend deployment

## Description

This repository shows how to package and deploy an angular web application in the Nuxeo Platform. The most important
take away is that nothing changes web developers as the packaging for the nuxeo platform doesn't interfere with the
angular development workflow and tooling.

The content of this repository is only relevant for client side rendering application. For server side rendering, a
Node.js Express server is required.

## Pre-requisites

In order to create a nuxeo marketplace package, java tooling is required:

- JDK 21
- [Maven](https://maven.apache.org/download.cgi)

### Maven configuration

The TeamNordiq Maven repositories must be configured in order to be able to download the private artifacts.
This project contains a sample maven configuration file that can be used as a starting point.

Open the `~/.m2/settings.xml` file with a text editor and set the username and password for the maven-private
repository. The [username/password](https://doc.nuxeo.com/corg/maven-usage/#maven-usage-for-lts-2023) are the same as
the ones used for the teamnordiq private docker repository.

## How to build

```bash
git clone git@github.com/dms30-diarium/dms-frontend.git
cd dms-frontend
mvn clean install
```
