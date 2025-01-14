# How to run cypress tests locally

- run a local instance of tchap-web in your environment

```
yarn start
```

- run cypress

Make a .env file, by coying .env.example. Set values for the `E2E_TEST_*` variables. Tests will run on your localhost, so make sure the test user exists in the backend called by localhost.

`yarn test:cypress`

or

`yarn test:cypress:open` to open the cypress console

# CI

Run by github actions, see `cypress.yaml`.

For the tests to work, the `E2E_TEST_*` vars need to be set as organization secrets.

# How to write new tests

Avoid copying files from react-sdk's tests for plugins/ or support/, and import them instead.

Group assertions together, rather than rerunning the whole scenario to test a single assertion (like unit tests do). This is because e2e tests take for ever to run (while unit tests are very fast).
