from __future__ import annotations

from fastapi.testclient import TestClient

from nakari.api.app import create_app


def test_live2d_routes_are_mounted_under_single_api_prefix() -> None:
    app = create_app()

    with TestClient(app) as client:
        assert client.get("/api/config").status_code == 200
        assert client.get("/api/models").status_code == 200
        assert client.get("/api/emotions").status_code == 200
        assert client.get("/api/motions").status_code == 200
        assert client.get("/api/api/config").status_code == 404
