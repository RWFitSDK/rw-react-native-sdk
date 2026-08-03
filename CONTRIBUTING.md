# Contributing

Contributions are always welcome, no matter how large or small!

We want this community to be friendly and respectful to each other. Please follow it in all your interactions with the project. Before contributing, please read the [code of conduct](./CODE_OF_CONDUCT.md).

## Development workflow

The repository contains the library package at the root and a React Native
application in `example/`. Node.js 22.11.0 or newer is required.

Install and validate the library from the repository root:

```sh
npm install
npm run typecheck
npm test
npm pack --dry-run
```

Install and run the example separately:

```sh
cd example
npm install
npm start
```

In another terminal, run Android or an iOS physical device:

```sh
# Android
cd example
adb reverse tcp:8081 tcp:8081
npm run android

# iOS physical device (select your own signing team in Xcode first)
cd example/ios
pod install
cd ..
npm run ios -- --device "Your iPhone Name"
```

The example references the library through `file:..`. Rebuild the native app
after changing Android or iOS code. The bundled iOS framework is device-only,
so the iOS Simulator is not supported.

### Sending a pull request

> **Working on your first pull request?** You can learn how from this _free_ series: [How to Contribute to an Open Source Project on GitHub](https://app.egghead.io/playlists/how-to-contribute-to-an-open-source-project-on-github).

When you're sending a pull request:

- Prefer small pull requests focused on one change.
- Verify that linters and tests are passing.
- Review the documentation to make sure it looks good.
- Follow the pull request template when opening a pull request.
- For pull requests that change the API or implementation, discuss with maintainers first by opening an issue.
