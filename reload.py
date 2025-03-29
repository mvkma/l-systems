#!/usr/bin/env python

import asyncio
import signal
import watchfiles

from websockets.asyncio.server import broadcast, serve

PATHS = ["./src", "./test", "./assets", "./index.html"]

WS_HOST = "localhost"
WS_PORT = 5678

async def noop(websocket):
    await websocket.wait_closed()

async def broadcast_changes(server):
    print(f"[.] Watching for changes: {', '.join(PATHS)}")
    async for changes in watchfiles.awatch(*PATHS):
        for change, filename in changes:
            print(f"[.] {change.name}: {filename}")
        broadcast(server.connections, "reload")

async def main():
    async with serve(noop, WS_HOST, WS_PORT) as server:
        try:
            await broadcast_changes(server)
        except asyncio.CancelledError:
            server.close()

if __name__ == "__main__":
    asyncio.run(main())
