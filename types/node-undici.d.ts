// Node 22 ships `node:undici` as a built-in module at runtime, but the
// project's @types/node (20.x) doesn't declare it — this is a minimal
// ambient declaration covering only what this codebase actually uses.
declare module "node:undici" {
  export class ProxyAgent {
    constructor(uri: string);
  }
}
