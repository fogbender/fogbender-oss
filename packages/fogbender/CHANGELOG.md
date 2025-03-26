# fogbender

## 0.7.0

### Minor Changes

- 4bdaf5c: Hide window.parent.location behind try/catch

### Patch Changes

- e200d5c: Change signature from userHMAC to userJWT
- 8d84d64: Update README

## 0.6.4

### Patch Changes

- 3c9ec63: Change signature from userHMAC to userJWT
- cb622e4: Update README

## 0.6.3

### Patch Changes

- 079fbe3: Update README

## 0.6.2

### Patch Changes

- 1ac1cec: Update package description

## 0.6.1

### Patch Changes

- ff5ca20: target: ES2020

## 0.6.0

### Minor Changes

- 06c11d3: Make iFrame parent div flex: 1 to fix vertical fill issues

## 0.5.0

### Minor Changes

- e608311: Add option to enable user room creation via roomCreationEnabled prop
- e608311: Make widget to span full height if screen size is less then 640px

### Patch Changes

- e608311: Remember dark/light mode setting in widget; make iframe bg transparent
- e608311: Add fogbender.closeFloaty; make floaty take up whole screen

## 0.4.0

### Minor Changes

- 5e4f264: Dark/light mode switch

## 0.3.0

### Minor Changes

- c1c5dd3: Visitor (anon user) support

### Patch Changes

- 568ec86: add nosemgrep comment to ignore false positive security report
- 524b866: Update README to point to a new client url (staging)

## 0.2.3

### Patch Changes

- 5d24202: Fix iFrame height calculation so things work nicely when there is a footer below the iFrame.

## 0.2.2

### Patch Changes

- c6a7b13: Fix SVG attrs
- 81f0eda: yarn fix

## 0.2.1

### Patch Changes

- 8fdf54d: update npm install instructions in readme

## 0.2.0

### Minor Changes

- 5805603: BREAKING CHANGE: type of isClientConfigured has changed

  Snapshot callbacks no longer receive the snapshot as an argument
  but instead get the value itself.

## 0.1.6

### Patch Changes

- 412d4e7: pass current package version to server

## 0.1.5

### Patch Changes

- 40d32b3: Migrate from deprecated className to class

  This is internal change that will esentially compile into exacty the same code.

## 0.1.4

### Patch Changes

- 522d3f7: added repository url to package.json so that npm will add this link

## 0.1.3

### Patch Changes

- 91b8c1b: preparing for ci release
