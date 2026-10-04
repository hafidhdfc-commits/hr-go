import os
import uuid
import logging
import re
from pathlib import Path
from datetime import datetime, timezone, timedelta, date
from typing import List, Optional
from contextlib import asynccontextmanager
from zoneinfo import ZoneInfo

import jwt
from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from passlib.context import CryptContext

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

JWT_SECRET = os.environ.get("JWT_SECRET", "hrgo-dev-secret-change-me")
JWT_ALG = "HS256"
ACCESS_DAYS = 7
WIB = ZoneInfo("Asia/Jakarta")

pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("hrgo")


# ----------------------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------------------
def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def iso(dt: Optional[datetime]) -> Optional[str]:
    if dt is None:
        return None
    if isinstance(dt, str):
        return dt
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


def norm(v: Optional[str]) -> Optional[str]:
    return v.strip().lower() if v and v.strip() else None


def clean(doc: dict) -> dict:
    if not doc:
        return doc
    doc = dict(doc)
    doc.pop("_id", None)
    return doc


def public_user(u: dict) -> dict:
    u = clean(u)
    u.pop("password_hash", None)
    u.pop("reset_hash", None)
    return u


def hash_password(p: str) -> str:
    return pwd.hash(p)


def verify_password(p: str, h: str) -> bool:
    try:
        return pwd.verify(p, h)
    except Exception:
        return False


def normalize_phone(phone: Optional[str]) -> Optional[str]:
    """Normalize to international +62 format for WhatsApp deep links."""
    if not phone:
        return None
    digits = re.sub(r"[^0-9+]", "", phone)
    if digits.startswith("+"):
        return digits
    if digits.startswith("0"):
        return "+62" + digits[1:]
    if digits.startswith("62"):
        return "+" + digits
    return "+62" + digits


def wa_digits(phone: Optional[str]) -> str:
    if not phone:
        return ""
    return re.sub(r"[^0-9]", "", normalize_phone(phone) or "")


def greeting_now() -> str:
    h = datetime.now(WIB).hour
    if 5 <= h <= 10:
        return "pagi"
    if 11 <= h <= 17:
        return "siang"
    return "malam"


def rupiah(amount: int) -> str:
    return "Rp" + f"{int(amount):,}".replace(",", ".")


# ----------------------------------------------------------------------------
# Auth / JWT
# ----------------------------------------------------------------------------
def create_token(user: dict) -> str:
    payload = {
        "sub": user["id"],
        "role": user["role"],
        "type": "access",
        "iat": now_utc(),
        "exp": now_utc() + timedelta(days=ACCESS_DAYS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


from fastapi import Header  # noqa: E402


async def current_user(authorization: Optional[str] = Header(default=None)) -> dict:
    unauth = HTTPException(status_code=401, detail="Invalid or missing credentials")
    if not authorization or not authorization.lower().startswith("bearer "):
        raise unauth
    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        if payload.get("type") != "access":
            raise unauth
        user = await db.users.find_one({"id": payload["sub"]})
    except HTTPException:
        raise
    except Exception:
        raise unauth
    if not user:
        raise unauth
    if user.get("status") != "ACTIVE":
        raise HTTPException(status_code=403, detail="Account is not active")
    return user


def require(*roles):
    async def dep(user: dict = Depends(current_user)) -> dict:
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions for this action")
        return user

    return dep


# ----------------------------------------------------------------------------
# Audit log
# ----------------------------------------------------------------------------
async def audit(actor: dict, action: str, *, category: str = "OPERATION",
                entity: Optional[str] = None, entity_id: Optional[str] = None,
                trip_number: Optional[str] = None, customer: Optional[str] = None,
                old_value=None, new_value=None, reason: Optional[str] = None,
                sensitive: bool = False):
    entry = {
        "id": new_id(),
        "actor_id": actor["id"],
        "actor_name": actor.get("full_name"),
        "actor_role": actor["role"],
        "action": action,
        "category": category,  # OPERATION | FINANCIAL | SECURITY | USER | CONTACT
        "entity": entity,
        "entity_id": entity_id,
        "trip_number": trip_number,
        "customer": customer,
        "old_value": old_value,
        "new_value": new_value,
        "reason": reason,
        "sensitive": sensitive,
        "created_at": now_utc(),
    }
    await db.audit_logs.insert_one(entry)
    return entry


# ----------------------------------------------------------------------------
# Models
# ----------------------------------------------------------------------------
class LoginIn(BaseModel):
    identifier: str
    password: str


class ChangePasswordIn(BaseModel):
    old_password: str
    new_password: str = Field(min_length=4)


class CreateUserIn(BaseModel):
    full_name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    username: Optional[str] = None
    password: str = Field(min_length=4)
    role: str  # ADMIN | DRIVER
    status: str = "ACTIVE"
    employee_id: Optional[str] = None
    driver_id: Optional[str] = None
    license_number: Optional[str] = None
    license_expiry: Optional[str] = None
    emergency_contact: Optional[str] = None
    assigned_vehicle_id: Optional[str] = None
    # Optional: register the driver's own car (owner-operator)
    register_own_car: bool = False
    car_name: Optional[str] = None
    car_plate: Optional[str] = None
    car_type: Optional[str] = None
    car_capacity: Optional[int] = None


class UpdateUserIn(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    username: Optional[str] = None
    employee_id: Optional[str] = None
    driver_id: Optional[str] = None
    license_number: Optional[str] = None
    license_expiry: Optional[str] = None
    emergency_contact: Optional[str] = None
    assigned_vehicle_id: Optional[str] = None
    status: Optional[str] = None


class ResetPwIn(BaseModel):
    new_password: str = Field(min_length=4)


class StatusIn(BaseModel):
    status: str  # ACTIVE | INACTIVE | SUSPENDED


class CustomerIn(BaseModel):
    name: str
    company: Optional[str] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    email: Optional[str] = None
    billing_contact: Optional[str] = None
    billing_email: Optional[str] = None
    address: Optional[str] = None
    contract_type: str = "ONE_TIME"  # ONE_TIME | MONTHLY_CONTRACT
    status: str = "ACTIVE"


class VehicleIn(BaseModel):
    name: str
    plate: str
    type: Optional[str] = "Van"
    capacity: Optional[int] = 6
    status: str = "AVAILABLE"  # AVAILABLE | ON_TRIP | MAINTENANCE
    ownership: Optional[str] = "FLEET"  # FLEET | DRIVER_OWNED
    owned_by_driver_id: Optional[str] = None
    owner_name: Optional[str] = None


class VehicleUpdateIn(BaseModel):
    name: Optional[str] = None
    plate: Optional[str] = None
    type: Optional[str] = None
    capacity: Optional[int] = None
    status: Optional[str] = None


class RouteIn(BaseModel):
    name: str
    origin: str
    destination: str
    base_price: int = 0


class RouteUpdateIn(BaseModel):
    name: Optional[str] = None
    origin: Optional[str] = None
    destination: Optional[str] = None
    base_price: Optional[int] = None


class TripIn(BaseModel):
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    passenger_name: Optional[str] = None
    passenger_phone: Optional[str] = None
    passenger_whatsapp: Optional[str] = None
    pickup_address: str
    pickup_meeting_point: Optional[str] = None
    destination_address: str
    additional_stop: Optional[str] = None
    pickup_time: Optional[str] = None
    flight_number: Optional[str] = None
    terminal: Optional[str] = None
    special_instructions: Optional[str] = None
    driver_id: Optional[str] = None
    vehicle_id: Optional[str] = None
    price: int = 0
    discount: int = 0
    additional_charges: int = 0


class TripUpdateIn(TripIn):
    pickup_address: Optional[str] = None
    destination_address: Optional[str] = None
    status: Optional[str] = None
    reason: Optional[str] = None  # override reason


class AssignIn(BaseModel):
    driver_id: Optional[str] = None
    vehicle_id: Optional[str] = None


class TripStatusIn(BaseModel):
    status: str
    reason: Optional[str] = None


class DeclineIn(BaseModel):
    reason: Optional[str] = None


class ContactLogIn(BaseModel):
    action: str  # "Opened customer WhatsApp" | "Customer Called" | "Driver Arrived"


class InvoiceDailyIn(BaseModel):
    customer_id: str
    trip_ids: List[str]
    due_date: Optional[str] = None


class InvoiceMonthlyIn(BaseModel):
    customer_id: str
    period_start: str
    period_end: str
    period_label: Optional[str] = None
    due_date: Optional[str] = None


class InvoiceUpdateIn(BaseModel):
    discount: Optional[int] = None
    additional_charges: Optional[int] = None
    payment_status: Optional[str] = None  # UNPAID | PAID | PARTIAL
    due_date: Optional[str] = None
    reason: Optional[str] = None


class WhatsAppSendIn(BaseModel):
    template_id: Optional[str] = None


class TemplateIn(BaseModel):
    template_name: str
    category: str  # INVOICE | DRIVER_CONTACT
    content: str
    active: bool = True


class TemplateUpdateIn(BaseModel):
    template_name: Optional[str] = None
    content: Optional[str] = None
    active: Optional[bool] = None


class SettingsIn(BaseModel):
    company_name: Optional[str] = None
    brand: Optional[str] = None
    business_name: Optional[str] = None
    tagline: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    tax_info: Optional[str] = None
    bank_account: Optional[str] = None
    admin_can_edit_templates: Optional[bool] = None
    google_maps_prefer: Optional[str] = None


# ----------------------------------------------------------------------------
# App + Router
# ----------------------------------------------------------------------------
api = APIRouter(prefix="/api")


@api.get("/")
async def root():
    return {"service": "HR-Go", "status": "ok"}


# ---- AUTH ----
@api.post("/auth/login")
async def login(body: LoginIn):
    ident = norm(body.identifier)
    user = await db.users.find_one({"$or": [{"username": ident}, {"email": ident}, {"phone_norm": ident}]})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if user.get("status") != "ACTIVE":
        raise HTTPException(status_code=403, detail="Account is not active. Contact the Owner.")
    await db.users.update_one({"id": user["id"]}, {"$set": {"last_login": now_utc()}})
    user["last_login"] = now_utc()
    return {"access_token": create_token(user), "token_type": "bearer", "user": public_user(user)}


@api.get("/auth/me")
async def me(user: dict = Depends(current_user)):
    return public_user(user)


@api.post("/auth/change-password")
async def change_password(body: ChangePasswordIn, user: dict = Depends(current_user)):
    if not verify_password(body.old_password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    await db.users.update_one({"id": user["id"]}, {"$set": {"password_hash": hash_password(body.new_password)}})
    await audit(user, "Changed own password", category="SECURITY", entity="user", entity_id=user["id"])
    return {"ok": True}


# ---- USERS (OWNER only) ----
async def active_owner_count(exclude_id: Optional[str] = None) -> int:
    q = {"role": "OWNER", "status": "ACTIVE"}
    if exclude_id:
        q["id"] = {"$ne": exclude_id}
    return await db.users.count_documents(q)


@api.get("/users")
async def list_users(role: Optional[str] = None, status_f: Optional[str] = Query(default=None, alias="status"),
                     owner: dict = Depends(require("OWNER"))):
    q = {}
    if role:
        q["role"] = role
    if status_f:
        q["status"] = status_f
    users = await db.users.find(q).sort("created_at", -1).to_list(500)
    return [public_user(u) for u in users]


@api.post("/users")
async def create_user(body: CreateUserIn, owner: dict = Depends(require("OWNER"))):
    if body.role not in ("ADMIN", "DRIVER"):
        raise HTTPException(status_code=400, detail="Owner can only create ADMIN or DRIVER accounts")
    uname = norm(body.username) or norm(body.email) or norm(body.phone)
    doc = {
        "id": new_id(),
        "full_name": body.full_name,
        "phone": body.phone,
        "phone_norm": norm(normalize_phone(body.phone)),
        "email": norm(body.email),
        "username": uname,
        "password_hash": hash_password(body.password),
        "role": body.role,
        "status": body.status or "ACTIVE",
        "employee_id": body.employee_id,
        "driver_id": body.driver_id,
        "license_number": body.license_number,
        "license_expiry": body.license_expiry,
        "emergency_contact": body.emergency_contact,
        "assigned_vehicle_id": body.assigned_vehicle_id,
        "last_login": None,
        "created_at": now_utc(),
        "deleted_at": None,
    }
    await db.users.insert_one(doc)
    # Owner-operator: register the driver's own car and assign it permanently
    if body.role == "DRIVER" and body.register_own_car and body.car_plate:
        vehicle = {
            "id": new_id(),
            "name": body.car_name or f"{body.full_name}'s car",
            "plate": body.car_plate,
            "type": body.car_type or "Private Car",
            "capacity": body.car_capacity or 4,
            "status": "AVAILABLE",
            "ownership": "DRIVER_OWNED",
            "owned_by_driver_id": doc["id"],
            "owner_name": body.full_name,
            "created_at": now_utc(),
        }
        await db.vehicles.insert_one(vehicle)
        await db.users.update_one({"id": doc["id"]}, {"$set": {"assigned_vehicle_id": vehicle["id"]}})
        doc["assigned_vehicle_id"] = vehicle["id"]
        await audit(owner, "Registered driver-owned car", entity="vehicle", entity_id=vehicle["id"],
                    new_value=f"{vehicle['name']} {vehicle['plate']}")
    await audit(owner, f"Created {body.role}", category="USER", entity="user", entity_id=doc["id"],
                new_value=body.full_name)
    return public_user(doc)


@api.get("/users/{uid}")
async def get_user(uid: str, user: dict = Depends(current_user)):
    if user["role"] != "OWNER" and user["id"] != uid:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    u = await db.users.find_one({"id": uid})
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    return public_user(u)


@api.patch("/users/{uid}")
async def update_user(uid: str, body: UpdateUserIn, owner: dict = Depends(require("OWNER"))):
    u = await db.users.find_one({"id": uid})
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    if u["role"] == "OWNER":
        raise HTTPException(status_code=403, detail="OWNER accounts cannot be modified here")
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if "phone" in updates:
        updates["phone_norm"] = norm(normalize_phone(updates["phone"]))
    if "email" in updates:
        updates["email"] = norm(updates["email"])
    if "username" in updates:
        updates["username"] = norm(updates["username"])
    if updates:
        await db.users.update_one({"id": uid}, {"$set": updates})
    await audit(owner, f"Edited {u['role']} account", category="USER", entity="user", entity_id=uid,
                new_value=u.get("full_name"))
    u = await db.users.find_one({"id": uid})
    return public_user(u)


@api.post("/users/{uid}/reset-password")
async def reset_password(uid: str, body: ResetPwIn, owner: dict = Depends(require("OWNER"))):
    u = await db.users.find_one({"id": uid})
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    if u["role"] == "OWNER" and u["id"] != owner["id"]:
        raise HTTPException(status_code=403, detail="Cannot reset another OWNER's password")
    await db.users.update_one({"id": uid}, {"$set": {"password_hash": hash_password(body.new_password)}})
    await audit(owner, f"Reset password for {u['role']}", category="SECURITY", entity="user", entity_id=uid,
                new_value=u.get("full_name"), sensitive=True)
    return {"ok": True}


@api.post("/users/{uid}/status")
async def set_user_status(uid: str, body: StatusIn, owner: dict = Depends(require("OWNER"))):
    if body.status not in ("ACTIVE", "INACTIVE", "SUSPENDED"):
        raise HTTPException(status_code=400, detail="Invalid status")
    u = await db.users.find_one({"id": uid})
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    if u["role"] == "OWNER" and body.status != "ACTIVE":
        if await active_owner_count(exclude_id=uid) == 0:
            raise HTTPException(status_code=400, detail="At least one active OWNER must remain")
    await db.users.update_one({"id": uid}, {"$set": {"status": body.status}})
    await audit(owner, f"Set {u['role']} status to {body.status}", category="USER", entity="user",
                entity_id=uid, old_value=u.get("status"), new_value=body.status)
    u = await db.users.find_one({"id": uid})
    return public_user(u)


@api.get("/drivers")
async def list_drivers(user: dict = Depends(require("OWNER", "ADMIN"))):
    rows = await db.users.find({"role": "DRIVER"}).sort("full_name", 1).to_list(500)
    return [{"id": d["id"], "full_name": d["full_name"], "status": d["status"],
             "phone": d.get("phone"), "driver_id": d.get("driver_id"),
             "assigned_vehicle_id": d.get("assigned_vehicle_id")} for d in rows]


# ---- DASHBOARDS ----
@api.get("/dashboard/owner")
async def owner_dashboard(owner: dict = Depends(require("OWNER"))):
    return await _build_overview(include_financial=True)


@api.get("/dashboard/admin")
async def admin_dashboard(user: dict = Depends(require("OWNER", "ADMIN"))):
    return await _build_overview(include_financial=True)


async def _build_overview(include_financial: bool):
    trips = await db.trips.find({}).to_list(2000)
    invoices = await db.invoices.find({}).to_list(2000)
    customers = await db.customers.find({}).to_list(2000)
    drivers = await db.users.find({"role": "DRIVER"}).to_list(500)
    vehicles = await db.vehicles.find({}).to_list(500)

    today = datetime.now(WIB).date()

    def is_today(t):
        pt = t.get("pickup_time")
        try:
            return pt and datetime.fromisoformat(pt.replace("Z", "+00:00")).astimezone(WIB).date() == today
        except Exception:
            return False

    total_trips = len(trips)
    completed = len([t for t in trips if t["status"] == "COMPLETED"])
    active = len([t for t in trips if t["status"] in ("ASSIGNED", "ACCEPTED", "ON_THE_WAY", "ARRIVED", "IN_PROGRESS")])
    cancelled = len([t for t in trips if t["status"] == "CANCELLED"])

    total_revenue = sum(i["total"] for i in invoices if i.get("payment_status") == "PAID")
    paid_invoices = len([i for i in invoices if i.get("payment_status") == "PAID"])
    outstanding_invoices = len([i for i in invoices if i.get("payment_status") != "PAID"])
    outstanding_amount = sum(i["total"] for i in invoices if i.get("payment_status") != "PAID")

    drivers_on_trip = len({t.get("driver_id") for t in trips if t["status"] in ("ACCEPTED", "ON_THE_WAY", "ARRIVED", "IN_PROGRESS") and t.get("driver_id")})
    active_drivers = len([d for d in drivers if d["status"] == "ACTIVE"])
    available_drivers = max(active_drivers - drivers_on_trip, 0)

    vehicles_on_trip = len([v for v in vehicles if v["status"] == "ON_TRIP"])
    vehicles_maint = len([v for v in vehicles if v["status"] == "MAINTENANCE"])
    vehicles_avail = len([v for v in vehicles if v["status"] == "AVAILABLE"])

    def rev_since(days):
        cutoff = now_utc() - timedelta(days=days)
        s = 0
        for i in invoices:
            if i.get("payment_status") == "PAID":
                ca = i.get("created_at")
                if isinstance(ca, datetime) and ca.replace(tzinfo=ca.tzinfo or timezone.utc) >= cutoff:
                    s += i["total"]
        return s

    data = {
        "business": {
            "total_trips": total_trips,
            "completed_trips": completed,
            "active_trips": active,
            "cancelled_trips": cancelled,
            "total_revenue": total_revenue,
            "paid_invoices": paid_invoices,
            "outstanding_invoices": outstanding_invoices,
        },
        "operations": {
            "todays_trips": len([t for t in trips if is_today(t)]),
            "active_drivers": active_drivers,
            "available_drivers": available_drivers,
            "drivers_on_trip": drivers_on_trip,
            "available_vehicles": vehicles_avail,
            "vehicles_on_trip": vehicles_on_trip,
            "vehicles_in_maintenance": vehicles_maint,
        },
        "customers": {
            "total_customers": len(customers),
            "active_customers": len([c for c in customers if c["status"] == "ACTIVE"]),
            "monthly_contract_customers": len([c for c in customers if c.get("contract_type") == "MONTHLY_CONTRACT"]),
        },
    }
    if include_financial:
        data["financial"] = {
            "todays_revenue": rev_since(1),
            "this_week": rev_since(7),
            "this_month": rev_since(30),
            "outstanding_payments": outstanding_amount,
        }
    return data


@api.get("/dashboard/driver")
async def driver_dashboard(driver: dict = Depends(require("DRIVER"))):
    trips = await db.trips.find({"driver_id": driver["id"]}).to_list(1000)
    upcoming = [t for t in trips if t["status"] in ("ASSIGNED", "ACCEPTED", "ON_THE_WAY", "ARRIVED", "IN_PROGRESS")]
    return {
        "assigned": len([t for t in trips if t["status"] == "ASSIGNED"]),
        "active": len([t for t in trips if t["status"] in ("ACCEPTED", "ON_THE_WAY", "ARRIVED", "IN_PROGRESS")]),
        "completed": len([t for t in trips if t["status"] == "COMPLETED"]),
        "upcoming_count": len(upcoming),
    }


# ---- CUSTOMERS ----
@api.get("/customers")
async def list_customers(user: dict = Depends(require("OWNER", "ADMIN"))):
    rows = await db.customers.find({}).sort("created_at", -1).to_list(1000)
    return [clean(r) for r in rows]


@api.post("/customers")
async def create_customer(body: CustomerIn, user: dict = Depends(require("OWNER", "ADMIN"))):
    doc = body.model_dump()
    doc["id"] = new_id()
    doc["whatsapp"] = normalize_phone(body.whatsapp or body.phone)
    doc["phone"] = body.phone
    doc["created_at"] = now_utc()
    doc["deleted_at"] = None
    await db.customers.insert_one(doc)
    await audit(user, "Created customer", entity="customer", entity_id=doc["id"], new_value=body.name)
    return clean(doc)


@api.get("/customers/{cid}")
async def get_customer(cid: str, user: dict = Depends(require("OWNER", "ADMIN"))):
    c = await db.customers.find_one({"id": cid})
    if not c:
        raise HTTPException(status_code=404, detail="Customer not found")
    return clean(c)


@api.patch("/customers/{cid}")
async def update_customer(cid: str, body: CustomerIn, user: dict = Depends(require("OWNER", "ADMIN"))):
    c = await db.customers.find_one({"id": cid})
    if not c:
        raise HTTPException(status_code=404, detail="Customer not found")
    updates = body.model_dump()
    updates["whatsapp"] = normalize_phone(body.whatsapp or body.phone)
    await db.customers.update_one({"id": cid}, {"$set": updates})
    await audit(user, "Edited customer", entity="customer", entity_id=cid, new_value=body.name)
    c = await db.customers.find_one({"id": cid})
    return clean(c)


# ---- VEHICLES ----
@api.get("/vehicles")
async def list_vehicles(user: dict = Depends(require("OWNER", "ADMIN"))):
    rows = await db.vehicles.find({}).sort("created_at", -1).to_list(500)
    return [clean(r) for r in rows]


@api.post("/vehicles")
async def create_vehicle(body: VehicleIn, user: dict = Depends(require("OWNER", "ADMIN"))):
    doc = body.model_dump()
    doc["id"] = new_id()
    doc["created_at"] = now_utc()
    await db.vehicles.insert_one(doc)
    await audit(user, "Added vehicle", entity="vehicle", entity_id=doc["id"], new_value=f"{body.name} {body.plate}")
    return clean(doc)


@api.patch("/vehicles/{vid}")
async def update_vehicle(vid: str, body: VehicleUpdateIn, user: dict = Depends(require("OWNER", "ADMIN"))):
    v = await db.vehicles.find_one({"id": vid})
    if not v:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    updates = {k: val for k, val in body.model_dump().items() if val is not None}
    if updates:
        await db.vehicles.update_one({"id": vid}, {"$set": updates})
    await audit(user, "Edited vehicle", entity="vehicle", entity_id=vid, new_value=updates.get("name") or v.get("name"))
    v = await db.vehicles.find_one({"id": vid})
    return clean(v)


# ---- ROUTES ----
@api.get("/routes")
async def list_routes(user: dict = Depends(require("OWNER", "ADMIN"))):
    rows = await db.routes.find({}).sort("created_at", -1).to_list(500)
    return [clean(r) for r in rows]


@api.post("/routes")
async def create_route(body: RouteIn, user: dict = Depends(require("OWNER", "ADMIN"))):
    doc = body.model_dump()
    doc["id"] = new_id()
    doc["created_at"] = now_utc()
    await db.routes.insert_one(doc)
    await audit(user, "Created route", entity="route", entity_id=doc["id"], new_value=body.name)
    return clean(doc)


@api.patch("/routes/{rid}")
async def update_route(rid: str, body: RouteUpdateIn, user: dict = Depends(require("OWNER", "ADMIN"))):
    r = await db.routes.find_one({"id": rid})
    if not r:
        raise HTTPException(status_code=404, detail="Route not found")
    updates = {k: val for k, val in body.model_dump().items() if val is not None}
    if updates:
        await db.routes.update_one({"id": rid}, {"$set": updates})
    await audit(user, "Edited route", entity="route", entity_id=rid, new_value=updates.get("name") or r.get("name"))
    r = await db.routes.find_one({"id": rid})
    return clean(r)


# ---- TRIPS ----
async def gen_trip_number() -> str:
    today = datetime.now(WIB).strftime("%y%m%d")
    prefix = f"HRG-{today}-"
    count = await db.trips.count_documents({"trip_number": {"$regex": f"^{prefix}"}})
    return f"{prefix}{count + 1:03d}"


async def enrich_trip(t: dict) -> dict:
    t = clean(t)
    if t.get("driver_id"):
        d = await db.users.find_one({"id": t["driver_id"]})
        t["driver_name"] = d.get("full_name") if d else None
    if t.get("vehicle_id"):
        v = await db.vehicles.find_one({"id": t["vehicle_id"]})
        t["vehicle_name"] = v.get("name") if v else None
        t["vehicle_plate"] = v.get("plate") if v else None
    t["total"] = int(t.get("price", 0)) - int(t.get("discount", 0)) + int(t.get("additional_charges", 0))
    return t


@api.get("/trips")
async def list_trips(status_f: Optional[str] = Query(default=None, alias="status"),
                     user: dict = Depends(require("OWNER", "ADMIN"))):
    q = {}
    if status_f:
        q["status"] = status_f
    rows = await db.trips.find(q).sort("created_at", -1).to_list(1000)
    return [await enrich_trip(t) for t in rows]


@api.post("/trips")
async def create_trip(body: TripIn, user: dict = Depends(require("OWNER", "ADMIN"))):
    doc = body.model_dump()
    doc["id"] = new_id()
    doc["trip_number"] = await gen_trip_number()
    doc["status"] = "ASSIGNED" if body.driver_id else "UNASSIGNED"
    doc["created_by"] = user["id"]
    doc["created_by_name"] = user["full_name"]
    doc["created_by_role"] = user["role"]
    doc["created_at"] = now_utc()
    doc["timeline"] = [{"at": iso(now_utc()), "event": "Trip created", "by": user["full_name"]}]
    if body.passenger_whatsapp:
        doc["passenger_whatsapp"] = normalize_phone(body.passenger_whatsapp)
    await db.trips.insert_one(doc)
    if body.vehicle_id:
        await db.vehicles.update_one({"id": body.vehicle_id}, {"$set": {"status": "ON_TRIP"}})
    await audit(user, "Created trip", entity="trip", entity_id=doc["id"], trip_number=doc["trip_number"],
                customer=body.customer_name, new_value=f"{body.pickup_address} → {body.destination_address}")
    return await enrich_trip(doc)


@api.get("/trips/{tid}")
async def get_trip(tid: str, user: dict = Depends(current_user)):
    t = await db.trips.find_one({"id": tid})
    if not t:
        raise HTTPException(status_code=404, detail="Trip not found")
    if user["role"] == "DRIVER" and t.get("driver_id") != user["id"]:
        raise HTTPException(status_code=403, detail="You can only view your own assigned trips")
    return await enrich_trip(t)


@api.patch("/trips/{tid}")
async def update_trip(tid: str, body: TripUpdateIn, user: dict = Depends(require("OWNER", "ADMIN"))):
    t = await db.trips.find_one({"id": tid})
    if not t:
        raise HTTPException(status_code=404, detail="Trip not found")
    updates = {k: v for k, v in body.model_dump(exclude={"reason"}).items() if v is not None}
    # Owner override logging for Admin-created work
    created_by_admin = t.get("created_by_role") == "ADMIN"
    for field in ("price", "discount", "driver_id", "vehicle_id", "pickup_address", "destination_address",
                  "customer_name", "passenger_name", "pickup_time", "status"):
        if field in updates and updates[field] != t.get(field):
            if user["role"] == "OWNER" and created_by_admin:
                await audit(user, f"Modified trip {field}", category="FINANCIAL" if field in ("price", "discount") else "OPERATION",
                            entity="trip", entity_id=tid, trip_number=t.get("trip_number"),
                            customer=t.get("customer_name"), old_value=t.get(field), new_value=updates[field],
                            reason=body.reason)
    if "passenger_whatsapp" in updates:
        updates["passenger_whatsapp"] = normalize_phone(updates["passenger_whatsapp"])
    if updates.get("driver_id") and t.get("status") in ("UNASSIGNED", None):
        updates["status"] = "ASSIGNED"
    await db.trips.update_one({"id": tid}, {"$set": updates})
    t = await db.trips.find_one({"id": tid})
    return await enrich_trip(t)


@api.post("/trips/{tid}/assign")
async def assign_trip(tid: str, body: AssignIn, user: dict = Depends(require("OWNER", "ADMIN"))):
    t = await db.trips.find_one({"id": tid})
    if not t:
        raise HTTPException(status_code=404, detail="Trip not found")
    updates = {}
    if body.driver_id:
        updates["driver_id"] = body.driver_id
        updates["status"] = "ASSIGNED"
    if body.vehicle_id:
        updates["vehicle_id"] = body.vehicle_id
        await db.vehicles.update_one({"id": body.vehicle_id}, {"$set": {"status": "ON_TRIP"}})
    await db.trips.update_one({"id": tid}, {"$set": updates})
    await audit(user, "Assigned driver/vehicle", entity="trip", entity_id=tid, trip_number=t.get("trip_number"),
                customer=t.get("customer_name"))
    t = await db.trips.find_one({"id": tid})
    return await enrich_trip(t)


@api.post("/trips/{tid}/cancel")
async def cancel_trip(tid: str, body: TripStatusIn, user: dict = Depends(require("OWNER", "ADMIN"))):
    t = await db.trips.find_one({"id": tid})
    if not t:
        raise HTTPException(status_code=404, detail="Trip not found")
    await db.trips.update_one({"id": tid}, {"$set": {"status": "CANCELLED"}})
    if t.get("vehicle_id"):
        await db.vehicles.update_one({"id": t["vehicle_id"]}, {"$set": {"status": "AVAILABLE"}})
    await audit(user, "Cancelled trip", entity="trip", entity_id=tid, trip_number=t.get("trip_number"),
                customer=t.get("customer_name"), reason=body.reason)
    t = await db.trips.find_one({"id": tid})
    return await enrich_trip(t)


DRIVER_STATUS_FLOW = ["ACCEPTED", "ON_THE_WAY", "ARRIVED", "IN_PROGRESS", "COMPLETED"]


async def _set_trip_status(t: dict, new_status: str, actor: dict):
    timeline = t.get("timeline", [])
    timeline.append({"at": iso(now_utc()), "event": new_status, "by": actor["full_name"]})
    await db.trips.update_one({"id": t["id"]}, {"$set": {"status": new_status, "timeline": timeline}})
    if new_status in ("COMPLETED", "CANCELLED") and t.get("vehicle_id"):
        await db.vehicles.update_one({"id": t["vehicle_id"]}, {"$set": {"status": "AVAILABLE"}})


@api.post("/trips/{tid}/status")
async def change_trip_status(tid: str, body: TripStatusIn, user: dict = Depends(current_user)):
    t = await db.trips.find_one({"id": tid})
    if not t:
        raise HTTPException(status_code=404, detail="Trip not found")
    if user["role"] == "DRIVER" and t.get("driver_id") != user["id"]:
        raise HTTPException(status_code=403, detail="You can only update your own trips")
    await _set_trip_status(t, body.status, user)
    await audit(user, f"Trip status → {body.status}", entity="trip", entity_id=tid,
                trip_number=t.get("trip_number"), customer=t.get("customer_name"))
    t = await db.trips.find_one({"id": tid})
    return await enrich_trip(t)


# ---- DRIVER ENDPOINTS ----
@api.get("/driver/trips")
async def driver_trips(driver: dict = Depends(require("DRIVER"))):
    rows = await db.trips.find({"driver_id": driver["id"]}).sort("pickup_time", 1).to_list(1000)
    return [await enrich_trip(t) for t in rows]


@api.post("/driver/trips/{tid}/accept")
async def driver_accept(tid: str, driver: dict = Depends(require("DRIVER"))):
    t = await db.trips.find_one({"id": tid})
    if not t or t.get("driver_id") != driver["id"]:
        raise HTTPException(status_code=403, detail="Not your trip")
    await _set_trip_status(t, "ACCEPTED", driver)
    await audit(driver, "Accepted trip", entity="trip", entity_id=tid, trip_number=t.get("trip_number"))
    t = await db.trips.find_one({"id": tid})
    return await enrich_trip(t)


@api.post("/driver/trips/{tid}/decline")
async def driver_decline(tid: str, body: DeclineIn, driver: dict = Depends(require("DRIVER"))):
    t = await db.trips.find_one({"id": tid})
    if not t or t.get("driver_id") != driver["id"]:
        raise HTTPException(status_code=403, detail="Not your trip")
    await db.trips.update_one({"id": tid}, {"$set": {"status": "UNASSIGNED", "driver_id": None}})
    await audit(driver, "Declined trip", entity="trip", entity_id=tid, trip_number=t.get("trip_number"),
                reason=body.reason)
    t = await db.trips.find_one({"id": tid})
    return await enrich_trip(t)


@api.post("/driver/trips/{tid}/contact-log")
async def driver_contact_log(tid: str, body: ContactLogIn, driver: dict = Depends(require("DRIVER"))):
    t = await db.trips.find_one({"id": tid})
    if not t or t.get("driver_id") != driver["id"]:
        raise HTTPException(status_code=403, detail="Not your trip")
    timeline = t.get("timeline", [])
    timeline.append({"at": iso(now_utc()), "event": body.action, "by": driver["full_name"]})
    await db.trips.update_one({"id": tid}, {"$set": {"timeline": timeline}})
    await audit(driver, body.action, category="CONTACT", entity="trip", entity_id=tid,
                trip_number=t.get("trip_number"), customer=t.get("customer_name"))
    return {"ok": True}


def render_template(content: str, mapping: dict) -> str:
    out = content
    for k, v in mapping.items():
        out = out.replace(f"[{k}]", str(v if v is not None else ""))
    return out


@api.get("/driver/trips/{tid}/whatsapp")
async def driver_whatsapp(tid: str, template: str = "default", driver: dict = Depends(require("DRIVER"))):
    t = await db.trips.find_one({"id": tid})
    if not t or t.get("driver_id") != driver["id"]:
        raise HTTPException(status_code=403, detail="Not your trip")
    vehicle_name = ""
    if t.get("vehicle_id"):
        v = await db.vehicles.find_one({"id": t["vehicle_id"]})
        vehicle_name = v.get("name") if v else ""
    g = greeting_now()
    name = driver["full_name"]
    templates = {
        "default": f"Halo kak, selamat {g}, saya {name} dengan {vehicle_name} yang akan menjemput kakak. Saya izin meluncur kak.",
        "on_the_way": f"Halo kak, saya {name} dengan {vehicle_name}. Saya sudah meluncur menuju lokasi penjemputan kakak.",
        "arrived": f"Halo kak, saya sudah sampai di titik penjemputan ya kak. Saya dengan {vehicle_name}.",
        "waiting": f"Halo kak, saya masih menunggu di titik penjemputan ya kak. Saya dengan {vehicle_name}.",
        "completed": "Terima kasih kak, sudah menggunakan HR-Go. Semoga perjalanan kakak lancar.",
    }
    msg = templates.get(template, templates["default"])
    phone = wa_digits(t.get("passenger_whatsapp") or t.get("passenger_phone"))
    return {"message": msg, "phone": phone, "templates": {k: templates[k] for k in templates}}


# ---- WHATSAPP TEMPLATES ----
@api.get("/whatsapp-templates")
async def list_templates(user: dict = Depends(require("OWNER", "ADMIN"))):
    rows = await db.whatsapp_templates.find({}).sort("created_at", -1).to_list(200)
    return [clean(r) for r in rows]


@api.post("/whatsapp-templates")
async def create_template(body: TemplateIn, owner: dict = Depends(require("OWNER"))):
    doc = body.model_dump()
    doc["id"] = new_id()
    doc["variables"] = re.findall(r"\[([^\]]+)\]", body.content)
    doc["version"] = 1
    doc["created_by"] = owner["full_name"]
    doc["updated_by"] = owner["full_name"]
    doc["created_at"] = now_utc()
    doc["updated_at"] = now_utc()
    await db.whatsapp_templates.insert_one(doc)
    await audit(owner, "Created WhatsApp template", category="OPERATION", entity="template", entity_id=doc["id"])
    return clean(doc)


@api.patch("/whatsapp-templates/{tid}")
async def update_template(tid: str, body: TemplateUpdateIn, user: dict = Depends(require("OWNER", "ADMIN"))):
    tpl = await db.whatsapp_templates.find_one({"id": tid})
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")
    if user["role"] == "ADMIN":
        s = await db.settings.find_one({"id": "company"})
        if not (s and s.get("admin_can_edit_templates")):
            raise HTTPException(status_code=403, detail="Admin is not permitted to edit templates")
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if "content" in updates:
        updates["variables"] = re.findall(r"\[([^\]]+)\]", updates["content"])
    updates["version"] = tpl.get("version", 1) + 1
    updates["updated_by"] = user["full_name"]
    updates["updated_at"] = now_utc()
    await db.whatsapp_templates.update_one({"id": tid}, {"$set": updates})
    await audit(user, "Updated WhatsApp template", category="OPERATION", entity="template", entity_id=tid)
    tpl = await db.whatsapp_templates.find_one({"id": tid})
    return clean(tpl)


# ---- INVOICES ----
async def gen_invoice_number() -> str:
    year = datetime.now(WIB).year
    count = await db.invoices.count_documents({})
    return f"INV-{year}-{count + 1:04d}"


async def _build_invoice(customer: dict, trips: list, kind: str, period_label: Optional[str],
                         due_date: Optional[str], actor: dict):
    line_items = []
    subtotal = 0
    for t in trips:
        amt = int(t.get("price", 0)) - int(t.get("discount", 0)) + int(t.get("additional_charges", 0))
        subtotal += amt
        line_items.append({
            "trip_id": t["id"],
            "trip_number": t.get("trip_number"),
            "date": t.get("pickup_time"),
            "description": f"{t.get('pickup_address','')} → {t.get('destination_address','')}",
            "passenger": t.get("passenger_name"),
            "amount": amt,
        })
    doc = {
        "id": new_id(),
        "invoice_number": await gen_invoice_number(),
        "kind": kind,  # DAILY | MONTHLY
        "customer_id": customer["id"],
        "customer_name": customer["name"],
        "customer_company": customer.get("company"),
        "customer_whatsapp": customer.get("whatsapp"),
        "period_label": period_label,
        "line_items": line_items,
        "trip_count": len(line_items),
        "subtotal": subtotal,
        "discount": 0,
        "additional_charges": 0,
        "total": subtotal,
        "payment_status": "UNPAID",
        "due_date": due_date,
        "created_by": actor["full_name"],
        "created_by_role": actor["role"],
        "created_at": now_utc(),
        "send_history": [],
    }
    await db.invoices.insert_one(doc)
    await audit(actor, f"Generated {kind.lower()} invoice", category="FINANCIAL", entity="invoice",
                entity_id=doc["id"], customer=customer["name"], new_value=doc["invoice_number"])
    return doc


@api.get("/invoices")
async def list_invoices(user: dict = Depends(require("OWNER", "ADMIN"))):
    rows = await db.invoices.find({}).sort("created_at", -1).to_list(1000)
    return [clean(r) for r in rows]


@api.post("/invoices/daily")
async def create_daily_invoice(body: InvoiceDailyIn, user: dict = Depends(require("OWNER", "ADMIN"))):
    customer = await db.customers.find_one({"id": body.customer_id})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    trips = await db.trips.find({"id": {"$in": body.trip_ids}}).to_list(500)
    if not trips:
        raise HTTPException(status_code=400, detail="No trips selected")
    doc = await _build_invoice(customer, trips, "DAILY", "Daily", body.due_date, user)
    return clean(doc)


@api.post("/invoices/monthly")
async def create_monthly_invoice(body: InvoiceMonthlyIn, user: dict = Depends(require("OWNER", "ADMIN"))):
    customer = await db.customers.find_one({"id": body.customer_id})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    all_trips = await db.trips.find({"customer_id": body.customer_id,
                                     "status": {"$in": ["COMPLETED", "IN_PROGRESS", "ARRIVED", "ON_THE_WAY", "ACCEPTED", "ASSIGNED"]}}).to_list(2000)
    trips = []
    for t in all_trips:
        pt = t.get("pickup_time")
        if not pt:
            continue
        try:
            d = datetime.fromisoformat(pt.replace("Z", "+00:00")).date()
            if date.fromisoformat(body.period_start) <= d <= date.fromisoformat(body.period_end):
                trips.append(t)
        except Exception:
            continue
    if not trips:
        raise HTTPException(status_code=400, detail="No trips found in this period for the customer")
    label = body.period_label or f"{body.period_start} – {body.period_end}"
    doc = await _build_invoice(customer, trips, "MONTHLY", label, body.due_date, user)
    return clean(doc)


@api.get("/invoices/{iid}")
async def get_invoice(iid: str, user: dict = Depends(require("OWNER", "ADMIN"))):
    inv = await db.invoices.find_one({"id": iid})
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return clean(inv)


@api.patch("/invoices/{iid}")
async def update_invoice(iid: str, body: InvoiceUpdateIn, user: dict = Depends(require("OWNER", "ADMIN"))):
    inv = await db.invoices.find_one({"id": iid})
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    updates = {k: v for k, v in body.model_dump(exclude={"reason"}).items() if v is not None}
    if "discount" in updates or "additional_charges" in updates:
        disc = updates.get("discount", inv.get("discount", 0))
        add = updates.get("additional_charges", inv.get("additional_charges", 0))
        updates["total"] = inv["subtotal"] - int(disc) + int(add)
        await audit(user, "Modified invoice amount", category="FINANCIAL", entity="invoice", entity_id=iid,
                    customer=inv.get("customer_name"), old_value=inv.get("total"), new_value=updates["total"],
                    reason=body.reason)
    if "payment_status" in updates:
        await audit(user, f"Payment status → {updates['payment_status']}", category="FINANCIAL",
                    entity="invoice", entity_id=iid, customer=inv.get("customer_name"),
                    old_value=inv.get("payment_status"), new_value=updates["payment_status"])
    await db.invoices.update_one({"id": iid}, {"$set": updates})
    inv = await db.invoices.find_one({"id": iid})
    return clean(inv)


@api.post("/invoices/{iid}/whatsapp")
async def invoice_whatsapp(iid: str, body: WhatsAppSendIn, user: dict = Depends(require("OWNER", "ADMIN"))):
    inv = await db.invoices.find_one({"id": iid})
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    tpl = None
    if body.template_id:
        tpl = await db.whatsapp_templates.find_one({"id": body.template_id})
    if not tpl:
        tpl = await db.whatsapp_templates.find_one({"category": "INVOICE", "active": True})
    settings = await db.settings.find_one({"id": "company"}) or {}
    mapping = {
        "Customer Name": inv["customer_name"],
        "Invoice Number": inv["invoice_number"],
        "Invoice Date": datetime.now(WIB).strftime("%d %b %Y"),
        "Invoice Period": inv.get("period_label") or "-",
        "Trip Date": inv.get("period_label") or "-",
        "Total Amount": rupiah(inv["total"]),
        "Due Date": inv.get("due_date") or "-",
        "Company Name": settings.get("company_name", "PT Harmoni Rute Indonesia"),
        "Trip Count": inv.get("trip_count", 0),
        "Payment Status": inv.get("payment_status", "UNPAID"),
        "Admin Name": user["full_name"],
        "HR-Go": "HR-Go",
        "Pickup Location": "-",
        "Destination": "-",
        "Driver Name": "-",
    }
    content = tpl["content"] if tpl else (
        "Halo Kak [Customer Name],\nberikut kami kirimkan invoice HR-Go.\n\n"
        "Invoice: [Invoice Number]\nTotal: [Total Amount]\nPeriode: [Invoice Period]\n\n"
        "Mohon dapat diperiksa ya Kak.\nTerima kasih sudah menggunakan HR-Go — The Better Way to Go 🙏"
    )
    message = render_template(content, mapping)
    phone = wa_digits(inv.get("customer_whatsapp"))
    entry = {
        "sent_by": user["full_name"],
        "role": user["role"],
        "at": iso(now_utc()),
        "whatsapp": inv.get("customer_whatsapp"),
        "template_version": tpl.get("version") if tpl else None,
        "method": "WhatsApp Deep Link",
        "status": "Opened WhatsApp",
    }
    await db.invoices.update_one({"id": iid}, {"$push": {"send_history": entry}})
    await audit(user, "Sent invoice via WhatsApp", category="FINANCIAL", entity="invoice", entity_id=iid,
                customer=inv.get("customer_name"), new_value=inv.get("invoice_number"))
    return {"phone": phone, "message": message}


@api.get("/invoices/{iid}/pdf")
async def invoice_pdf(iid: str, token: Optional[str] = None, authorization: Optional[str] = Header(default=None)):
    auth = authorization or (f"Bearer {token}" if token else None)
    user = await current_user(auth)
    if user["role"] not in ("OWNER", "ADMIN"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    inv = await db.invoices.find_one({"id": iid})
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    settings = await db.settings.find_one({"id": "company"}) or {}
    pdf_bytes = _render_invoice_pdf(inv, settings)
    import io
    return StreamingResponse(io.BytesIO(pdf_bytes), media_type="application/pdf",
                             headers={"Content-Disposition": f"inline; filename={inv['invoice_number']}.pdf"})


def _render_invoice_pdf(inv: dict, settings: dict) -> bytes:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.pdfgen import canvas
    import io

    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    w, h = A4
    navy = (6 / 255, 27 / 255, 58 / 255)
    y = h - 25 * mm
    c.setFillColorRGB(*navy)
    c.rect(0, h - 35 * mm, w, 35 * mm, fill=1, stroke=0)
    c.setFillColorRGB(1, 1, 1)
    c.setFont("Helvetica-Bold", 20)
    c.drawString(20 * mm, h - 20 * mm, "HR-Go")
    c.setFont("Helvetica", 9)
    c.drawString(20 * mm, h - 26 * mm, "Crew Transportation & Shuttle Service")
    c.drawRightString(w - 20 * mm, h - 18 * mm, settings.get("company_name", "PT Harmoni Rute Indonesia"))
    c.drawRightString(w - 20 * mm, h - 24 * mm, "The Better Way to Go")

    c.setFillColorRGB(*navy)
    c.setFont("Helvetica-Bold", 14)
    y = h - 48 * mm
    c.drawString(20 * mm, y, f"INVOICE {inv['invoice_number']}")
    c.setFont("Helvetica", 10)
    c.setFillColorRGB(0, 0, 0)
    y -= 8 * mm
    c.drawString(20 * mm, y, f"Bill To: {inv['customer_name']}")
    y -= 6 * mm
    if inv.get("customer_company"):
        c.drawString(20 * mm, y, inv["customer_company"])
        y -= 6 * mm
    c.drawString(20 * mm, y, f"Period: {inv.get('period_label','-')}    Due: {inv.get('due_date','-')}")
    y -= 10 * mm

    c.setFont("Helvetica-Bold", 9)
    c.drawString(20 * mm, y, "Trip")
    c.drawString(70 * mm, y, "Description")
    c.drawRightString(w - 20 * mm, y, "Amount")
    y -= 2 * mm
    c.line(20 * mm, y, w - 20 * mm, y)
    y -= 6 * mm
    c.setFont("Helvetica", 8)
    for li in inv.get("line_items", []):
        c.drawString(20 * mm, y, str(li.get("trip_number", "")))
        desc = (li.get("description") or "")[:55]
        c.drawString(70 * mm, y, desc)
        c.drawRightString(w - 20 * mm, y, rupiah(li.get("amount", 0)))
        y -= 6 * mm
        if y < 30 * mm:
            c.showPage()
            y = h - 30 * mm
    y -= 4 * mm
    c.line(20 * mm, y, w - 20 * mm, y)
    y -= 8 * mm
    c.setFont("Helvetica-Bold", 12)
    c.drawRightString(w - 20 * mm, y, f"TOTAL: {rupiah(inv.get('total', 0))}")
    y -= 10 * mm
    c.setFont("Helvetica", 9)
    c.drawString(20 * mm, y, f"Payment Status: {inv.get('payment_status','UNPAID')}")
    if settings.get("bank_account"):
        y -= 6 * mm
        c.drawString(20 * mm, y, f"Bank: {settings.get('bank_account')}")
    c.showPage()
    c.save()
    return buf.getvalue()


# ---- AUDIT LOGS ----
@api.get("/audit-logs")
async def audit_logs(category: Optional[str] = None, user: dict = Depends(require("OWNER", "ADMIN"))):
    q = {}
    if user["role"] == "ADMIN":
        # Admin does not see security / user-management sensitive events
        q["category"] = {"$in": ["OPERATION", "FINANCIAL", "CONTACT"]}
        q["sensitive"] = {"$ne": True}
    if category:
        if isinstance(q.get("category"), dict):
            pass
        else:
            q["category"] = category
    rows = await db.audit_logs.find(q).sort("created_at", -1).to_list(500)
    return [clean(r) for r in rows]


# ---- SETTINGS ----
@api.get("/settings")
async def get_settings(user: dict = Depends(require("OWNER", "ADMIN"))):
    s = await db.settings.find_one({"id": "company"})
    return clean(s) if s else {}


@api.patch("/settings")
async def update_settings(body: SettingsIn, owner: dict = Depends(require("OWNER"))):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    await db.settings.update_one({"id": "company"}, {"$set": updates}, upsert=True)
    await audit(owner, "Updated system settings", category="SECURITY", entity="settings", entity_id="company")
    s = await db.settings.find_one({"id": "company"})
    return clean(s)


# ----------------------------------------------------------------------------
# Seed
# ----------------------------------------------------------------------------
async def seed():
    # Indexes
    await db.users.create_index("id", unique=True)
    await db.users.create_index("username", sparse=True)

    # Owner (idempotent)
    owner = await db.users.find_one({"role": "OWNER"})
    owner_username = norm(os.environ.get("BOOTSTRAP_OWNER_USERNAME", "mhafidhal"))
    owner_password = os.environ.get("BOOTSTRAP_OWNER_PASSWORD", "rahasia001")
    if not owner:
        owner = {
            "id": new_id(),
            "full_name": "Hafidh Al Ayyubi",
            "phone": "+628111000001",
            "phone_norm": "+628111000001",
            "email": "owner@hrgo.id",
            "username": owner_username,
            "password_hash": hash_password(owner_password),
            "role": "OWNER",
            "status": "ACTIVE",
            "employee_id": "OWN-001",
            "last_login": None,
            "created_at": now_utc(),
            "deleted_at": None,
        }
        await db.users.insert_one(owner)
        logger.info("Seeded OWNER account: %s", owner_username)

    # Settings
    if not await db.settings.find_one({"id": "company"}):
        await db.settings.insert_one({
            "id": "company",
            "company_name": "PT Harmoni Rute Indonesia",
            "brand": "HR-Go",
            "business_name": "HR-Go Crew Transportation & Shuttle Service",
            "tagline": "The Better Way to Go",
            "address": "Jl. Boulevard Raya No. 1, Jakarta",
            "phone": "+6221500800",
            "email": "ops@hrgo.id",
            "website": "www.hrgo.id",
            "tax_info": "NPWP 01.234.567.8-000.000",
            "bank_account": "BCA 1234567890 a.n. PT Harmoni Rute Indonesia",
            "admin_can_edit_templates": True,
            "google_maps_prefer": "google",
        })

    # Whatsapp invoice template
    if not await db.whatsapp_templates.find_one({"category": "INVOICE"}):
        content = ("Halo Kak [Customer Name],\n"
                   "berikut kami kirimkan invoice HR-Go untuk perjalanan [Invoice Period].\n\n"
                   "Invoice: [Invoice Number]\n"
                   "Total: [Total Amount]\n"
                   "Periode: [Invoice Period]\n\n"
                   "Mohon dapat diperiksa ya Kak.\n"
                   "Terima kasih sudah menggunakan HR-Go — The Better Way to Go 🙏")
        await db.whatsapp_templates.insert_one({
            "id": new_id(),
            "template_name": "Default Invoice",
            "category": "INVOICE",
            "content": content,
            "variables": re.findall(r"\[([^\]]+)\]", content),
            "active": True,
            "version": 1,
            "created_by": "System",
            "updated_by": "System",
            "created_at": now_utc(),
            "updated_at": now_utc(),
        })

    # Demo data only once
    if await db.users.count_documents({"role": {"$in": ["ADMIN", "DRIVER"]}}) > 0:
        return

    admin = {
        "id": new_id(), "full_name": "Andi Pratama", "phone": "+628112223334",
        "phone_norm": "+628112223334", "email": "andi@hrgo.id", "username": "andi",
        "password_hash": hash_password("admin123"), "role": "ADMIN", "status": "ACTIVE",
        "employee_id": "ADM-001", "last_login": None, "created_at": now_utc(), "deleted_at": None,
    }
    await db.users.insert_one(admin)

    vehicles = []
    for name, plate, vtype, cap, st in [
        ("Toyota Innova Zenix", "B 1234 HRG", "MPV", 6, "AVAILABLE"),
        ("Toyota Alphard", "B 5678 HRG", "Luxury Van", 6, "AVAILABLE"),
        ("Mercedes Sprinter", "B 9012 HRG", "Executive Van", 12, "MAINTENANCE"),
        ("Hyundai Staria", "B 3456 HRG", "Premium Van", 9, "AVAILABLE"),
    ]:
        v = {"id": new_id(), "name": name, "plate": plate, "type": vtype, "capacity": cap,
             "status": st, "created_at": now_utc()}
        vehicles.append(v)
    await db.vehicles.insert_many(vehicles)

    drivers = []
    for fn, un, phone, did, lic in [
        ("Budi Santoso", "budi", "+628131112221", "DRV-001", "SIM-A-99812"),
        ("Dedi Kurniawan", "dedi", "+628132223332", "DRV-002", "SIM-A-77421"),
        ("Eko Wijaya", "eko", "+628133334443", "DRV-003", "SIM-A-55120"),
    ]:
        d = {"id": new_id(), "full_name": fn, "phone": phone, "phone_norm": phone,
             "email": f"{un}@hrgo.id", "username": un, "password_hash": hash_password("driver123"),
             "role": "DRIVER", "status": "ACTIVE", "driver_id": did, "license_number": lic,
             "license_expiry": "2028-05-01", "emergency_contact": "+628130000000",
             "assigned_vehicle_id": vehicles[0]["id"] if un == "budi" else None,
             "last_login": None, "created_at": now_utc(), "deleted_at": None}
        drivers.append(d)
    await db.users.insert_many(drivers)

    customers = []
    for nm, comp, phone, ctype in [
        ("Hafidh Al Ayyubi", "PT Garuda Mitra", "+628170001111", "MONTHLY_CONTRACT"),
        ("Siti Rahma", "PT Angkasa Jaya", "+628170002222", "MONTHLY_CONTRACT"),
        ("Rudi Hartono", "Walk-in", "+628170003333", "ONE_TIME"),
    ]:
        c = {"id": new_id(), "name": nm, "company": comp, "phone": phone,
             "whatsapp": normalize_phone(phone), "email": f"{nm.split()[0].lower()}@mail.com",
             "billing_contact": "Finance Dept", "billing_email": "finance@" + comp.split()[0].lower() + ".com",
             "address": "Jakarta", "contract_type": ctype, "status": "ACTIVE",
             "created_at": now_utc(), "deleted_at": None}
        customers.append(c)
    await db.customers.insert_many(customers)

    now = datetime.now(WIB)
    trips = []
    plan = [
        (customers[0], drivers[0], vehicles[0], "COMPLETED", -2, "Soekarno-Hatta Intl Airport Terminal 3", "Alam Sutera, Tangerang", 450000),
        (customers[0], drivers[0], vehicles[0], "ON_THE_WAY", 1, "Soekarno-Hatta Intl Airport Terminal 2", "Senayan, Jakarta", 400000),
        (customers[1], drivers[1], vehicles[1], "ASSIGNED", 3, "Halim Perdanakusuma Airport", "BSD City, Tangerang", 350000),
        (customers[2], None, None, "UNASSIGNED", 5, "Kemayoran", "Bekasi", 300000),
        (customers[1], drivers[2], vehicles[3], "COMPLETED", -5, "Hotel Mulia Senayan", "Soekarno-Hatta Terminal 3", 420000),
    ]
    for idx, (cust, drv, veh, st, hours, pu, dest, price) in enumerate(plan):
        pickup_dt = now + timedelta(hours=hours)
        t = {
            "id": new_id(),
            "trip_number": f"HRG-{pickup_dt.strftime('%y%m%d')}-{idx + 1:03d}",
            "customer_id": cust["id"], "customer_name": cust["name"],
            "passenger_name": cust["name"], "passenger_phone": cust["phone"],
            "passenger_whatsapp": cust["whatsapp"],
            "pickup_address": pu, "pickup_meeting_point": "Arrival Hall Gate 5",
            "destination_address": dest, "additional_stop": None,
            "pickup_time": pickup_dt.astimezone(timezone.utc).isoformat(),
            "flight_number": "GA" + str(100 + idx), "terminal": "Terminal 3",
            "special_instructions": "VIP crew — assist with luggage",
            "driver_id": drv["id"] if drv else None,
            "vehicle_id": veh["id"] if veh else None,
            "price": price, "discount": 0, "additional_charges": 0,
            "status": st,
            "created_by": admin["id"], "created_by_name": admin["full_name"], "created_by_role": "ADMIN",
            "created_at": now_utc(),
            "timeline": [{"at": iso(now_utc()), "event": "Trip created", "by": admin["full_name"]}],
        }
        trips.append(t)
    await db.trips.insert_many(trips)
    logger.info("Seeded demo data: admins, drivers, customers, vehicles, trips")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await seed()
    yield
    client.close()


app = FastAPI(title="HR-Go API", lifespan=lifespan)
app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
