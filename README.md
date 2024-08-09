# Capture Cloudflare Workers logs to PostHog

[Tail worker][0] listening to logs from your other workers and automatically captures it in PostHog with automatic GeoIP enrichment. Super lightweight. Starts up in 1ms and with zero-dependencies.

[0]: https://developers.cloudflare.com/workers/runtime-apis/handlers/tail/

## Why?

- Development and debugging: allows you to see PostHog events in console without actually sending them during development.
- Makes logging and error reporting decoupled from your worker.

## Setup

First, deploy this worker:

1. Install packages: `[bun|npm] install`
2. Set API key: `[npx|bunx] wrangler secret put POSTHOG_API_KEY`
3. Optionally, update PostHog URL if you're using EU- or self-hosted instance.
4. `[npx|bunx] wrangler deploy`

Now, in worker that produces logs, update its `wrangler.toml` and deploy it:

```toml
tail_consumers = [{service = "cloudflare-posthog-tail-worker"}]
```

And you should be ready to go!

## Usage

In a worker that producers logs, you can capture PostHog events by using `console.log`

```js
console.log("event\t", JSON.stringify({
  event: "user_signed_up",
}))
```

First argument is a prefix, defined in `LOG_PREFIX` environmental variable.
It is used to distinguish it from other logs.

