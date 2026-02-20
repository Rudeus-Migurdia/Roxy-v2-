"""Rule-based emotion analyzer for nakari.

Analyzes text content to detect emotions for Live2D expression control.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from enum import Enum
from typing import TYPE_CHECKING

import structlog

if TYPE_CHECKING:
    pass


class EmotionType(str, Enum):
    """Detected emotion types."""

    NEUTRAL = "neutral"
    HAPPY = "happy"
    SAD = "sad"
    ANGRY = "angry"
    SURPRISED = "surprised"
    THINKING = "thinking"


@dataclass
class EmotionResult:
    """Result of emotion analysis."""

    emotion: EmotionType
    intensity: float  # 0.0 - 1.0
    confidence: float  # 0.0 - 1.0


_log = structlog.get_logger("emotion_analyzer")


class EmotionAnalyzer:
    """Rule-based emotion analyzer.

    Detects emotions from text using keyword matching and pattern detection.
    Designed for Chinese and English text.
    """

    # Emotion keywords (Chinese + English + Emojis)
    EMOTION_KEYWORDS: dict[str, list[str]] = {
        "happy": [
            # Chinese
            "哈哈",
            "嘿嘿",
            "嘻嘻",
            "开心",
            "高兴",
            "太好了",
            "棒",
            "优秀",
            "赞",
            "喜欢",
            "爱",
            "有趣",
            "荣幸",
            "乐意",
            "帮助",
            # English
            "happy",
            "great",
            "awesome",
            "love",
            "like",
            "enjoy",
            "fun",
            "yay",
            "haha",
            "hehe",
            # Emojis
            "😄",
            "😊",
            "😂",
            "🤣",
            "❤️",
            "👍",
            "🎉",
            "✨",
            "🌟",
        ],
        "sad": [
            # Chinese
            "难过",
            "伤心",
            "哭",
            "悲伤",
            "可惜",
            "遗憾",
            "对不起",
            "抱歉",
            "不好意思",
            "抱歉",
            "难过",
            # English
            "sad",
            "sorry",
            "unfortunately",
            "regret",
            "cry",
            # Emojis
            "😢",
            "😭",
            "😞",
            "😔",
            "💔",
        ],
        "angry": [
            # Chinese
            "生气",
            "愤怒",
            "讨厌",
            "烦",
            "滚",
            "笨蛋",
            "混蛋",
            # English
            "angry",
            "hate",
            "annoying",
            "stupid",
            # Emojis
            "😠",
            "😡",
            "👿",
        ],
        "surprised": [
            # Chinese
            "哇",
            "天啊",
            "天哪",
            "真的吗",
            "竟然",
            "居然",
            "没想到",
            # English
            "wow",
            "really",
            "amazing",
            "unexpected",
            "surprise",
            # Emojis
            "😲",
            "😱",
            "😮",
        ],
        "thinking": [
            # Chinese
            "让我想想",
            "思考",
            "考虑",
            "分析",
            "研究",
            "查看",
            "检查",
            # English
            "think",
            "consider",
            "analyze",
            "check",
            "let me see",
        ],
    }

    # Patterns for emotion indicators in parentheses (used by LLM)
    EMOTION_PATTERNS: dict[str, str] = {
        r"[\(（][微笑|笑|开心|愉快][\)）]": "happy",
        r"[\(（][难过|伤心|叹气][\)）]": "sad",
        r"[\(（][生气|愤怒|皱眉][\)）]": "angry",
        r"[\(（][惊讶|吃惊][\)）]": "surprised",
        r"[\(（][思考|想想|分析][\)）]": "thinking",
    }

    def __init__(self) -> None:
        self._log = _log

        # Compile regex patterns
        self._compiled_patterns = [
            (re.compile(pattern), emotion)
            for pattern, emotion in self.EMOTION_PATTERNS.items()
        ]

    def analyze(self, text: str) -> EmotionResult:
        """Analyze text for emotion.

        Args:
            text: The text to analyze

        Returns:
            EmotionResult with detected emotion, intensity, and confidence
        """
        text_lower = text.lower()

        # First check for explicit emotion patterns
        for pattern, emotion_str in self._compiled_patterns:
            if pattern.search(text):
                return EmotionResult(
                    emotion=EmotionType(emotion_str),
                    intensity=0.8,
                    confidence=0.9,
                )

        # Calculate scores for each emotion
        scores: dict[str, int] = {}
        for emotion, keywords in self.EMOTION_KEYWORDS.items():
            score = 0
            for kw in keywords:
                # Count occurrences
                count = text_lower.count(kw.lower())
                score += count
            scores[emotion] = score

        # Find the highest score
        max_score = max(scores.values())
        if max_score == 0:
            return EmotionResult(
                emotion=EmotionType.NEUTRAL,
                intensity=0.0,
                confidence=0.5,
            )

        max_emotion = max(scores, key=scores.get)
        max_score = scores[max_emotion]

        # Calculate intensity (0.0 - 1.0)
        intensity = min(max_score / 3, 1.0)

        # Calculate confidence based on score difference
        second_highest = sorted(scores.values())[-2]
        score_diff = max_score - second_highest
        confidence = min(0.5 + (score_diff / 2), 1.0)

        return EmotionResult(
            emotion=EmotionType(max_emotion),
            intensity=intensity,
            confidence=confidence,
        )

    def detect_from_llm_message(self, message: str) -> EmotionResult | None:
        """Detect emotion from LLM response with emotion markers.

        Args:
            message: LLM-generated message that may contain emotion markers

        Returns:
            EmotionResult if emotion detected, None otherwise
        """
        for pattern, emotion_str in self._compiled_patterns:
            if pattern.search(message):
                return EmotionResult(
                    emotion=EmotionType(emotion_str),
                    intensity=0.8,
                    confidence=0.95,
                )
        return None
