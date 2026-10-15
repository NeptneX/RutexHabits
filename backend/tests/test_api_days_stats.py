def test_day_view(client, make_habit):
    gym = make_habit(name="Gimnasio", weekdays=[0, 2, 4], start_date="2026-10-01")
    read = make_habit(name="Leer", start_date="2026-10-01")
    client.put(f"/api/habits/{read['id']}/logs/2026-10-14", json={"done": True})
    client.post("/api/tasks", json={"title": "Comprar", "date": "2026-10-14"})
    client.put("/api/weight/2026-10-14", json={"weight_kg": 75})

    day = client.get("/api/days/2026-10-14").json()  # miércoles
    assert day["can_log"] is True
    assert day["summary"] == {"date": "2026-10-14", "done": 1, "total": 2}
    assert {h["name"]: h["done"] for h in day["habits"]} == {"Gimnasio": False, "Leer": True}
    assert [t["title"] for t in day["tasks"]] == ["Comprar"]
    assert day["weight"]["weight_kg"] == 75

    tuesday = client.get("/api/days/2026-10-13").json()
    assert [h["id"] for h in tuesday["habits"]] == [read["id"]]
    assert gym["id"] not in [h["id"] for h in tuesday["habits"]]

    assert client.get("/api/days/2026-10-20").json()["can_log"] is False
    assert client.get("/api/days/2026-13-01").status_code == 422


def test_calendar(client, make_habit):
    h = make_habit(start_date="2026-10-10")
    client.put(f"/api/habits/{h['id']}/logs/2026-10-10", json={"done": True})
    body = client.get("/api/calendar", params={"month": "2026-10"}).json()
    days = {d["date"]: (d["done"], d["total"]) for d in body["days"]}
    assert len(days) == 31
    assert days["2026-10-09"] == (0, 0)
    assert days["2026-10-10"] == (1, 1)


def test_calendar_bad_month(client):
    assert client.get("/api/calendar", params={"month": "2026-13"}).status_code == 422
    assert client.get("/api/calendar", params={"month": "octubre"}).status_code == 422
    assert client.get("/api/calendar").status_code == 422


def test_monthly_stats_endpoint(client, make_habit):
    h = make_habit(start_date="2026-09-01")
    for day in ("2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02"):
        client.put(f"/api/habits/{h['id']}/logs/{day}", json={"done": True})
    client.put("/api/weight/2026-10-01", json={"weight_kg": 80})
    client.put("/api/weight/2026-10-14", json={"weight_kg": 79})

    body = client.get("/api/stats/monthly", params={"month": "2026-10"}).json()
    assert body["month"] == "2026-10"
    assert body["overall"] == {"done": 2, "applicable": 14, "rate": 2 / 14}
    assert body["previous"]["month"] == "2026-09"
    assert body["previous"]["done"] == 2 and body["previous"]["applicable"] == 30
    stats = body["habits"][0]
    assert stats["max_streak"] == 4  # cruza de septiembre a octubre
    assert stats["current_streak"] == 0
    assert body["weight"]["change"] == -1.0
    assert len(body["heatmap"]) == 31
    assert len(body["weekdays"]) == 7


def test_monthly_stats_empty_month(client):
    body = client.get("/api/stats/monthly", params={"month": "2025-01"}).json()
    assert body["overall"]["rate"] is None
    assert body["habits"] == []
    assert body["best_weekday"] is None
