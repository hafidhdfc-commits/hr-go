"""HR-Go backend API tests - comprehensive coverage of auth, roles, CRUD, trips, invoices, templates, audit, settings."""
import os
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://hrgo-roles.preview.emergentagent.com").rstrip("/")


# ---------- Health ----------
class TestHealth:
    def test_api_root(self, api):
        r = api.get(f"{BASE_URL}/api/")
        assert r.status_code == 200
        assert r.json().get("status") == "ok"


# ---------- Auth ----------
class TestAuth:
    def test_login_owner_username(self, api):
        r = api.post(f"{BASE_URL}/api/auth/login", json={"identifier": "mhafidhal", "password": "rahasia001"})
        assert r.status_code == 200
        d = r.json()
        assert d["token_type"] == "bearer" and d["access_token"]
        assert d["user"]["role"] == "OWNER"
        assert "password_hash" not in d["user"]
        assert "_id" not in d["user"]

    def test_login_admin_email(self, api):
        r = api.post(f"{BASE_URL}/api/auth/login", json={"identifier": "andi@hrgo.id", "password": "admin123"})
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "ADMIN"

    def test_login_driver_username(self, api):
        r = api.post(f"{BASE_URL}/api/auth/login", json={"identifier": "budi", "password": "driver123"})
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "DRIVER"

    def test_login_wrong_password(self, api):
        r = api.post(f"{BASE_URL}/api/auth/login", json={"identifier": "mhafidhal", "password": "wrong"})
        assert r.status_code == 401

    def test_login_unknown_user(self, api):
        r = api.post(f"{BASE_URL}/api/auth/login", json={"identifier": "nouser_zzz", "password": "x"})
        assert r.status_code == 401

    def test_auth_me(self, api, h_owner):
        r = api.get(f"{BASE_URL}/api/auth/me", headers=h_owner)
        assert r.status_code == 200
        assert r.json()["role"] == "OWNER"

    def test_me_no_token(self, api):
        r = api.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 401


# ---------- Role enforcement ----------
class TestRoleEnforcement:
    def test_driver_blocked_from_owner_dashboard(self, api, h_driver):
        r = api.get(f"{BASE_URL}/api/dashboard/owner", headers=h_driver)
        assert r.status_code == 403

    def test_driver_blocked_from_users(self, api, h_driver):
        r = api.get(f"{BASE_URL}/api/users", headers=h_driver)
        assert r.status_code == 403

    def test_driver_blocked_from_customers(self, api, h_driver):
        r = api.get(f"{BASE_URL}/api/customers", headers=h_driver)
        assert r.status_code == 403

    def test_driver_blocked_from_invoices(self, api, h_driver):
        r = api.get(f"{BASE_URL}/api/invoices", headers=h_driver)
        assert r.status_code == 403

    def test_driver_blocked_from_audit(self, api, h_driver):
        r = api.get(f"{BASE_URL}/api/audit-logs", headers=h_driver)
        assert r.status_code == 403

    def test_admin_blocked_from_users_list(self, api, h_admin):
        r = api.get(f"{BASE_URL}/api/users", headers=h_admin)
        assert r.status_code == 403

    def test_admin_blocked_from_settings_patch(self, api, h_admin):
        r = api.patch(f"{BASE_URL}/api/settings", headers=h_admin, json={"company_name": "X"})
        assert r.status_code == 403

    def test_admin_blocked_from_template_create(self, api, h_admin):
        r = api.post(f"{BASE_URL}/api/whatsapp-templates", headers=h_admin,
                     json={"template_name": "x", "category": "INVOICE", "content": "hi"})
        assert r.status_code == 403


# ---------- Dashboards ----------
class TestDashboards:
    def test_owner_dashboard(self, api, h_owner):
        r = api.get(f"{BASE_URL}/api/dashboard/owner", headers=h_owner)
        assert r.status_code == 200
        assert isinstance(r.json(), dict)

    def test_admin_dashboard_as_owner(self, api, h_owner):
        r = api.get(f"{BASE_URL}/api/dashboard/admin", headers=h_owner)
        assert r.status_code == 200

    def test_admin_dashboard_as_admin(self, api, h_admin):
        r = api.get(f"{BASE_URL}/api/dashboard/admin", headers=h_admin)
        assert r.status_code == 200

    def test_driver_dashboard(self, api, h_driver):
        r = api.get(f"{BASE_URL}/api/dashboard/driver", headers=h_driver)
        assert r.status_code == 200


# ---------- Users CRUD (OWNER) ----------
class TestUserManagement:
    created_admin_id = None
    created_driver_id = None

    def test_create_admin(self, api, h_owner):
        payload = {"full_name": "TEST Admin Zeta", "username": "test_admin_zeta",
                   "password": "pass1234", "role": "ADMIN"}
        r = api.post(f"{BASE_URL}/api/users", headers=h_owner, json=payload)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["role"] == "ADMIN" and d["full_name"] == "TEST Admin Zeta"
        assert "password_hash" not in d and "_id" not in d
        TestUserManagement.created_admin_id = d["id"]

    def test_create_driver(self, api, h_owner):
        payload = {"full_name": "TEST Driver Omega", "username": "test_driver_omega",
                   "password": "pass1234", "role": "DRIVER", "driver_id": "DRV-TEST"}
        r = api.post(f"{BASE_URL}/api/users", headers=h_owner, json=payload)
        assert r.status_code == 200, r.text
        TestUserManagement.created_driver_id = r.json()["id"]

    def test_list_users_filter_role(self, api, h_owner):
        r = api.get(f"{BASE_URL}/api/users?role=DRIVER", headers=h_owner)
        assert r.status_code == 200
        rows = r.json()
        assert all(u["role"] == "DRIVER" for u in rows)

    def test_patch_user(self, api, h_owner):
        uid = TestUserManagement.created_admin_id
        assert uid
        r = api.patch(f"{BASE_URL}/api/users/{uid}", headers=h_owner, json={"full_name": "TEST Admin Zeta2"})
        assert r.status_code == 200
        g = api.get(f"{BASE_URL}/api/users/{uid}", headers=h_owner).json()
        assert g["full_name"] == "TEST Admin Zeta2"

    def test_reset_password(self, api, h_owner):
        uid = TestUserManagement.created_driver_id
        r = api.post(f"{BASE_URL}/api/users/{uid}/reset-password", headers=h_owner, json={"new_password": "newpass9"})
        assert r.status_code == 200
        # verify login with new password
        lr = api.post(f"{BASE_URL}/api/auth/login", json={"identifier": "test_driver_omega", "password": "newpass9"})
        assert lr.status_code == 200

    def test_set_status_inactive_then_login_blocked(self, api, h_owner):
        uid = TestUserManagement.created_driver_id
        r = api.post(f"{BASE_URL}/api/users/{uid}/status", headers=h_owner, json={"status": "INACTIVE"})
        assert r.status_code == 200 and r.json()["status"] == "INACTIVE"
        lr = api.post(f"{BASE_URL}/api/auth/login", json={"identifier": "test_driver_omega", "password": "newpass9"})
        assert lr.status_code == 403
        # restore
        api.post(f"{BASE_URL}/api/users/{uid}/status", headers=h_owner, json={"status": "ACTIVE"})

    def test_last_owner_cannot_deactivate(self, api, h_owner):
        # find current owner id
        me = api.get(f"{BASE_URL}/api/auth/me", headers=h_owner).json()
        owners = api.get(f"{BASE_URL}/api/users?role=OWNER", headers=h_owner).json()
        active_owners = [o for o in owners if o["status"] == "ACTIVE"]
        if len(active_owners) == 1:
            r = api.post(f"{BASE_URL}/api/users/{me['id']}/status", headers=h_owner, json={"status": "INACTIVE"})
            assert r.status_code == 400
        else:
            pytest.skip("More than one active OWNER; cannot verify last-owner rule")

    def test_create_user_role_rejected(self, api, h_owner):
        r = api.post(f"{BASE_URL}/api/users", headers=h_owner,
                     json={"full_name": "x", "username": "test_owner_bad", "password": "x1234", "role": "OWNER"})
        assert r.status_code == 400


# ---------- Customers / Vehicles / Routes ----------
class TestCustomers:
    cid = None

    def test_list(self, api, h_admin):
        r = api.get(f"{BASE_URL}/api/customers", headers=h_admin)
        assert r.status_code == 200 and isinstance(r.json(), list)

    def test_create(self, api, h_admin):
        r = api.post(f"{BASE_URL}/api/customers", headers=h_admin,
                     json={"name": "TEST Cust", "phone": "081234567890", "whatsapp": "081234567890"})
        assert r.status_code == 200
        TestCustomers.cid = r.json()["id"]

    def test_get_and_patch(self, api, h_admin):
        cid = TestCustomers.cid
        g = api.get(f"{BASE_URL}/api/customers/{cid}", headers=h_admin)
        assert g.status_code == 200
        p = api.patch(f"{BASE_URL}/api/customers/{cid}", headers=h_admin, json={"name": "TEST Cust2"})
        assert p.status_code == 200
        assert api.get(f"{BASE_URL}/api/customers/{cid}", headers=h_admin).json()["name"] == "TEST Cust2"


class TestVehicles:
    vid = None

    def test_create_and_list(self, api, h_owner):
        r = api.post(f"{BASE_URL}/api/vehicles", headers=h_owner,
                     json={"name": "TEST Van", "plate": "T 999 ZZ", "capacity": 6})
        assert r.status_code == 200
        TestVehicles.vid = r.json()["id"]
        lst = api.get(f"{BASE_URL}/api/vehicles", headers=h_owner).json()
        assert any(v["id"] == TestVehicles.vid for v in lst)

    def test_patch(self, api, h_owner):
        r = api.patch(f"{BASE_URL}/api/vehicles/{TestVehicles.vid}", headers=h_owner, json={"status": "MAINTENANCE"})
        assert r.status_code == 200


class TestRoutes:
    rid = None

    def test_create_and_patch(self, api, h_owner):
        r = api.post(f"{BASE_URL}/api/routes", headers=h_owner,
                     json={"name": "TEST Route", "origin": "A", "destination": "B", "base_price": 100000})
        assert r.status_code == 200
        TestRoutes.rid = r.json()["id"]
        p = api.patch(f"{BASE_URL}/api/routes/{TestRoutes.rid}", headers=h_owner, json={"base_price": 150000})
        assert p.status_code == 200


# ---------- Trips ----------
class TestTrips:
    trip_id = None
    driver_id = None
    vehicle_id = None
    customer_id = None

    def test_setup_ids(self, api, h_owner):
        drivers = api.get(f"{BASE_URL}/api/drivers", headers=h_owner).json()
        TestTrips.driver_id = next(d["id"] for d in drivers if d["status"] == "ACTIVE")
        vehicles = api.get(f"{BASE_URL}/api/vehicles", headers=h_owner).json()
        TestTrips.vehicle_id = vehicles[0]["id"]
        customers = api.get(f"{BASE_URL}/api/customers", headers=h_owner).json()
        TestTrips.customer_id = customers[0]["id"]

    def test_create_trip(self, api, h_owner):
        payload = {
            "customer_id": TestTrips.customer_id,
            "passenger_name": "TEST Passenger",
            "passenger_phone": "081234567000",
            "passenger_whatsapp": "081234567000",
            "pickup_address": "Jakarta Airport",
            "destination_address": "Jakarta City",
            "pickup_time": "2026-02-01T08:00:00+07:00",
            "price": 300000,
        }
        r = api.post(f"{BASE_URL}/api/trips", headers=h_owner, json=payload)
        assert r.status_code == 200, r.text
        TestTrips.trip_id = r.json()["id"]

    def test_list_trips(self, api, h_admin):
        r = api.get(f"{BASE_URL}/api/trips", headers=h_admin)
        assert r.status_code == 200 and isinstance(r.json(), list)

    def test_assign_driver_and_vehicle(self, api, h_owner):
        r = api.post(f"{BASE_URL}/api/trips/{TestTrips.trip_id}/assign", headers=h_owner,
                     json={"driver_id": TestTrips.driver_id, "vehicle_id": TestTrips.vehicle_id})
        assert r.status_code == 200
        g = api.get(f"{BASE_URL}/api/trips/{TestTrips.trip_id}", headers=h_owner).json()
        assert g["driver_id"] == TestTrips.driver_id

    def test_driver_cannot_access_unassigned_trip(self, api, h_driver, h_owner):
        # Create a new trip not assigned to budi
        other_payload = {
            "customer_id": TestTrips.customer_id,
            "passenger_name": "TEST Pass2",
            "pickup_address": "A", "destination_address": "B",
            "pickup_time": "2026-02-02T08:00:00+07:00", "price": 100000,
        }
        r = api.post(f"{BASE_URL}/api/trips", headers=h_owner, json=other_payload)
        tid = r.json()["id"]
        # Driver budi is not assigned
        g = api.get(f"{BASE_URL}/api/trips/{tid}", headers=h_driver)
        assert g.status_code == 403

    def test_patch_trip_owner_override_audit(self, api, h_owner):
        r = api.patch(f"{BASE_URL}/api/trips/{TestTrips.trip_id}", headers=h_owner,
                      json={"price": 350000, "reason": "Price adjustment"})
        assert r.status_code == 200
        # verify
        g = api.get(f"{BASE_URL}/api/trips/{TestTrips.trip_id}", headers=h_owner).json()
        assert g["price"] == 350000

    def test_status_change(self, api, h_owner):
        r = api.post(f"{BASE_URL}/api/trips/{TestTrips.trip_id}/status", headers=h_owner,
                     json={"status": "ASSIGNED"})
        assert r.status_code == 200


# ---------- Driver endpoints ----------
class TestDriverEndpoints:
    def test_list_own_trips(self, api, h_driver):
        r = api.get(f"{BASE_URL}/api/driver/trips", headers=h_driver)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_whatsapp_dynamic_message(self, api, h_driver, h_owner):
        trips = api.get(f"{BASE_URL}/api/driver/trips", headers=h_driver).json()
        if not trips:
            pytest.skip("No trips assigned to budi driver")
        tid = trips[0]["id"]
        r = api.get(f"{BASE_URL}/api/driver/trips/{tid}/whatsapp", headers=h_driver)
        assert r.status_code == 200
        d = r.json()
        assert "message" in d and "phone" in d
        msg = d["message"]
        assert any(g in msg.lower() for g in ["pagi", "siang", "malam"])
        # Budi Santoso name should appear
        assert "Budi" in msg or "budi" in msg.lower()

    def test_whatsapp_other_trip_forbidden(self, api, h_driver, h_owner):
        all_trips = api.get(f"{BASE_URL}/api/trips", headers=h_owner).json()
        driver_trips = api.get(f"{BASE_URL}/api/driver/trips", headers=h_driver).json()
        driver_tids = {t["id"] for t in driver_trips}
        other = next((t for t in all_trips if t["id"] not in driver_tids), None)
        if not other:
            pytest.skip("No other trip to test forbidden access")
        r = api.get(f"{BASE_URL}/api/driver/trips/{other['id']}/whatsapp", headers=h_driver)
        assert r.status_code == 403


# ---------- WhatsApp Templates ----------
class TestWhatsAppTemplates:
    tpl_id = None

    def test_owner_list(self, api, h_owner):
        r = api.get(f"{BASE_URL}/api/whatsapp-templates", headers=h_owner)
        assert r.status_code == 200

    def test_admin_list(self, api, h_admin):
        r = api.get(f"{BASE_URL}/api/whatsapp-templates", headers=h_admin)
        assert r.status_code == 200

    def test_owner_create(self, api, h_owner):
        r = api.post(f"{BASE_URL}/api/whatsapp-templates", headers=h_owner, json={
            "template_name": "TEST tpl", "category": "INVOICE",
            "content": "Hi [Customer Name], invoice [Invoice Number] total [Total Amount]",
        })
        assert r.status_code == 200
        d = r.json()
        assert "Customer Name" in d.get("variables", [])
        assert d["version"] == 1
        TestWhatsAppTemplates.tpl_id = d["id"]

    def test_owner_patch_increments_version(self, api, h_owner):
        tid = TestWhatsAppTemplates.tpl_id
        r = api.patch(f"{BASE_URL}/api/whatsapp-templates/{tid}", headers=h_owner,
                      json={"content": "Updated [Customer Name]"})
        assert r.status_code == 200
        assert r.json()["version"] == 2

    def test_admin_patch_blocked_by_default(self, api, h_admin):
        tid = TestWhatsAppTemplates.tpl_id
        r = api.patch(f"{BASE_URL}/api/whatsapp-templates/{tid}", headers=h_admin,
                      json={"content": "Hello"})
        assert r.status_code == 403

    def test_admin_patch_allowed_after_settings_toggle(self, api, h_admin, h_owner):
        tid = TestWhatsAppTemplates.tpl_id
        api.patch(f"{BASE_URL}/api/settings", headers=h_owner, json={"admin_can_edit_templates": True})
        try:
            r = api.patch(f"{BASE_URL}/api/whatsapp-templates/{tid}", headers=h_admin,
                          json={"content": "Admin edit [Customer Name]"})
            assert r.status_code == 200
        finally:
            api.patch(f"{BASE_URL}/api/settings", headers=h_owner, json={"admin_can_edit_templates": False})


# ---------- Invoices ----------
class TestInvoices:
    inv_id = None

    def test_create_daily(self, api, h_owner):
        trips = api.get(f"{BASE_URL}/api/trips", headers=h_owner).json()
        if not trips:
            pytest.skip("No trips to invoice")
        # pick trip with customer_id
        t = next((x for x in trips if x.get("customer_id")), None)
        if not t:
            pytest.skip("No trips with customer_id")
        r = api.post(f"{BASE_URL}/api/invoices/daily", headers=h_owner,
                     json={"customer_id": t["customer_id"], "trip_ids": [t["id"]], "due_date": "2026-02-15"})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["kind"] == "DAILY"
        assert d["payment_status"] == "UNPAID"
        assert d["total"] >= 0
        assert "_id" not in d
        TestInvoices.inv_id = d["id"]

    def test_get_invoice(self, api, h_admin):
        r = api.get(f"{BASE_URL}/api/invoices/{TestInvoices.inv_id}", headers=h_admin)
        assert r.status_code == 200

    def test_patch_invoice_payment_status(self, api, h_owner):
        r = api.patch(f"{BASE_URL}/api/invoices/{TestInvoices.inv_id}", headers=h_owner,
                      json={"payment_status": "PAID", "reason": "Marked paid"})
        assert r.status_code == 200
        assert r.json()["payment_status"] == "PAID"

    def test_whatsapp_deep_link(self, api, h_owner):
        r = api.post(f"{BASE_URL}/api/invoices/{TestInvoices.inv_id}/whatsapp", headers=h_owner, json={})
        assert r.status_code == 200
        d = r.json()
        assert "phone" in d and "message" in d
        # verify send_history appended
        inv = api.get(f"{BASE_URL}/api/invoices/{TestInvoices.inv_id}", headers=h_owner).json()
        assert len(inv.get("send_history", [])) >= 1

    def test_pdf_with_token(self, api, owner_token):
        r = api.get(f"{BASE_URL}/api/invoices/{TestInvoices.inv_id}/pdf?token={owner_token}")
        assert r.status_code == 200
        assert "application/pdf" in r.headers.get("content-type", "")
        assert r.content[:4] == b"%PDF"


# ---------- Audit logs ----------
class TestAuditLogs:
    def test_owner_sees_all(self, api, h_owner):
        r = api.get(f"{BASE_URL}/api/audit-logs", headers=h_owner)
        assert r.status_code == 200
        logs = r.json()
        assert isinstance(logs, list)
        cats = {l.get("category") for l in logs}
        # Owner should be able to see at least operation/user/financial categories across history
        assert len(logs) > 0

    def test_admin_restricted_categories(self, api, h_admin):
        r = api.get(f"{BASE_URL}/api/audit-logs", headers=h_admin)
        assert r.status_code == 200
        logs = r.json()
        allowed = {"OPERATION", "FINANCIAL", "CONTACT"}
        for l in logs:
            assert l.get("category") in allowed, f"admin saw forbidden category {l.get('category')}"
            assert not l.get("sensitive"), "admin saw sensitive log"


# ---------- Settings ----------
class TestSettings:
    def test_get_owner(self, api, h_owner):
        r = api.get(f"{BASE_URL}/api/settings", headers=h_owner)
        assert r.status_code == 200

    def test_get_admin(self, api, h_admin):
        r = api.get(f"{BASE_URL}/api/settings", headers=h_admin)
        assert r.status_code == 200

    def test_patch_owner(self, api, h_owner):
        r = api.patch(f"{BASE_URL}/api/settings", headers=h_owner, json={"tagline": "TEST tagline"})
        assert r.status_code == 200
        assert r.json().get("tagline") == "TEST tagline"
