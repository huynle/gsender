function createGatedSDK(
    realSdk: Record<string | symbol, unknown>,
    allowedCapabilities: Set<string | symbol>,
) {
    return new Proxy(realSdk, {
        get(target, prop) {
            if (!allowedCapabilities.has(prop)) {
                throw new Error(`Plugin not authorized to use '${prop}'`);
            }
            return target[prop];
        },
    });
}
