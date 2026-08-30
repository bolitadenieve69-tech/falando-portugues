"""Parse the tutor's correction out of its reply.

The prompt asks for a parenthesised marker, "(Correção: X.) Reply.", but models
drift from exact formats: in real sessions the tutor consistently writes
"Correção: X. Reply." with no parentheses, which used to fall through and leave
the whole thing as plain body text. Both forms are accepted, on the principle of
being liberal in what we accept.

The marker word varies by language (Portuguese "Correção"/"Correcção", French and
English "Correction", Italian "Correzione"), so all are matched. See the language
profiles in languages/ for the per-language prompt.
"""

import re

# Language-neutral correction marker: corre(ção|cção|ction|zione|cción).
# Spanish is in the list even though no profile speaks it: a Portuguese tutor
# talking to a Spanish speaker drifts into "Corrección", and an unrecognised
# marker is not a silent failure — it gets read aloud.
_MARKER = r"corre(?:[cç]{1,2}(?:[ãa]o|i[óo]n)|ction|zione)"

# Preferred form. Lazy match, but the closing ')' must be followed by whitespace
# or end of string, so parentheticals inside the correction (e.g. "(não Y)") do
# not terminate it early.
_PARENTHESISED_RE = re.compile(
    rf"^\s*\(\s*{_MARKER}\s*:\s*(.+?)\s*\)(?=\s|$)\s*(.*)$",
    re.IGNORECASE | re.DOTALL,
)

# Fallback form: the marker opens the reply with no parentheses at all.
_BARE_RE = re.compile(rf"^\s*{_MARKER}\s*:\s*", re.IGNORECASE)

_SENTENCE_END = ".!?"
_QUOTES = '"“”«»'


def _first_sentence_end(text: str) -> int | None:
    """Index of the first sentence terminator that ends the correction.

    Terminators inside quotes do not count: corrections routinely quote the
    learner's own words back, as in 'diz-se "Podes repetir?" em vez de ...',
    where that question mark is part of the quotation and not the end.
    """
    in_quotes = False
    for i, ch in enumerate(text):
        if ch in _QUOTES:
            in_quotes = not in_quotes
        elif ch in _SENTENCE_END and not in_quotes:
            rest = text[i + 1:]
            # A terminator followed by a closing quote belongs to the quotation.
            if rest[:1] in _QUOTES:
                continue
            if rest == "" or rest[:1].isspace():
                return i
    return None


def parse_correction(text: str) -> tuple[str | None, str]:
    """Split a tutor reply into (correction, clean_text).

    Returns (None, text) when the reply carries no correction marker.
    """
    match = _PARENTHESISED_RE.match(text)
    if match:
        return match.group(1), match.group(2).strip()

    match = _BARE_RE.match(text)
    if not match:
        return None, text

    rest = text[match.end():]
    end = _first_sentence_end(rest)
    if end is None:
        # The whole reply is the correction, with nothing following it.
        return rest.strip(), ""
    return rest[: end + 1].strip(), rest[end + 1:].strip()
