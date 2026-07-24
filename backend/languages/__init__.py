"""Language registry — the single source of truth for supported languages.

Adding a new language is a configuration task: create a profile module and
add it to _PROFILES below. No engine code changes are required.
"""

from languages.en_gb import EN_GB
from languages.fr_fr import FR_FR
from languages.it_it import IT_IT
from languages.profile import DEFAULT_LEVEL, DEFAULT_TOPIC, LanguageProfile, Voice
from languages.pt_pt import PT_PT

DEFAULT_LANGUAGE = "pt-PT"

_PROFILES: tuple[LanguageProfile, ...] = (PT_PT, FR_FR, IT_IT, EN_GB)

LANGUAGES: dict[str, LanguageProfile] = {p.code: p for p in _PROFILES}


def get_language(code: str) -> LanguageProfile | None:
    """Return the profile for a language code, or None if unsupported."""
    return LANGUAGES.get(code)


def list_languages(ready_only: bool = False) -> list[LanguageProfile]:
    """All registered profiles, optionally only those with configured voices."""
    profiles = list(_PROFILES)
    if ready_only:
        profiles = [p for p in profiles if p.ready]
    return profiles


__all__ = [
    "DEFAULT_LANGUAGE",
    "DEFAULT_LEVEL",
    "DEFAULT_TOPIC",
    "LANGUAGES",
    "LanguageProfile",
    "Voice",
    "get_language",
    "list_languages",
]
