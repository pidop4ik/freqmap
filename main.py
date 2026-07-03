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
