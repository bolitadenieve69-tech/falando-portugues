"""Parse the tutor's correction format: '(Correção: X.) Reply.'"""

import re

# Lazy match, but the closing ')' must be followed by whitespace or end of
# string — so parentheticals inside the correction (e.g. "(não Y)") don't
# terminate it early. Known limitation: a correction containing ') ' inside
# still truncates; acceptable given the prompt's fixed short format.
_CORRECTION_RE = re.compile(
    r"^\s*\(\s*corre[cç]{1,2}[ãa]o\s*:\s*(.+?)\s*\)(?=\s|$)\s*(.*)$",
    re.IGNORECASE | re.DOTALL,
)


def parse_correction(text: str) -> tuple[str | None, str]:
    """Split a tutor reply into (correction, clean_text).

    Returns (None, text) when the reply does not start with the
    '(Correção: ...)' marker defined in prompts/tutor_pt.py.
    """
    match = _CORRECTION_RE.match(text)
    if not match:
        return None, text
    return match.group(1), match.group(2).strip()
