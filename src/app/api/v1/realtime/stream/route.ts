import { sweepExpiredLocks } from '@/lib/locks';
import { ensureDatabaseSeeded } from '@/lib/seedHelper';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  await ensureDatabaseSeeded();

  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  const sendEvent = async (event: string, data: any) => {
    try {
      const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
      await writer.write(encoder.encode(payload));
    } catch (e) {
      // Connection closed
    }
  };

  // Initial connection ping
  sendEvent('connected', {
    message: 'AHS Real-Time SSE Stream Active',
    timestamp: new Date().toISOString()
  });

  // Heartbeat and lock sweeper interval
  const interval = setInterval(async () => {
    try {
      const expiredCount = await sweepExpiredLocks();
      await sendEvent('ping', {
        timestamp: new Date().toISOString(),
        expiredLocksSwept: expiredCount
      });
    } catch (err) {
      // Error pinging
    }
  }, 15000);

  request.signal.addEventListener('abort', () => {
    clearInterval(interval);
    writer.close().catch(() => {});
  });

  return new Response(responseStream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    }
  });
}
