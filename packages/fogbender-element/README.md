# Fogbender Element

Fogbender is a B2B support platform that enables a company to install a team messaging experience in their customer-facing web application so that all users belonging to the same customer can collaborate on customer support. It's like a hybrid between Intercom (embeddable) and Slack's shared channels (team-to-team). For more details, visit [fogbender.com](https://fogbender.com).

Fogbender Element provides Web Components for embedding Fogbender's collaborative support widgets into your web application. It supports full-page chat interfaces, floating Intercom-style experience, and unread badges.

## Installation

### CD

```html
<script type="module" src="https://unpkg.com/@fogbender/element"></script>
```

### npm

```bash
npm install @fogbender/element
```

## Usage

Below are examples of various widget setups depending on your desired integration level.

### Simple Roomy Widget

```html
<fogbender-simple-roomy-widget .token="${yourTokenObject}"> </fogbender-simple-roomy-widget>
```

_Roomy Widget: A team messaging experience that occupies all available space of its parent container. For proper expansion, ensure the parent container uses `display: flex`._

### Roomy Widget with Provider

```html
<fogbender-provider>
  <fogbender-config .token="${yourTokenObject}"> </fogbender-config>
  <fogbender-roomy-widget></fogbender-roomy-widget>
</fogbender-provider>
```

_Roomy Widget: This variant uses a provider for configuration and renders a team messaging experience that fills its container (which should have `display: flex`)._

### Headless and Floaty Widgets

```html
<fogbender-provider>
  <fogbender-config .token="${yourTokenObject}"> </fogbender-config>
  <fogbender-is-configured>
    <template data-is-configured>
      <fogbender-headless-widget></fogbender-headless-widget>
      <fogbender-floaty-widget></fogbender-floaty-widget>
    </template>
  </fogbender-is-configured>
</fogbender-provider>
```

_Floaty Widget: An Intercom‑style widget anchored to the bottom-right corner of the screen. It expands into a full chat interface when activated._

### Simple Floaty Widget

```html
<fogbender-simple-floaty-widget .token="${yourTokenObject}"> </fogbender-simple-floaty-widget>
```

_Floaty Widget: A compact, Intercom‑style button anchored to the bottom-right corner that opens into a full chat interface._

### Unread Badge with Floaty Widget

```html
<fogbender-provider>
  <fogbender-config .token="${yourTokenObject}"> </fogbender-config>
  <fogbender-is-configured>
    <template data-is-configured>
      <fogbender-headless-widget></fogbender-headless-widget>
      <fogbender-unread-badge></fogbender-unread-badge>
      <fogbender-floaty-widget></fogbender-floaty-widget>
    </template>
  </fogbender-is-configured>
</fogbender-provider>
```

_Unread Badge: A visual indicator that can be placed anywhere on a web page to notify users of unread support messages. Combined with a Floaty Widget, it alerts users while maintaining a clean interface._

### Unread Badge Only

```html
<fogbender-provider>
  <fogbender-config .token="${yourTokenObject}"> </fogbender-config>
  <fogbender-unread-badge></fogbender-unread-badge>
</fogbender-provider>
```

_Unread Badge: This standalone unread badge can be placed anywhere on your page to notify users of unread support messages._

## Token Format

Each widget expects a `token` object that represents the end user and their organization/account:

```js
const token = {
  widgetId: "your-widget-id",
  customerId: "your-user-account-id", // your user's customer/account/org ID
  customerName: "User's Organization Name", // your user's org/account name
  userId: "user-123",
  userEmail: "user@example.com",
  userJWT: "generated-server-side-jwt", // see https://fogbender.com/admin/-/-/settings/embed
  userName: "Jane Doe",
  userAvatarUrl: "https://example.com/avatar.png", // optional
};
```

## License

MIT
