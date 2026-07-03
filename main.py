"""
FreqMap Elite — FastAPI Backend
Требования: pip install fastapi motor pydantic pymongo passlib[bcrypt] uvicorn
Запуск:     uvicorn main:app --reload --port 8000
"""

import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone, timedelta
from typing import Optional, List

from bson import ObjectId
from pymongo import ReturnDocument

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ---------------------------------------------------------------------------
# Lifespan / DB init
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    app.mongodb_client = AsyncIOMotorClient(MONGO_URL)
    app.mongodb = app.mongodb_client.fpvmap
    # TTL-индекс на expire_at для авто-удаления маркеров
    await app.mongodb.markers.create_index("expire_at", expireAfterSeconds=0)
    await app.mongodb.users.create_index("username", unique=True)
    await app.mongodb.messages.create_index([("from_id", 1), ("to_id", 1), ("created_at", 1)])
    await app.mongodb.messages.create_index([("to_id", 1), ("read", 1)])
    await app.mongodb.friends.create_index([("from_id", 1), ("to_id", 1)])
    await app.mongodb.location_chat.create_index([("marker_id", 1), ("created_at", 1)])
    yield
    app.mongodb_client.close()


app = FastAPI(title="FreqMap Elite API", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
async def get_next_user_id(db) -> int:
    doc = await db.counters.find_one_and_update(
        {"_id": "userid"},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    return doc["seq"] - 1  # начинаем с 0


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------
class UserAuth(BaseModel):
    username: str = Field(..., min_length=3, max_length=20)
    password: str = Field(..., min_length=4)


class UserResponse(BaseModel):
    id: int
    username: str


class DroneProfile(BaseModel):
    id: Optional[str] = None
    name: str
    # Видеосистема (текстовое описание, напр. "Analog / Raceband", "DJI O3 40MHz")
    video_system: str
    # Band — ключ из ANALOG_BANDS или DIGITAL_SYSTEMS (напр. "R", "DJI O3 10/20MHz")
    band: Optional[str] = None
    # Канал 1–8
    channel: Optional[int] = Field(default=None, ge=1, le=8)
    # Итоговая частота в МГц (вычисляется на фронте, хранится для быстрого поиска)
    frequency_mhz: Optional[int] = None
    # Мощность в mW
    power_mw: int = 200
    # Размер дрона
    drone_size: str = "5 inch"
    # Вес в граммах (опционально)
    weight_g: Optional[int] = None


class Coordinates(BaseModel):
    lat: float
    lng: float


class MarkerCreate(BaseModel):
    pilot_id: int
    drone_id: str
    coordinates: Coordinates
    duration_hours: int = Field(default=2, ge=1, le=24)


class MarkerResponse(BaseModel):
    id: str
    pilot_id: int
    pilot_username: str
    coordinates: Coordinates
    drone: DroneProfile
    created_at: datetime
    expire_at: datetime


# ---------------------------------------------------------------------------
# Auth endpoints
# ---------------------------------------------------------------------------
@app.post("/api/auth/register", response_model=UserResponse, status_code=201)
async def register(auth_data: UserAuth):
    existing = await app.mongodb.users.find_one({"username": auth_data.username})
    if existing:
        raise HTTPException(status_code=400, detail="Ник уже занят")

    new_id = await get_next_user_id(app.mongodb)
    hashed_pw = pwd_context.hash(auth_data.password)
    new_user = {
        "_id": new_id,
        "username": auth_data.username,
        "password": hashed_pw,
        "created_at": datetime.now(timezone.utc),
    }
    await app.mongodb.users.insert_one(new_user)
    return {"id": new_id, "username": auth_data.username}


@app.post("/api/auth/login", response_model=UserResponse)
async def login(auth_data: UserAuth):
    user = await app.mongodb.users.find_one({"username": auth_data.username})
    if not user:
        raise HTTPException(status_code=401, detail="Неверный логин или пароль")

    # Поддержка старых plain-text паролей (миграция на bcrypt)
    pw_ok = False
    stored_pw = user.get("password", "")
    if stored_pw.startswith("$2b$") or stored_pw.startswith("$2a$"):
        pw_ok = pwd_context.verify(auth_data.password, stored_pw)
    else:
        # Legacy plain-text — сравниваем напрямую, потом перехешируем
        pw_ok = stored_pw == auth_data.password
        if pw_ok:
            await app.mongodb.users.update_one(
                {"_id": user["_id"]},
                {"$set": {"password": pwd_context.hash(auth_data.password)}}
            )

    if not pw_ok:
        raise HTTPException(status_code=401, detail="Неверный логин или пароль")

    return {"id": user["_id"], "username": user["username"]}


# ---------------------------------------------------------------------------
# Drone endpoints
# ---------------------------------------------------------------------------
@app.post("/api/pilots/{pilot_id}/drones", status_code=201)
async def add_drone(pilot_id: int, drone: DroneProfile):
    # Проверяем, что пилот существует
    pilot = await app.mongodb.users.find_one({"_id": pilot_id})
    if not pilot:
        raise HTTPException(status_code=404, detail="Пилот не найден")

    drone_dict = drone.model_dump(exclude={"id"})
    drone_dict["pilot_id"] = pilot_id
    result = await app.mongodb.drones.insert_one(drone_dict)
    return {"status": "success", "drone_id": str(result.inserted_id)}


@app.get("/api/pilots/{pilot_id}/drones", response_model=List[DroneProfile])
async def get_drones(pilot_id: int):
    raw_drones = await app.mongodb.drones.find({"pilot_id": pilot_id}).to_list(length=100)
    return [{"id": str(d.pop("_id")), **d} for d in raw_drones]


@app.delete("/api/pilots/{pilot_id}/drones/{drone_id}", status_code=204)
async def delete_drone(pilot_id: int, drone_id: str):
    result = await app.mongodb.drones.delete_one(
        {"_id": ObjectId(drone_id), "pilot_id": pilot_id}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=403, detail="Нет прав или дрон не найден")


# ---------------------------------------------------------------------------
# Marker endpoints
# ---------------------------------------------------------------------------
@app.post("/api/markers", status_code=201)
async def create_marker(marker: MarkerCreate):
    drone_data = await app.mongodb.drones.find_one({"_id": ObjectId(marker.drone_id)})
    pilot_data = await app.mongodb.users.find_one({"_id": marker.pilot_id})
    if not drone_data or not pilot_data:
        raise HTTPException(status_code=404, detail="Пилот или дрон не найден")

    now = datetime.now(timezone.utc)
    marker_dict = {
        "pilot_id": marker.pilot_id,
        "pilot_username": pilot_data["username"],
        "coordinates": marker.coordinates.model_dump(),
        "drone_id": marker.drone_id,
        "created_at": now,
        "expire_at": now + timedelta(hours=marker.duration_hours),
    }
    result = await app.mongodb.markers.insert_one(marker_dict)
    return {"status": "success", "marker_id": str(result.inserted_id)}


@app.get("/api/markers", response_model=List[MarkerResponse])
async def get_markers():
    raw_markers = await app.mongodb.markers.find().to_list(length=1000)
    response_markers = []
    for m in raw_markers:
        drone_data = await app.mongodb.drones.find_one({"_id": ObjectId(m["drone_id"])})
        if drone_data:
            drone_data["id"] = str(drone_data.pop("_id"))
            response_markers.append({
                "id": str(m["_id"]),
                "pilot_id": m["pilot_id"],
                "pilot_username": m["pilot_username"],
                "coordinates": m["coordinates"],
                "drone": drone_data,
                "created_at": m["created_at"],
                "expire_at": m["expire_at"],
            })
    return response_markers


@app.delete("/api/markers/{marker_id}", status_code=204)
async def delete_marker(marker_id: str, pilot_id: int):
    result = await app.mongodb.markers.delete_one(
        {"_id": ObjectId(marker_id), "pilot_id": pilot_id}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=403, detail="Нет прав или метка не найдена")


# ---------------------------------------------------------------------------
# Pilots search
# ---------------------------------------------------------------------------
@app.get("/api/pilots/search")
async def search_pilots(q: str):
    import re
    pattern = re.compile(re.escape(q), re.IGNORECASE)
    docs = await app.mongodb.users.find(
        {"username": {"$regex": pattern}}
    ).limit(20).to_list(length=20)
    return [{"id": d["_id"], "username": d["username"]} for d in docs]


# ---------------------------------------------------------------------------
# Friends system
# ---------------------------------------------------------------------------
class FriendRequest(BaseModel):
    from_id: int
    to_id: int


@app.post("/api/friends/request", status_code=201)
async def send_friend_request(req: FriendRequest):
    if req.from_id == req.to_id:
        raise HTTPException(status_code=400, detail="Нельзя добавить себя")
    # Check both exist
    for uid in [req.from_id, req.to_id]:
        if not await app.mongodb.users.find_one({"_id": uid}):
            raise HTTPException(status_code=404, detail=f"Пилот {uid} не найден")
    # Check already friends or pending
    existing = await app.mongodb.friends.find_one({
        "$or": [
            {"from_id": req.from_id, "to_id": req.to_id},
            {"from_id": req.to_id, "to_id": req.from_id},
        ]
    })
    if existing:
        raise HTTPException(status_code=409, detail="Запрос уже существует или вы уже друзья")
    await app.mongodb.friends.insert_one({
        "from_id": req.from_id,
        "to_id": req.to_id,
        "status": "pending",
        "created_at": datetime.now(timezone.utc),
    })
    return {"status": "ok"}


@app.post("/api/friends/accept")
async def accept_friend_request(req: FriendRequest):
    result = await app.mongodb.friends.find_one_and_update(
        {"from_id": req.from_id, "to_id": req.to_id, "status": "pending"},
        {"$set": {"status": "accepted", "accepted_at": datetime.now(timezone.utc)}},
    )
    if not result:
        raise HTTPException(status_code=404, detail="Запрос не найден")
    return {"status": "ok"}


@app.post("/api/friends/reject")
async def reject_friend_request(req: FriendRequest):
    await app.mongodb.friends.delete_one(
        {"from_id": req.from_id, "to_id": req.to_id, "status": "pending"}
    )
    return {"status": "ok"}


@app.delete("/api/friends")
async def remove_friend(from_id: int, to_id: int):
    await app.mongodb.friends.delete_one({
        "$or": [
            {"from_id": from_id, "to_id": to_id},
            {"from_id": to_id, "to_id": from_id},
        ],
        "status": "accepted",
    })
    return {"status": "ok"}


@app.get("/api/friends/{pilot_id}")
async def get_friends(pilot_id: int):
    docs = await app.mongodb.friends.find({
        "$or": [{"from_id": pilot_id}, {"to_id": pilot_id}]
    }).to_list(length=500)

    result = {"friends": [], "incoming": [], "outgoing": []}
    for d in docs:
        other_id = d["to_id"] if d["from_id"] == pilot_id else d["from_id"]
        other = await app.mongodb.users.find_one({"_id": other_id})
        if not other:
            continue
        entry = {"id": other_id, "username": other["username"], "doc_id": str(d["_id"])}
        if d["status"] == "accepted":
            result["friends"].append(entry)
        elif d["status"] == "pending":
            if d["to_id"] == pilot_id:
                result["incoming"].append({**entry, "from_id": d["from_id"]})
            else:
                result["outgoing"].append(entry)
    return result


# ---------------------------------------------------------------------------
# Private messages (DM)
# ---------------------------------------------------------------------------
class DMCreate(BaseModel):
    from_id: int
    to_id: int
    text: str = Field(..., min_length=1, max_length=2000)


@app.post("/api/messages", status_code=201)
async def send_dm(msg: DMCreate):
    # Must be friends
    friendship = await app.mongodb.friends.find_one({
        "$or": [
            {"from_id": msg.from_id, "to_id": msg.to_id},
            {"from_id": msg.to_id, "to_id": msg.from_id},
        ],
        "status": "accepted",
    })
    if not friendship:
        raise HTTPException(status_code=403, detail="Можно писать только друзьям")
    sender = await app.mongodb.users.find_one({"_id": msg.from_id})
    doc = {
        "from_id": msg.from_id,
        "from_username": sender["username"],
        "to_id": msg.to_id,
        "text": msg.text,
        "read": False,
        "created_at": datetime.now(timezone.utc),
    }
    result = await app.mongodb.messages.insert_one(doc)
    return {"status": "ok", "id": str(result.inserted_id)}


@app.get("/api/messages/{pilot_id}/{other_id}")
async def get_dm_thread(pilot_id: int, other_id: int, since: Optional[str] = None):
    query: dict = {
        "$or": [
            {"from_id": pilot_id, "to_id": other_id},
            {"from_id": other_id, "to_id": pilot_id},
        ]
    }
    if since:
        try:
            query["created_at"] = {"$gt": datetime.fromisoformat(since)}
        except ValueError:
            pass
    msgs = await app.mongodb.messages.find(query).sort("created_at", 1).to_list(length=200)
    # Mark as read
    await app.mongodb.messages.update_many(
        {"from_id": other_id, "to_id": pilot_id, "read": False},
        {"$set": {"read": True}},
    )
    return [{"id": str(m["_id"]), "from_id": m["from_id"], "from_username": m["from_username"],
             "to_id": m["to_id"], "text": m["text"], "read": m.get("read", False),
             "created_at": m["created_at"].isoformat()} for m in msgs]


@app.get("/api/messages/{pilot_id}/unread/count")
async def unread_count(pilot_id: int):
    count = await app.mongodb.messages.count_documents({"to_id": pilot_id, "read": False})
    return {"count": count}


# ---------------------------------------------------------------------------
# Location chat (public — one chat per marker cluster, keyed by marker_id)
# ---------------------------------------------------------------------------
class LocationMsgCreate(BaseModel):
    pilot_id: int
    marker_id: str
    text: str = Field(..., min_length=1, max_length=1000)


@app.post("/api/location-chat", status_code=201)
async def post_location_msg(msg: LocationMsgCreate):
    sender = await app.mongodb.users.find_one({"_id": msg.pilot_id})
    if not sender:
        raise HTTPException(status_code=404, detail="Пилот не найден")
    doc = {
        "pilot_id": msg.pilot_id,
        "pilot_username": sender["username"],
        "marker_id": msg.marker_id,
        "text": msg.text,
        "created_at": datetime.now(timezone.utc),
    }
    result = await app.mongodb.location_chat.insert_one(doc)
    return {"status": "ok", "id": str(result.inserted_id)}


@app.get("/api/location-chat/{marker_id}")
async def get_location_chat(marker_id: str, since: Optional[str] = None):
    query: dict = {"marker_id": marker_id}
    if since:
        try:
            query["created_at"] = {"$gt": datetime.fromisoformat(since)}
        except ValueError:
            pass
    msgs = await app.mongodb.location_chat.find(query).sort("created_at", 1).to_list(length=300)
    return [{"id": str(m["_id"]), "pilot_id": m["pilot_id"],
             "pilot_username": m["pilot_username"],
             "text": m["text"],
             "created_at": m["created_at"].isoformat()} for m in msgs]
