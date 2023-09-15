import { Lock } from "./lock";

const randomId = () => Math.random().toString(36).substring(5);
const jsContextID = randomId();

export interface Env {
  globalStateTestDO: DurableObjectNamespace;
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (
      url.pathname === "/sleepInLock" ||
      url.pathname === "/fetchInLock" ||
      url.pathname === "/checkLock"
    ) {
      return env.globalStateTestDO
        .get(env.globalStateTestDO.idFromName("global-state-test"))
        .fetch(request);
    } else {
      return new Response("Not Found.", {
        status: 404,
      });
    }
  },
};

const lock = new Lock();

class GlobalStateTestDO implements DurableObject {
  state: DurableObjectState;
  logPrefix: string = `GlobalStateTestDO jsContextID=${jsContextID} doID=${randomId()}`;
  constructor(state: DurableObjectState) {
    this.state = state;
    console.log(
      this.logPrefix,
      "constructed at",
      Date.now(),
      " --!!!!!!!!!!!!!!!!!!!!"
    );
  }
  async fetch(request: Request): Promise<Response> {
    const requestID = randomId();
    const url = new URL(request.url);
    const logPrefix = `${this.logPrefix} requestID=${requestID} ${url.pathname}`;

    if (url.pathname === "/checkLock") {
      const msg = `${logPrefix} is locked? ${lock.isLocked()}`;
      console.log(logPrefix, msg);
      return new Response(msg, {
        status: 200,
      });
    } else if (
      url.pathname == "/sleepInLock" ||
      url.pathname === "/fetchInLock"
    ) {
      let seconds = 0;
      try {
        seconds = parseInt(url.searchParams.get("seconds") ?? "40");
      } catch (e) {
        return new Response("Invalid seconds param.", {
          status: 400,
        });
      }
      console.log(logPrefix, "waiting for lock", url);
      await lock.withLock(async () => {
        console.log(logPrefix, "got lock", seconds);
        if (url.pathname == "/sleepInLock") {
          await new Promise<void>((resolve) => {
            setTimeout(() => {
              resolve();
            }, seconds * 1000);
          });
        } else {
          // url.pathname ==  "/fetchInLock"
          await fetch(`https://hub.dummyapis.com/delay?seconds=${seconds}`);
        }
        console.log(logPrefix, "about to release lock");
      });
      return new Response(`${logPrefix} with ${seconds}\n`, {
        status: 200,
      });
    } else {
      return new Response("Not Found.", {
        status: 404,
      });
    }
  }
}

export { worker as default, GlobalStateTestDO };
