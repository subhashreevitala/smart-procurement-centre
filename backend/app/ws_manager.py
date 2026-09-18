from fastapi import WebSocket
from typing import List, Dict

class ConnectionManager:
    def __init__(self):
        # Dictionary to hold active connections per centre
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, centre_id: int):
        await websocket.accept()
        if centre_id not in self.active_connections:
            self.active_connections[centre_id] = []
        self.active_connections[centre_id].append(websocket)

    def disconnect(self, websocket: WebSocket, centre_id: int):
        if centre_id in self.active_connections:
            self.active_connections[centre_id].remove(websocket)

    async def broadcast_to_centre(self, message: str, centre_id: int):
        if centre_id in self.active_connections:
            for connection in self.active_connections[centre_id]:
                await connection.send_text(message)

manager = ConnectionManager()
