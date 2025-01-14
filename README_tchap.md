## Config variable

- tchap_features : Object containing the feature that can be activated by homeserver
    - "feature_email_notification": Email notification
    - "feature_space": Creation of spaces
    - "feature_thread": Activate thread on messages
    - "feature_audio_call": Activate 1 to 1 voice call
    - "feature_video_call": Activate 1 to 1 video call
    - "feature_video_group_call": Activate group call on rooms, for this feature to work, the values of `UIFeature.widgets` and `feature_group_calls` needs to be true
    - "feature_screenshare_call": Activate 1 to 1 screenshare
- "tchap_sso_flow"
    - "isActive": Activate ProConnect SSO flow

## File structures

- modules -> used for translation
- yarn-linked-dependencies -> legacy dependencies used for matrix-js-sdk
- patches_legacy -> legacy patches directory in which code for the patches where put
- patches -> used for matrix-js-sdk patches
- src -> code containing ex matrix-react-sdk lib and element-web code

## Local dev installation

```
yarn install
yarn start

```

## Dev guidelines

### Making a change

- In element code :
  You need to add around your code those comments

```
// :TCHAP: NAME_OF_THE_PATCH
...code
// end :TCHAP:
```

Then also update the `subtree-modifications.json` file. We continue to keep track of the changes we make to the sdk. It will also be easier to separate different functionnality that tchap added to the code

### Tests

- Now that `matrix-react-sdk` is merged inside tchap-web, we only target the `test/tchap` folder in order to run our tests on only the files that tchap has modified.
- For every modification, we need to copy the existing test (if there is one) of the component, move it to tchap folder and modify it accordingly.
