from tests.conftest import TODAY


def test_create_and_list_habit(client, make_habit):
    h = make_habit(weekdays=[4, 0, 0])
    assert h["weekdays"] == [0, 4]  # normalizado
    assert h["archived"] is False
    assert [x["id"] for x in client.get("/api/habits").json()] == [h["id"]]


def test_create_validation_errors(client):
    assert client.post("/api/habits", json={"name": ""}).status_code == 422
    assert client.post("/api/habits", json={"name": "x", "color": "rojo"}).status_code == 422
    assert client.post("/api/habits", json={"name": "x", "weekdays": [7]}).status_code == 422
    assert client.post("/api/habits", json={"name": "x", "weekdays": []}).status_code == 422
    assert client.post("/api/habits", json={"name": "x", "start_date": "2026-10-16"}).status_code == 422


def test_get_unknown_habit_404(client):
    assert client.get("/api/habits/999").status_code == 404


def test_patch_and_archive(client, make_habit):
    h = make_habit()
    r = client.patch(f"/api/habits/{h['id']}", json={"name": "Leer 20 min", "archived": True})
    assert r.status_code == 200
    body = r.json()
    assert body["name"] == "Leer 20 min"
    assert body["archived"] is True and body["archived_at"] == TODAY.isoformat()
    # Los archivados no salen por defecto...
    assert client.get("/api/habits").json() == []
    # ...pero sí si se piden.
    assert len(client.get("/api/habits", params={"include_archived": True}).json()) == 1
    # Desarchivar
    assert client.patch(f"/api/habits/{h['id']}", json={"archived": False}).json()["archived"] is False


def test_patch_rejects_null_name(client, make_habit):
    h = make_habit()
    assert client.patch(f"/api/habits/{h['id']}", json={"name": None}).status_code == 422


def test_delete_not_allowed(client, make_habit):
    h = make_habit()
    assert client.delete(f"/api/habits/{h['id']}").status_code == 405


def test_log_upsert_is_idempotent(client, make_habit):
    h = make_habit(start_date="2026-10-01")
    url = f"/api/habits/{h['id']}/logs/2026-10-14"
    assert client.put(url, json={"done": True}).json()["done"] is True
    assert client.put(url, json={"done": True}).status_code == 200
    assert client.put(url, json={"done": False}).json()["done"] is False
    logs = client.get(f"/api/habits/{h['id']}/logs").json()
    assert len(logs) == 1 and logs[0]["done"] is False


def test_log_validation(client, make_habit):
    h = make_habit(weekdays=[0], start_date="2026-10-01")  # solo lunes
    base = f"/api/habits/{h['id']}/logs"
    assert client.put(f"{base}/2026-10-19", json={"done": True}).status_code == 422  # futuro
    assert client.put(f"{base}/2026-09-28", json={"done": True}).status_code == 422  # antes de crear
    assert client.put(f"{base}/2026-10-13", json={"done": True}).status_code == 422  # martes
    assert client.put(f"{base}/2026-10-12", json={"done": True}).status_code == 200  # lunes OK
    assert client.put("/api/habits/999/logs/2026-10-12", json={"done": True}).status_code == 404
