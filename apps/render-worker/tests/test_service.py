from render_worker import SERVICE_NAME


def test_service_name() -> None:
    assert SERVICE_NAME == "geekdesign-render-worker"
