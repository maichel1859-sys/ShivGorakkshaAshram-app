import { SocketTest } from "@/components/socket-test";

export default function TestSocketPage() {
  return (
    <div className="container mx-auto p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Socket.IO Connection Test</h1>
        <p className="text-muted-foreground mb-8">
          This page tests the Socket.IO connection to verify real-time
          communication is working.
        </p>

        <div className="grid gap-8">
          <SocketTest />

          <div className="bg-card p-6 rounded-lg border">
            <h2 className="text-xl font-semibold mb-4">Testing Instructions</h2>
            <div className="space-y-4 text-sm">
              <div>
                <h3 className="font-medium">1. Start the Server</h3>
                <p className="text-muted-foreground">
                  Make sure the custom server is running:{" "}
                  <code className="bg-muted px-2 py-1 rounded">
                    npm run dev
                  </code>
                </p>
              </div>

              <div>
                <h3 className="font-medium">2. Check Server Logs</h3>
                <p className="text-muted-foreground">
                  Look for:{" "}
                  <code className="bg-muted px-2 py-1 rounded">
                    Socket.IO server initialized
                  </code>
                </p>
              </div>

              <div>
                <h3 className="font-medium">3. Test Connection</h3>
                <p className="text-muted-foreground">
                  Use the test component above to verify connection status
                </p>
              </div>

              <div>
                <h3 className="font-medium">4. Browser Console</h3>
                <p className="text-muted-foreground">
                  Open browser console and run:
                  <pre className="bg-muted p-2 rounded mt-2 text-xs">
                    {`const socket = io('http://localhost:3000');
socket.on('connect', () => console.log('Connected!'));
socket.on('disconnect', () => console.log('Disconnected!'));`}
                  </pre>
                </p>
              </div>

              <div>
                <h3 className="font-medium">5. Admin UI</h3>
                <p className="text-muted-foreground">
                  Visit{" "}
                  <a
                    href="/admin/socket.io"
                    className="text-primary hover:underline"
                  >
                    Socket.IO Admin UI
                  </a>{" "}
                  for monitoring
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
