const clients = new Set();

function subscribe(res, context = {}) {
  const client = { res, context, alive: true };
  clients.add(client);

  // Handshake event for client bootstrap
  try {
    res.write(`event: connected\n`);
    res.write(`data: ${JSON.stringify({ ok: true, ts: Date.now() })}\n\n`);
  } catch (e) {
    client.alive = false;
    clients.delete(client);
    return () => {};
  }

  const heartbeat = setInterval(() => {
    if (!client.alive) {
      clearInterval(heartbeat);
      return;
    }
    try {
      res.write(`: heartbeat ${Date.now()}\n\n`);
    } catch (e) {
      clearInterval(heartbeat);
      client.alive = false;
    }
  }, 30000);

  return () => {
    clearInterval(heartbeat);
    client.alive = false;
    clients.delete(client);
  };
}

function publish(type, payload = {}) {
  const event = {
    type,
    payload,
    ts: Date.now()
  };
  const data = `data: ${JSON.stringify(event)}\n\n`;

  for (const client of clients) {
    if (!client.alive) continue;
    try {
      client.res.write(data);
    } catch (e) {
      client.alive = false;
    }
  }
  
  // Cleanup dead clients periodically
  clients.forEach(client => {
    if (!client.alive) {
      clients.delete(client);
    }
  });
}

module.exports = {
  subscribe,
  publish
};
