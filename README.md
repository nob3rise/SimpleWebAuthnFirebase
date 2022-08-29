
<!-- omit in toc -->
# SimpleWebAuthn Firebase Project
![WebAuthn](https://img.shields.io/badge/WebAuthn-Simplified-blueviolet?style=for-the-badge&logo=WebAuthn)

- [Overview](#overview)
- [Example](#example)
- [Firebase Setup](#firebase-setup)
- [Development](#deployment)
- [Build Setup](#build-setup)

## Overview

This project is based on [SimpleWebAuthn](https://github.com/MasterKale/SimpleWebAuthn). WebAuthn hosting server needs https but it's hard to set up. Firebase gives us that environment so you can easliy set up WebAuthn server if you have Firebase account. 

[MasterKale](https://github.com/MasterKale), thank you for great project [SimpleWebAuthn](https://github.com/MasterKale/SimpleWebAuthn).

## Example

![demo](https://user-images.githubusercontent.com/22928833/187209318-994c3854-cfff-4912-82ef-97256b0381f6.gif)

## Firebase Setup

[This](https://firebase.google.com/docs/cli?hl=en) is guidance for installing Firebase CLI. [This](https://cloud.google.com/firestore/docs/client/get-firebase) is Firebase project setup guidance.

After pulling down the code, set up firebase:
```bash
$ firebase init
```

Here are questions and answers:
```
? Which Firebase features do you want to set up for this directory? Press Space to select features, then Enter to confirm your choices. (Press <space> to select, <a> to t
oggle all, <i> to invert selection, and <enter> to proceed)
 ◉ Firestore: Configure security rules and indexes files for Firestore
 ◉ Functions: Configure a Cloud Functions directory and its files
 ◉ Hosting: Configure files for Firebase Hosting and (optionally) set up GitHub Action deploys

? Please select an option:
❯ Use an existing project

? Select a default Firebase project for this directory:
❯ simplewebauthn (SimpleWebAuthn)

? What file should be used for Firestore Rules? (firestore.rules)

? What file should be used for Firestore indexes? (firestore.indexes.json)

? What language would you like to use to write Cloud Functions?
❯ TypeScript

? Do you want to use ESLint to catch probable bugs and enforce style? (Y/n) Y

? File functions/package.json already exists. Overwrite? (y/N) N

? File functions/.eslintrc.js already exists. Overwrite? (y/N) N

? File functions/tsconfig.json already exists. Overwrite? (y/N) N

? File functions/tsconfig.dev.json already exists. Overwrite? (y/N) N

? File functions/src/index.ts already exists. Overwrite? (y/N) N

? File functions/.gitignore already exists. Overwrite? (y/N) N

? Do you want to install dependencies with npm now? (Y/n) Y

? What do you want to use as your public directory? (public) dist

? Configure as a single-page app (rewrite all urls to /index.html)? N

? Set up automatic builds and deploys with GitHub? N
```

## Development

install dependencies:
```sh
$ yarn install
```

check Cloud Functions emulation URL:
```sh
$ mv funcitons; npm run serve
```

change Cloud Functions URL in .env.development:
```ini
CLOUD_FUNCTION_URL="http://localhost:5001/xxx/asia-northeast1/api"
```

serve with hot reload at localhost:3000:
```sh
$ yarn dev
```

## Deployment

change Cloud Functions URL in .env.production:
```ini
CLOUD_FUNCTION_URL="https://asia-northeast1-xxxx.cloudfunctions.net/api"
```

```bash
# install dependencies
$ yarn install

# serve with hot reload at localhost:3000
$ yarn dev

# build for production and launch server
$ yarn build
$ yarn start

# generate static project
$ yarn generate
```