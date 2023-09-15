# cf-worker-clocks

A test Cloudflare worker and durable object which demonstrates problems that
can arise from Cloudflare's reuse of JavaScript execution context.

## Demonstrating the issue

```
npm install

npx wrangler publish
```

Then in a browser open:
`https://<worker-domain>/sleepInLock?seconds=40000`
or
`https://<worker-domain>/fetchInLock?seconds=40000`

Then without modifying the code run

```
npx wrangler publish
```

or

```
npx wrangler tail
```

The publish/tail will cause the above sleepInLock/fetchInLock request to be
cancelled, and the DO to throw an exception:
`Durable Object reset because its code was updated.`

Then in a browser open:
`https://<worker-domain>/checkLock`

Which will show that the lock is still held, because the timeout/fetch for the
canceled request did not resolve or reject, and so the lock was not released.
