const clients = new Set();

function subscribe(res, context = {}) {
  clients.add({ res, context });

  // Handshake event for client bootstrap
  res.write(`event: connected\n`);
  res.write(`data: ${JSON.stringify({ ok: true, ts: Date.now() })}\n\n`);

  const heartbeat = setInterval(() => {
    try {
      res.write(`: heartbeat ${Date.now()}\n\n`);
    } catch (_) {
      clearInterval(heartbeat);
    }
  }, 30000);

  return () => {
    clearInterval(heartbeat);
    for (const item of clients) {
      if (item.res === res) {
        clients.delete(item);
        break;
      }
    }
  };
}

function publish(type, payload = {}) {
  const event = {
    type,
    payload,
    ts: Date.now()
  };
  const data = `data: ${JSON.stringify(event)}\n\n`;

  for (const { res } of clients) {
    try {
      res.write(data);
    } catch (_) {
      // Ignore broken clients; they will be cleaned up on close.
    }
  }
}

module.exports = {
  subscribe,
  publish
};
