from __future__ import annotations

from nakari.tts import EdgeTTSBackend


def test_edge_tts_uses_default_voice_for_empty_config() -> None:
    backend = EdgeTTSBackend("", 1.0)

    assert backend._voice == "zh-CN-XiaoxiaoNeural"
