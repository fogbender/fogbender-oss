# Fogbender Vanilla JS Demo

This is a minimal example of embedding the Fogbender widget without using a framework.

## CodeSandbox

https://codesandbox.io/s/github/fogbender/fogbender-oss/tree/main/examples/vanilla

## Setup

```bash
yarn install
```

## Running locally

```bash
yarn start
```

This uses [Parcel](https://parceljs.org/) to serve `index.html`.

## Common Issue

On first run, you might see this error:

```
Segmentation fault (core dumped)
error Command failed with exit code 139.
```

This is a known Parcel issue. If it happens:

1. Run `yarn start` again
2. Or run a fresh build with:

```bash
yarn build
yarn start
```

## Usage

- The Fogbender widget loads immediately on page load
- Click **“Unmount”** to remove it

The widget is initialized in `src/index.ts` and rendered into the `#app` div.
