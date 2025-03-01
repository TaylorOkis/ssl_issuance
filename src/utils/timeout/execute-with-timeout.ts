const executeWithTimeout = (promise: Promise<void>, timeoutMs: number) => {
  const timeout = new Promise((_, reject) =>
    setTimeout(
      () =>
        reject(
          new Error("Timeout exceeded, , restart the process or try again.")
        ),
      timeoutMs
    )
  );
  return Promise.race([promise, timeout]);
};

export default executeWithTimeout;
