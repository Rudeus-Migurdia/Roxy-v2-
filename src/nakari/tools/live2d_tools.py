"""Live2D control tools for nakari.

Provides tools that allow nakari to control Live2D animations
and expressions on the frontend, following nakari's explicit
tool registration pattern.
"""

from __future__ import annotations

import json
from typing import TYPE_CHECKING

import structlog

from nakari.emotion.analyzer import EmotionAnalyzer, EmotionType
from nakari.frontend_adapter.state_emitter import Live2DEmotion, Live2DMotion, StateEmitter
from nakari.tool_registry import ToolRegistry

if TYPE_CHECKING:
    from nakari.emotion.mapper import Live2DParamMapper

_log = structlog.get_logger("live2d_tools")


def register_live2d_tools(
    registry: ToolRegistry,
    state_emitter: StateEmitter,
) -> None:
    """Register Live2D control tools.

    Args:
        registry: The ToolRegistry to register tools with
        state_emitter: The StateEmitter for broadcasting to frontend
    """

    # Initialize emotion analyzer
    emotion_analyzer = EmotionAnalyzer()

    async def live2d_set_motion(motion: str, loop: bool = False) -> str:
        """Set Live2D motion animation.

        Play a specific motion on the Live2D model.

        Args:
            motion: The motion to play (idle, happy, sad, angry, thinking, surprised, speaking)
            loop: Whether to loop the motion

        Returns:
            Confirmation message
        """
        try:
            motion_enum = Live2DMotion(motion)
        except ValueError:
            return f"Error: Unknown motion '{motion}'. Valid options: {[m.value for m in Live2DMotion]}"

        await state_emitter.emit_motion(motion_enum, loop=loop)
        return f"Motion set to {motion}"

    async def live2d_set_emotion(emotion: str, intensity: float = 1.0) -> str:
        """Set Live2D facial expression.

        Display a specific emotion on the Live2D model.

        Args:
            emotion: The emotion to display (neutral, happy, sad, angry, surprised)
            intensity: Emotion intensity from 0.0 to 1.0

        Returns:
            Confirmation message
        """
        try:
            emotion_enum = Live2DEmotion(emotion)
        except ValueError:
            return f"Error: Unknown emotion '{emotion}'. Valid options: {[e.value for e in Live2DEmotion]}"

        intensity = max(0.0, min(1.0, intensity))
        await state_emitter.emit_emotion(emotion_enum, intensity)
        return f"Emotion set to {emotion} (intensity: {intensity})"

    async def live2d_analyze_emotion(text: str) -> str:
        """Analyze emotion from text and apply to Live2D.

        Analyzes the given text for emotional content and automatically
        sets the corresponding Live2D expression.

        Args:
            text: The text to analyze for emotion

        Returns:
            JSON with detected emotion and intensity
        """
        result = emotion_analyzer.analyze(text)

        # Apply the detected emotion
        await state_emitter.emit_emotion(
            Live2DEmotion(result.emotion.value),
            result.intensity,
        )

        return json.dumps(
            {
                "emotion": result.emotion.value,
                "intensity": result.intensity,
                "confidence": result.confidence,
            },
            ensure_ascii=False,
        )

    async def live2d_set_param(param_name: str, value: float) -> str:
        """Set a specific Live2D parameter value.

        Directly control a Live2D model parameter.

        Args:
            param_name: The parameter name (e.g., ParamEyeLOpen, ParamMouthOpenY)
            value: The parameter value (typically -1.0 to 1.0)

        Returns:
            Confirmation message
        """
        # Broadcast parameter set request
        message = {
            "version": "1.0",
            "type": "param_set",
            "timestamp": 0,  # Will be set by broadcast
            "payload": {
                "param": param_name,
                "value": value,
            },
        }
        await state_emitter._manager.broadcast(message)
        return f"Parameter {param_name} set to {value}"

    # Register tools
    registry.register(
        name="live2d_set_motion",
        description="Play a Live2D motion animation on the frontend model.",
        parameters={
            "type": "object",
            "properties": {
                "motion": {
                    "type": "string",
                    "enum": ["idle", "happy", "sad", "angry", "thinking", "surprised", "speaking"],
                    "description": "The motion to play",
                },
                "loop": {
                    "type": "boolean",
                    "description": "Whether to loop the motion (default false)",
                },
            },
            "required": ["motion"],
            "additionalProperties": False,
        },
        handler=live2d_set_motion,
    )

    registry.register(
        name="live2d_set_emotion",
        description="Set Live2D facial expression/emotion on the frontend model.",
        parameters={
            "type": "object",
            "properties": {
                "emotion": {
                    "type": "string",
                    "enum": ["neutral", "happy", "sad", "angry", "surprised"],
                    "description": "The emotion to display",
                },
                "intensity": {
                    "type": "number",
                    "minimum": 0.0,
                    "maximum": 1.0,
                    "description": "Emotion intensity (default 1.0)",
                },
            },
            "required": ["emotion"],
            "additionalProperties": False,
        },
        handler=live2d_set_emotion,
    )

    registry.register(
        name="live2d_analyze_emotion",
        description=(
            "Analyze text for emotional content and apply the corresponding "
            "Live2D expression. Returns detected emotion and intensity."
        ),
        parameters={
            "type": "object",
            "properties": {
                "text": {
                    "type": "string",
                    "description": "The text to analyze for emotion",
                },
            },
            "required": ["text"],
            "additionalProperties": False,
        },
        handler=live2d_analyze_emotion,
    )

    registry.register(
        name="live2d_set_param",
        description="Directly set a Live2D model parameter value.",
        parameters={
            "type": "object",
            "properties": {
                "param_name": {
                    "type": "string",
                    "description": "Parameter name (e.g., ParamEyeLOpen, ParamMouthOpenY)",
                },
                "value": {
                    "type": "number",
                    "description": "Parameter value (typically -1.0 to 1.0)",
                },
            },
            "required": ["param_name", "value"],
            "additionalProperties": False,
        },
        handler=live2d_set_param,
    )

    _log.info("live2d_tools_registered", tool_count=4)
