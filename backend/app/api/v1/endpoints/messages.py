from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Query, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_, func
from app.core.database import get_db
from app.core.security import get_current_user, decode_token
from app.models.models import Message, User, Appointment
from pydantic import BaseModel
from typing import Dict, List, Optional
import json
import logging
import os
import uuid

logger = logging.getLogger(__name__)
router = APIRouter()


# ── WebSocket Connection Manager ──────────────────────────────────────────────
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        logger.info(f"User {user_id} connected via WebSocket")

    def disconnect(self, websocket: WebSocket, user_id: int):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        logger.info(f"User {user_id} disconnected from WebSocket")

    async def send_to_user(self, user_id: int, message: dict):
        if user_id in self.active_connections:
            dead = []
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    dead.append(connection)
            for d in dead:
                self.active_connections[user_id].remove(d)

    def is_online(self, user_id: int) -> bool:
        return user_id in self.active_connections and len(self.active_connections[user_id]) > 0


manager = ConnectionManager()


# ── Schemas ───────────────────────────────────────────────────────────────────
class MessageCreate(BaseModel):
    content: str
    appointment_id: Optional[int] = None


# ── WebSocket Endpoint ────────────────────────────────────────────────────────
@router.websocket("/ws/{user_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: int,
    token: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    actual_user_id = None
    try:
        payload = decode_token(token)
        if not payload:
            await websocket.close(code=4001)
            return
        actual_user_id = int(payload.get("sub"))
    except Exception:
        await websocket.close(code=4001)
        return

    await manager.connect(websocket, actual_user_id)

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
            except Exception:
                continue

            msg_type = data.get("type")

            if msg_type == "message":
                receiver_id = data.get("receiver_id")
                content = data.get("content", "").strip()

                if not receiver_id or not content:
                    continue

                message = Message(
                    sender_id=actual_user_id,
                    receiver_id=int(receiver_id),
                    content=content,
                    appointment_id=data.get("appointment_id"),
                )
                db.add(message)
                await db.commit()
                await db.refresh(message)

                payload_out = {
                    "type": "message",
                    "id": message.id,
                    "sender_id": actual_user_id,
                    "receiver_id": int(receiver_id),
                    "content": content,
                    "sent_at": str(message.sent_at),
                    "is_read": False,
                    "appointment_id": message.appointment_id,
                }

                await manager.send_to_user(int(receiver_id), payload_out)
                await manager.send_to_user(actual_user_id, payload_out)

            elif msg_type == "typing":
                receiver_id = data.get("receiver_id")
                if receiver_id:
                    await manager.send_to_user(int(receiver_id), {
                        "type": "typing",
                        "sender_id": actual_user_id,
                    })

            elif msg_type == "read":
                sender_id = data.get("sender_id")
                if sender_id:
                    messages_to_read = await db.scalars(
                        select(Message).where(
                            Message.sender_id == int(sender_id),
                            Message.receiver_id == actual_user_id,
                            Message.is_read == False
                        )
                    )
                    for msg in messages_to_read:
                        msg.is_read = True
                    await db.commit()

                    await manager.send_to_user(int(sender_id), {
                        "type": "read_receipt",
                        "reader_id": actual_user_id,
                    })

    except WebSocketDisconnect:
        manager.disconnect(websocket, actual_user_id)
    except Exception as e:
        logger.error(f"WebSocket error for user {actual_user_id}: {e}")
        if actual_user_id:
            manager.disconnect(websocket, actual_user_id)


# ── REST Endpoints ────────────────────────────────────────────────────────────
# ⚠️ IMPORTANT: Static routes MUST come before dynamic /{param} routes

@router.get("/conversations")
async def get_conversations(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    user_id = current_user.id

    sent = await db.scalars(
        select(Message.receiver_id).where(
            Message.sender_id == user_id
        ).distinct()
    )
    received = await db.scalars(
        select(Message.sender_id).where(
            Message.receiver_id == user_id
        ).distinct()
    )

    user_ids = set(list(sent) + list(received))
    conversations = []

    for uid in user_ids:
        other_user = await db.scalar(select(User).where(User.id == uid))
        if not other_user:
            continue

        last_msg = await db.scalar(
            select(Message).where(
                or_(
                    and_(Message.sender_id == user_id, Message.receiver_id == uid),
                    and_(Message.sender_id == uid, Message.receiver_id == user_id)
                )
            ).order_by(Message.sent_at.desc()).limit(1)
        )

        unread = await db.scalar(
            select(func.count(Message.id)).where(
                Message.sender_id == uid,
                Message.receiver_id == user_id,
                Message.is_read == False
            )
        )

        conversations.append({
            "user_id": uid,
            "full_name": other_user.full_name,
            "role": other_user.role,
            "last_message": last_msg.content if last_msg else "",
            "last_message_time": str(last_msg.sent_at) if last_msg else "",
            "unread_count": unread or 0,
            "is_online": manager.is_online(uid),
        })

    conversations.sort(key=lambda x: x["last_message_time"], reverse=True)
    return {"conversations": conversations}


@router.get("/unread/count")
async def get_unread_count(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    user_id = current_user.id
    count = await db.scalar(
        select(func.count(Message.id)).where(
            Message.receiver_id == user_id,
            Message.is_read == False
        )
    )
    return {"unread_count": count or 0}


# ── Video Recording Upload (MUST be before /{other_user_id}) ─────────────────
@router.post("/upload-recording")
async def upload_recording(
    appointment_id: int = Form(...),
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    appt = await db.get(Appointment, appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    os.makedirs("uploads/recordings", exist_ok=True)
    ext = file.filename.split(".")[-1] if "." in file.filename else "webm"
    filename = f"session_{appointment_id}_{uuid.uuid4().hex[:8]}.{ext}"
    filepath = f"uploads/recordings/{filename}"

    with open(filepath, "wb") as f:
        content = await file.read()
        f.write(content)

    recording_url = f"/uploads/recordings/{filename}"
    appt.recording_url = recording_url
    await db.commit()

    return {"message": "Recording uploaded successfully", "recording_url": recording_url}


# ── Dynamic routes (MUST be after all static routes) ─────────────────────────
@router.get("/{other_user_id}")
async def get_messages(
    other_user_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    user_id = current_user.id

    messages = await db.scalars(
        select(Message).where(
            or_(
                and_(Message.sender_id == user_id, Message.receiver_id == other_user_id),
                and_(Message.sender_id == other_user_id, Message.receiver_id == user_id)
            )
        ).order_by(Message.sent_at.asc())
    )

    result = []
    for msg in messages:
        result.append({
            "id": msg.id,
            "sender_id": msg.sender_id,
            "receiver_id": msg.receiver_id,
            "content": msg.content,
            "sent_at": str(msg.sent_at),
            "is_read": msg.is_read,
            "appointment_id": msg.appointment_id,
        })

    unread_msgs = await db.scalars(
        select(Message).where(
            Message.sender_id == other_user_id,
            Message.receiver_id == user_id,
            Message.is_read == False
        )
    )
    for msg in unread_msgs:
        msg.is_read = True
    await db.commit()

    return result


@router.post("/{receiver_id}")
async def send_message(
    receiver_id: int,
    body: MessageCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    user_id = current_user.id

    receiver = await db.scalar(select(User).where(User.id == receiver_id))
    if not receiver:
        raise HTTPException(status_code=404, detail="User not found")

    message = Message(
        sender_id=user_id,
        receiver_id=receiver_id,
        content=body.content,
        appointment_id=body.appointment_id,
    )
    db.add(message)
    await db.commit()
    await db.refresh(message)

    msg_payload = {
        "type": "message",
        "id": message.id,
        "sender_id": user_id,
        "receiver_id": receiver_id,
        "content": body.content,
        "sent_at": str(message.sent_at),
        "is_read": False,
    }

    await manager.send_to_user(receiver_id, msg_payload)

    return {
        "id": message.id,
        "sender_id": message.sender_id,
        "receiver_id": message.receiver_id,
        "content": message.content,
        "sent_at": str(message.sent_at),
        "is_read": message.is_read,
    }


@router.delete("/{message_id}")
async def delete_message(
    message_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    user_id = current_user.id

    message = await db.scalar(
        select(Message).where(
            Message.id == message_id,
            Message.sender_id == user_id
        )
    )
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    await db.delete(message)
    await db.commit()
    return {"message": "Message deleted"}


# ── WebRTC Signaling Manager ──────────────────────────────────────────────────
class SignalingManager:
    def __init__(self):
        self.rooms: Dict[str, Dict[int, WebSocket]] = {}

    async def join_room(self, websocket: WebSocket, room_id: str, user_id: int):
        if room_id not in self.rooms:
            self.rooms[room_id] = {}
        self.rooms[room_id][user_id] = websocket

    def leave_room(self, room_id: str, user_id: int):
        if room_id in self.rooms:
            self.rooms[room_id].pop(user_id, None)
            if not self.rooms[room_id]:
                del self.rooms[room_id]

    async def broadcast_to_room(self, room_id: str, sender_id: int, message: dict):
        if room_id in self.rooms:
            for uid, ws in self.rooms[room_id].items():
                if uid != sender_id:
                    try:
                        await ws.send_json(message)
                    except:
                        pass

    def get_room_size(self, room_id: str) -> int:
        return len(self.rooms.get(room_id, {}))


signaling = SignalingManager()


@router.websocket("/signal/{room_id}")
async def webrtc_signal(
    websocket: WebSocket,
    room_id: str,
    token: str,
    db: AsyncSession = Depends(get_db)
):
    actual_user_id = None
    try:
        payload = decode_token(token)
        if not payload:
            await websocket.close(code=4001)
            return
        actual_user_id = int(payload.get("sub"))
    except Exception:
        await websocket.close(code=4001)
        return

    await websocket.accept()
    await signaling.join_room(websocket, room_id, actual_user_id)

    room_size = signaling.get_room_size(room_id)

    await websocket.send_json({
        "type": "joined",
        "user_id": actual_user_id,
        "is_initiator": room_size == 1,
        "room_size": room_size
    })

    await signaling.broadcast_to_room(room_id, actual_user_id, {
        "type": "peer_joined",
        "user_id": actual_user_id
    })

    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            msg["from_user"] = actual_user_id
            await signaling.broadcast_to_room(room_id, actual_user_id, msg)

    except WebSocketDisconnect:
        signaling.leave_room(room_id, actual_user_id)
        await signaling.broadcast_to_room(room_id, actual_user_id, {
            "type": "peer_left",
            "user_id": actual_user_id
        })
    except Exception as e:
        signaling.leave_room(room_id, actual_user_id)