import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { initSocketServer } from './src/lib/communication/socket-server';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = Number(process.env.PORT) || 3000;
const socketPath = process.env.SOCKET_PATH || '/socket.io';
const socketAdminPath = process.env.SOCKET_ADMIN_PATH || '/admin/socket.io';

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url || '', true);
      // Let Socket.IO handle its own HTTP requests (polling handshake, etc.)
      if (parsedUrl.pathname && (
        parsedUrl.pathname === socketPath || 
        parsedUrl.pathname.startsWith(socketPath + '/') ||
        parsedUrl.pathname === socketAdminPath ||
        parsedUrl.pathname.startsWith(socketAdminPath + '/')
      )) {
        return;
      }
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling request:', err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  // Initialize Socket.IO on the same HTTP server
  initSocketServer(server);

  server.listen(port, (err?: unknown) => {
    if (err) throw err;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `http://${hostname}:${port}`;
    console.log(`> Ready on ${baseUrl}`);
    console.log('> Socket.IO server initialized');
    console.log(`> Socket endpoint: ${baseUrl}${socketPath}`);
    console.log(`> Socket Admin UI: ${baseUrl}${socketAdminPath}`);
  });
});