def test_task_crud(client):
    r = client.post("/api/tasks", json={"title": "Entregar práctica", "date": "2026-10-15"})
    assert r.status_code == 201
    task = r.json()
    assert task["done"] is False and task["notes"] is None

    r = client.patch(f"/api/tasks/{task['id']}", json={"done": True, "notes": "Subida al campus"})
    assert r.json()["done"] is True and r.json()["notes"] == "Subida al campus"
    # notes sí admite null para borrar la nota
    assert client.patch(f"/api/tasks/{task['id']}", json={"notes": None}).json()["notes"] is None
    assert client.patch(f"/api/tasks/{task['id']}", json={"title": None}).status_code == 422

    assert len(client.get("/api/tasks", params={"date": "2026-10-15"}).json()) == 1
    assert client.get("/api/tasks", params={"date": "2026-10-16"}).json() == []

    assert client.delete(f"/api/tasks/{task['id']}").status_code == 204
    assert client.delete(f"/api/tasks/{task['id']}").status_code == 404


def test_task_validation(client):
    assert client.post("/api/tasks", json={"title": "  ", "date": "2026-10-15"}).status_code == 422
    assert client.post("/api/tasks", json={"title": "x", "date": "no-es-fecha"}).status_code == 422


def test_weight_upsert_and_delete(client):
    r = client.put("/api/weight/2026-10-10", json={"weight_kg": 78.4})
    assert r.status_code == 201
    r = client.put("/api/weight/2026-10-10", json={"weight_kg": 78.1, "note": "tras correr"})
    assert r.status_code == 200 and r.json()["weight_kg"] == 78.1
    assert client.get("/api/weight/2026-10-10").json()["note"] == "tras correr"
    assert client.delete("/api/weight/2026-10-10").status_code == 204
    assert client.get("/api/weight/2026-10-10").status_code == 404


def test_weight_validation(client):
    assert client.put("/api/weight/2026-10-20", json={"weight_kg": 70}).status_code == 422  # futuro
    assert client.put("/api/weight/2026-10-10", json={"weight_kg": -3}).status_code == 422
    assert client.get("/api/weight", params={"months": 2}).status_code == 422


def test_weight_series_with_moving_average(client):
    # 6 días antes del rango + dentro del rango de 1 mes (15-sep .. 15-oct)
    client.put("/api/weight/2026-09-10", json={"weight_kg": 80})  # fuera, pero alimenta la media
    client.put("/api/weight/2026-09-15", json={"weight_kg": 79})
    client.put("/api/weight/2026-10-15", json={"weight_kg": 77})
    body = client.get("/api/weight", params={"months": 1}).json()
    assert body["start"] == "2026-09-15"
    assert [e["date"] for e in body["entries"]] == ["2026-09-15", "2026-10-15"]
    assert body["entries"][0]["moving_avg_7d"] == 79.5  # (80 + 79) / 2
