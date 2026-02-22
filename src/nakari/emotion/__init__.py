"""Emotion analysis module for nakari.

Provides rule-based emotion detection from text messages,
used to drive Live2D facial expressions.
"""

from __future__ import annotations

from nakari.emotion.analyzer import EmotionAnalyzer
from nakari.emotion.mapper import Live2DParamMapper

__all__ = ["EmotionAnalyzer", "Live2DParamMapper"]
