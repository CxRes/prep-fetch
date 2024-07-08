# PREP Fetch

Prep your [`Fetch`](https://fetch.spec.whatwg.org/) [`Response`](https://fetch.spec.whatwg.org/#responses) to receive [Per Resource Events](https://cxres.github.io/prep/draft-gupta-httpbis-per-resource-events.html) notifications.

PREP Fetch is thin wrapper around [Multipart Fetch](https://npmjs.com/package/multipart-fetch) that pre-processes the response to a PREP request giving you separate representation and notification streams.

## Installation

### Browser

You can use PREP Fetch directly in the browser as shown below:

```html
<script type="module">
  import prepFetch from "https://path/to/prep-fetch/dist/browser.js";
</script>
```

#### CDN

Replace the dummy import path with a link to the bundle provided by your favourite CDN. Find the links/link formats at:

- [jsdelivr](https://www.jsdelivr.com/package/npm/prep-fetch)
- [unpkg](https://www.unpkg.com/)

#### Local

Alternatively you can download the package from npm and use it locally. If you have npm installed, an easy way to do this is:

```sh
npm pack prep-fetch
```

Unpack the downloaded `.tgz` file and point the import path to `dist/browser.min.js`.

### JavaScript Runtimes

Install PREP Fetch using your favorite package manager:

```sh
<npm|pnpm|yarn|bun> add prep-fetch
```

You can now `import` PREP Fetch in your project, as usual:

```js
import prepFetch from "prep-fetch";
```

On Deno, you can link to the bundle directly from source, just like in the browser, or export it from `deps.ts`.

## Usage

1. Request PREP notifications using `Fetch` and invoke PREP Fetch on the response:

   ```js
   let response;
   try {
     response = await fetch("https://example.org/source/of/events", {
       headers: {
         "accept-events": '"prep"',
       },
     });
   } catch (error) {
     // Handle any network errors
   }

   const prepResponse = prepFetch(response);
   ```

2. Read representation, say, as text:

   ```js
   const representation = await prepResponse.getRepresentation();
   console.log(await representation.text());
   ```

   **IMPORTANT**: Read the representation completely before reading notifications as these are being delivered serially on the underlying HTTP response stream.

3. Now get the notifications and iterate over it:

   ```js
   const notifications = await prepResponse.getNotifications();
   for await (const notification of notifications) {
     // .message parses the Response body as a internet format message
     // mime-type: `message/rfc822`
     const message = await notification.message();
     // output the notification
     console.log(message.headers);
     // output any body
     console.log(await message.body());
   }
   ```

   or, if you are using the asyncIterator protocol:

   ```js
   const notifications = await prepResponse.getNotifications();
   const notificationsIterator = notifications.notifications();
   let { value, done } = await notificationsIterator.next();
   while (!done) {
     const message = await notification.message();
     console.log(await message.body());
     ({ value, done } = await notificationsIterator.next());
   }
   ```

   **IMPORTANT**: Always read each message completely before proceeding to the next notification.

For a more detailed example, see the "should serve notifications" block in `tests/integration/prep-fetch.test.js`.

## Copyright and License

Copyright © 2024, [Rahul Gupta](https://cxres.pages.dev/profile#i) and PREP Fetch contributors.

The source code in this repository is released under the [Mozilla Public License v2.0](./LICENSE).
