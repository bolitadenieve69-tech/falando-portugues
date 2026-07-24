"""Backward-compatible shim — Portuguese prompt now lives in the language
registry (languages/pt_pt.py). Kept so existing imports and tests keep working.
"""

from languages.pt_pt import PT_PT

TUTOR_SYSTEM_PROMPT = PT_PT.system_prompt_template
LEVEL_INSTRUCTIONS = PT_PT.level_instructions
TOPIC_LABELS = PT_PT.topic_labels


def build_system_prompt(level: str, topic: str) -> str:
    return PT_PT.build_system_prompt(level=level, topic=topic)
