import os
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://hrgo-roles.preview.emergentagent.com").rstrip("/")


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture(scope="session")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _login(api, ident, pw):
    r = api.post(f"{BASE_URL}/api/auth/login", json={"identifier": ident, "password": pw})
    assert r.status_code == 200, f"login {ident} failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def owner_token(api):
    return _login(api, "mhafidhal", "rahasia001")


@pytest.fixture(scope="session")
def admin_token(api):
    return _login(api, "andi", "admin123")


@pytest.fixture(scope="session")
def driver_token(api):
    return _login(api, "budi", "driver123")


@pytest.fixture
def h_owner(owner_token):
    return {"Authorization": f"Bearer {owner_token}"}


@pytest.fixture
def h_admin(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture
def h_driver(driver_token):
    return {"Authorization": f"Bearer {driver_token}"}
