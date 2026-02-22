"""Live2D parameter mapper for emotion expressions.

Maps detected emotions to Live2D model parameters for facial expressions.
"""

from __future__ import annotations

import structlog

from nakari.emotion.analyzer import EmotionType


_log = structlog.get_logger("live2d_mapper")


class Live2DParamMapper:
    """Maps emotions to Live2D model parameters.

    Provides parameter presets for different emotions that can be
    applied to Live2D models to display facial expressions.
    """

    # Standard Live2D parameter names
    # These are common across most Live2D models
    STANDARD_PARAMS = {
        "ParamEyeLOpen",  # Left eye open amount
        "ParamEyeROpen",  # Right eye open amount
        "ParamBrowLY",  # Left brow Y position
        "ParamBrowRY",  # Right brow Y position
        "ParamBrowLAngle",  # Left brow angle
        "ParamBrowRAngle",  # Right brow angle
        "ParamBrowLForm",  # Left brow form
        "ParamBrowRForm",  # Right brow form
        "ParamMouthForm",  # Mouth form (vowel shape)
        "ParamMouthOpenY",  # Mouth open amount
        "ParamCheek",  # Chey blush
        "ParamAngleX",  # Body angle X
        "ParamAngleY",  # Body angle Y
        "ParamAngleZ",  # Body angle Z
        "ParamBodyAngleX",  # Body angle X
        "ParamBreath",  # Breath animation
    }

    # Emotion parameter presets
    # Values are relative adjustments from default
    EMOTION_PRESETS: dict[EmotionType, dict[str, float]] = {
        EmotionType.NEUTRAL: {
            "ParamEyeLOpen": 1.0,
            "ParamEyeROpen": 1.0,
            "ParamBrowLY": 0.0,
            "ParamBrowRY": 0.0,
            "ParamBrowLAngle": 0.0,
            "ParamBrowRAngle": 0.0,
            "ParamMouthForm": 2.0,  # Neutral
            "ParamMouthOpenY": 0.0,
            "ParamCheek": 0.0,
        },
        EmotionType.HAPPY: {
            "ParamEyeLOpen": 0.85,
            "ParamEyeROpen": 0.85,
            "ParamBrowLY": -0.3,  # Raised
            "ParamBrowRY": -0.3,
            "ParamBrowLAngle": 0.2,
            "ParamBrowRAngle": 0.2,
            "ParamMouthForm": 0.0,  # 'a' smile
            "ParamMouthOpenY": 0.2,
            "ParamCheek": 0.3,  # Blush
        },
        EmotionType.SAD: {
            "ParamEyeLOpen": 0.6,
            "ParamEyeROpen": 0.6,
            "ParamBrowLY": 0.3,  # Lowered
            "ParamBrowRY": 0.3,
            "ParamBrowLAngle": -0.2,
            "ParamBrowRAngle": -0.2,
            "ParamMouthForm": 4.0,  # 'o' sad
            "ParamMouthOpenY": 0.1,
            "ParamAngleY": 5.0,  # Slight head down
        },
        EmotionType.ANGRY: {
            "ParamEyeLOpen": 0.7,
            "ParamEyeROpen": 0.7,
            "ParamBrowLY": 0.4,  # Lowered and angled
            "ParamBrowRY": 0.4,
            "ParamBrowLAngle": -0.3,
            "ParamBrowRAngle": 0.3,
            "ParamMouthForm": 3.0,
            "ParamMouthOpenY": 0.15,
            "ParamAngleX": -10.0,  # Head turn
            "ParamAngleY": 5.0,
        },
        EmotionType.SURPRISED: {
            "ParamEyeLOpen": 1.5,  # Wide eyes
            "ParamEyeROpen": 1.5,
            "ParamBrowLY": -0.5,  # Raised high
            "ParamBrowRY": -0.5,
            "ParamMouthForm": 3.0,  # 'o' surprised
            "ParamMouthOpenY": 0.4,
        },
        EmotionType.THINKING: {
            "ParamEyeLOpen": 0.7,
            "ParamEyeROpen": 0.7,
            "ParamBrowLY": 0.2,
            "ParamBrowRY": 0.2,
            "ParamBrowLAngle": 0.1,
            "ParamBrowRAngle": -0.1,
            "ParamMouthForm": 2.0,
            "ParamMouthOpenY": 0.0,
            "ParamBodyAngleX": 5.0,  # Slight tilt
        },
    }

    @classmethod
    def get_params(cls, emotion: EmotionType, intensity: float = 1.0) -> dict[str, float]:
        """Get Live2D parameters for an emotion.

        Args:
            emotion: The emotion type
            intensity: Emotion intensity (0.0 - 1.0)

        Returns:
            Dictionary of Live2D parameter names to values
        """
        base = cls.EMOTION_PRESETS.get(emotion, cls.EMOTION_PRESETS[EmotionType.NEUTRAL])

        # Scale by intensity
        return {param: value * intensity for param, value in base.items()}

    @classmethod
    def get_mvn_for_emotion(cls, emotion: EmotionType) -> str:
        """Get the motion group name for an emotion.

        Args:
            emotion: The emotion type

        Returns:
            Motion group name for the emotion
        """
        motion_map = {
            EmotionType.NEUTRAL: "idle",
            EmotionType.HAPPY: "happy",
            EmotionType.SAD: "sad",
            EmotionType.ANGRY: "angry",
            EmotionType.SURPRISED: "surprised",
            EmotionType.THINKING: "thinking",
        }
        return motion_map.get(emotion, "idle")

    @classmethod
    def validate_params(cls, params: dict[str, float]) -> dict[str, float]:
        """Validate and clamp parameter values.

        Args:
            params: Raw parameter dictionary

        Returns:
            Validated parameter dictionary with values clamped to valid ranges
        """
        validated = {}
        for param, value in params.items():
            # Most Live2D parameters are in range -1.0 to 1.0
            # Some (like angles) can go higher
            if "Angle" in param or "angle" in param:
                validated[param] = max(-30.0, min(30.0, value))
            else:
                validated[param] = max(-1.0, min(1.5, value))
        return validated
