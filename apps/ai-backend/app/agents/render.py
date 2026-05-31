"""Agent 9 — RENDER: FFmpeg ASS subtitles, 9:16 cropping, R2 upload."""

from __future__ import annotations

import tempfile
import uuid
from pathlib import Path
from typing import Any

import structlog

from app.agents.base import BaseAgent
from app.models.state import AgentCutGraphState, AgentName
from app.services.ffmpeg_service import cut_clip, render_vertical
from app.services.r2_storage import download_file, generate_signed_url, upload_file

logger = structlog.get_logger(__name__)

STYLE_ASS_TEMPLATES = {
    "mrbeast": {
        "font": "Impact",
        "fontsize": 24,
        "primary_color": "&H00FFFF&",  # Yellow
        "outline_color": "&H000000&",
        "outline": 4,
        "bold": 1,
        "alignment": 2,  # Bottom center
    },
    "hormozi": {
        "font": "Arial",
        "fontsize": 22,
        "primary_color": "&HFFFFFF&",
        "outline_color": "&H000000&",
        "outline": 2,
        "bold": 1,
        "alignment": 2,
        "border_style": 3,  # Box highlight
    },
    "podcast": {
        "font": "Georgia",
        "fontsize": 20,
        "primary_color": "&HFFFFFF&",
        "outline_color": "&H333333&",
        "outline": 1,
        "bold": 0,
        "alignment": 2,
    },
    "storytelling": {
        "font": "Garamond",
        "fontsize": 22,
        "primary_color": "&HF0E6D2&",
        "outline_color": "&H1A1A1A&",
        "outline": 2,
        "bold": 0,
        "alignment": 2,
    },
    "educational": {
        "font": "Helvetica",
        "fontsize": 20,
        "primary_color": "&HFFFFFF&",
        "outline_color": "&H2D2D2D&",
        "outline": 2,
        "bold": 0,
        "alignment": 2,
    },
}


class RenderAgent(BaseAgent):
    name = AgentName.RENDER

    async def _execute(self, state: AgentCutGraphState) -> dict[str, Any]:
        selected_clips = state.get("selected_clips", [])
        caption_data = state.get("caption_segments_by_clip", {})
        upload_r2_key = state.get("upload_r2_key")
        style = state.get("style_preset", "mrbeast")
        project_id = state["project_id"]

        if not selected_clips or not upload_r2_key:
            raise ValueError("Missing clips or source video")

        rendered_clips = []

        with tempfile.TemporaryDirectory() as tmpdir:
            tmp = Path(tmpdir)

            # Download source video
            source_path = await download_file(upload_r2_key, tmp / "source.mp4")

            for clip in selected_clips:
                if not clip.get("approved", True):
                    clip_copy = dict(clip)
                    clip_copy["render_status"] = "skipped"
                    rendered_clips.append(clip_copy)
                    continue

                clip_id = clip.get("id", f"clip_{clip['clip_index']}")

                # Cut the clip segment
                clip_path = tmp / f"{clip_id}_raw.mp4"
                await cut_clip(
                    source_path,
                    clip["start_time"],
                    clip["end_time"],
                    clip_path,
                )

                # Generate ASS subtitle file
                captions = caption_data.get(clip_id, [])
                ass_path = None
                if captions:
                    ass_path = tmp / f"{clip_id}.ass"
                    self._generate_ass(captions, ass_path, style, clip["start_time"])

                # Render vertical (9:16) with subtitles
                output_path = tmp / f"{clip_id}_final.mp4"
                await render_vertical(
                    video_path=clip_path,
                    output_path=output_path,
                    ass_subtitle_path=ass_path,
                    resolution="1080p",
                )

                # Upload to R2
                r2_key = f"projects/{project_id}/renders/{uuid.uuid4()}.mp4"
                await upload_file(output_path, r2_key, "video/mp4")

                # Generate download URL
                download_url = await generate_signed_url(r2_key)

                clip_copy = dict(clip)
                clip_copy["render_status"] = "complete"
                clip_copy["render_r2_key"] = r2_key
                clip_copy["render_url"] = download_url
                rendered_clips.append(clip_copy)

                logger.info("clip_rendered", clip_id=clip_id, r2_key=r2_key)

        return {
            "selected_clips": rendered_clips,
            "current_stage": "complete",
            "_confidence": 0.95,
        }

    def _generate_ass(
        self,
        captions: list[dict[str, Any]],
        output_path: Path,
        style: str,
        clip_start: float,
    ) -> None:
        """Generate an ASS subtitle file from caption segments."""
        template = STYLE_ASS_TEMPLATES.get(style, STYLE_ASS_TEMPLATES["mrbeast"])

        header = f"""[Script Info]
Title: AgentCut AI Captions
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, OutlineColour, BackColour, Bold, Italic, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{template['font']},{template['fontsize']},{template['primary_color']},{template['outline_color']},&H80000000&,{template['bold']},0,1,{template['outline']},0,{template['alignment']},40,40,60,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
        lines = []
        for seg in captions:
            start = seg["start"]
            end = seg["end"]
            text = seg["text"]

            # Apply emphasis styling
            for word in seg.get("emphasized_words", []):
                text = text.replace(word, f"{{\\b1\\fs{template['fontsize'] + 6}}}{word}{{\\b0\\fs{template['fontsize']}}}")

            start_ts = self._seconds_to_ass_time(start)
            end_ts = self._seconds_to_ass_time(end)
            lines.append(f"Dialogue: 0,{start_ts},{end_ts},Default,,0,0,0,,{text}")

        output_path.write_text(header + "\n".join(lines), encoding="utf-8")

    def _seconds_to_ass_time(self, seconds: float) -> str:
        """Convert seconds to ASS timestamp format (H:MM:SS.cc)."""
        h = int(seconds // 3600)
        m = int((seconds % 3600) // 60)
        s = int(seconds % 60)
        cs = int((seconds % 1) * 100)
        return f"{h}:{m:02d}:{s:02d}.{cs:02d}"


render_agent = RenderAgent()
