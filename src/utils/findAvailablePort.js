/**
 * Bind `httpServer` starting at `preferredPort`, advancing on EADDRINUSE.
 * Uses real listen attempts (no separate probe) to avoid Windows dual-stack false frees.
 */
export async function listenWithPortFallback(httpServer, preferredPort, { maxAttempts = 100 } = {}) {
  const start = Number(preferredPort);
  if (!Number.isInteger(start) || start < 1 || start > 65535) {
    throw new Error(`Invalid preferred port: ${preferredPort}`);
  }

  let lastError;

  for (let offset = 0; offset < maxAttempts; offset += 1) {
    const port = start + offset;
    if (port > 65535) break;

    try {
      await new Promise((resolve, reject) => {
        const onError = (error) => {
          httpServer.off("listening", onListening);
          reject(error);
        };
        const onListening = () => {
          httpServer.off("error", onError);
          resolve();
        };

        httpServer.once("error", onError);
        httpServer.once("listening", onListening);
        httpServer.listen(port);
      });

      return {
        port,
        fellBack: port !== start,
        preferredPort: start
      };
    } catch (error) {
      lastError = error;
      if (error.code !== "EADDRINUSE") throw error;
      // Server can listen again after EADDRINUSE; continue to next port.
    }
  }

  const end = Math.min(start + maxAttempts - 1, 65535);
  const detail = lastError?.message ? ` Last error: ${lastError.message}` : "";
  throw new Error(`No free port found from ${start} through ${end}.${detail}`);
}
