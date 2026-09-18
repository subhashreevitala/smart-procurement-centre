from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.ws_manager import manager
import json

router = APIRouter(
    prefix="/ws",
    tags=["Real-time WebSockets"]
)

@router.websocket("/centre/{centre_id}")
async def websocket_endpoint(websocket: WebSocket, centre_id: int):
    """
    Connect to this endpoint to receive real-time updates for a specific procurement centre.
    """
    await manager.connect(websocket, centre_id)
    try:
        while True:
            # We don't really expect the client to send much, but we keep the connection open
            data = await websocket.receive_text()
            # Echo for testing
            await websocket.send_text(json.dumps({"message": f"Server received: {data}"}))
    except WebSocketDisconnect:
        manager.disconnect(websocket, centre_id)
