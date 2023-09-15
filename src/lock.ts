// Based on https://github.com/rocicorp/lock/blob/main/src/lock.ts
export class Lock {
  private _lockP: Resolver | null = null;

  isLocked(): boolean {
    return this._lockP?.isResolved() === false;
  }

  async lock(): Promise<() => void> {
    const previous = this._lockP;
    const r = resolver();
    this._lockP = r;
    await previous?.promise;
    return r.resolve;
  }

  withLock<R>(f: () => R | Promise<R>): Promise<R> {
    return run(this.lock(), f);
  }
}

async function run<R>(
  p: Promise<() => void>,
  f: () => R | Promise<R>
): Promise<R> {
  const release = await p;
  try {
    return await f();
  } finally {
    release();
  }
}

interface Resolver<R = void> {
  promise: Promise<R>;
  resolve: (res: R) => void;
  isResolved: () => boolean;
}

export function resolver<R = void, E = unknown>(): Resolver<R> {
  let resolved = false;
  let resolve!: (r: R) => void;
  let reject!: (err: E) => void;
  const promise = new Promise<R>((res, rej) => {
    resolve = (r: R) => {
      resolved = true;
      res(r);
    };
    reject = rej;
  });
  return { promise, resolve, isResolved: () => resolved };
}
