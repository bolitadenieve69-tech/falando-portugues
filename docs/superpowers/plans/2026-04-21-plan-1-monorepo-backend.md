# Language Tutor Platform — Plan 1: Monorepo + Language-Aware Backend

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the `language-tutor-platform/` monorepo and make the backend serve all 5 languages from a single server.

**Architecture:** New repo with `backend/` (FastAPI + Pipecat) and `shared/` directories. Backend receives a `language` parameter on `/session` and dynamically loads the correct prompt, STT language code, and ElevenLabs voice. Each language has its own prompt file in `backend/prompts/`.

**Tech Stack:** Python 3.12, FastAPI, Pipecat, Deepgram, Claude Haiku (claude-haiku-4-5-20251001), ElevenLabs eleven_multilingual_v2, LiveKit, Docker, pytest

---

## File Map

**Create:**
- `language-tutor-platform/backend/prompts/english.py`
- `language-tutor-platform/backend/prompts/spanish.py`
- `language-tutor-platform/backend/prompts/portuguese.py` (migrated from falando-portugues)
- `language-tutor-platform/backend/prompts/french.py`
- `language-tutor-platform/backend/prompts/italian.py`
- `language-tutor-platform/backend/prompts/__init__.py`
- `language-tutor-platform/backend/languages.py` (language config registry)
- `language-tutor-platform/backend/main.py` (migrated + language param)
- `language-tutor-platform/backend/bot.py` (migrated + language-aware)
- `language-tutor-platform/backend/database.py` (migrated, add language column)
- `language-tutor-platform/backend/auth_router.py` (migrated unchanged)
- `language-tutor-platform/backend/utils/livekit_token.py` (migrated unchanged)
- `language-tutor-platform/backend/requirements.txt`
- `language-tutor-platform/backend/.env.example`
- `language-tutor-platform/backend/Dockerfile`
- `language-tutor-platform/docker-compose.yml`
- `language-tutor-platform/backend/tests/test_languages.py`
- `language-tutor-platform/backend/tests/test_session.py`
- `language-tutor-platform/.gitignore`
- `language-tutor-platform/README.md`

---

### Task 1: Create monorepo scaffold

**Files:**
- Create: `language-tutor-platform/` (root)
- Create: `language-tutor-platform/.gitignore`
- Create: `language-tutor-platform/README.md`

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p ~/language-tutor-platform/backend/prompts
mkdir -p ~/language-tutor-platform/backend/utils
mkdir -p ~/language-tutor-platform/backend/tests
mkdir -p ~/language-tutor-platform/shared
mkdir -p ~/language-tutor-platform/apps
mkdir -p ~/language-tutor-platform/docs/specs
mkdir -p ~/language-tutor-platform/docs/plans
cd ~/language-tutor-platform
git init
```

- [ ] **Step 2: Create .gitignore**

Create `language-tutor-platform/.gitignore`:

```
# Python
__pycache__/
*.pyc
*.pyo
.venv/
venv/
*.egg-info/
dist/
.pytest_cache/

# Env
.env
.env.local
.env*.local

# Node
node_modules/
.expo/
ios/
android/

# DB
*.db
*.sqlite

# OS
.DS_Store
```

- [ ] **Step 3: Copy spec and plans from old project**

```bash
cp ~/APP_falando_portugues/docs/superpowers/specs/2026-04-21-language-tutor-platform-design.md \
   ~/language-tutor-platform/docs/specs/
cp ~/APP_falando_portugues/docs/superpowers/plans/2026-04-21-plan-1-monorepo-backend.md \
   ~/language-tutor-platform/docs/plans/
```

- [ ] **Step 4: Initial commit**

```bash
cd ~/language-tutor-platform
git add .
git commit -m "chore: initialize language-tutor-platform monorepo"
```

---

### Task 2: Migrate and update backend core files

**Files:**
- Create: `language-tutor-platform/backend/requirements.txt`
- Create: `language-tutor-platform/backend/utils/livekit_token.py`
- Create: `language-tutor-platform/backend/auth_router.py`

- [ ] **Step 1: Create requirements.txt**

Create `language-tutor-platform/backend/requirements.txt`:

```
pipecat-ai[livekit,openai,deepgram,elevenlabs]>=0.0.45
anthropic>=0.25.0
livekit-api>=0.6.0
python-dotenv>=1.0.0
fastapi>=0.111.0
uvicorn>=0.29.0
httpx>=0.27.0
slowapi>=0.1.9
limits>=3.13.0
aiosqlite>=0.20.0
bcrypt>=4.1.0
pytest>=8.0.0
pytest-asyncio>=0.23.0
```

- [ ] **Step 2: Copy utility files unchanged**

```bash
cp ~/APP_falando_portugues/backend/utils/livekit_token.py \
   ~/language-tutor-platform/backend/utils/livekit_token.py

cp ~/APP_falando_portugues/backend/auth_router.py \
   ~/language-tutor-platform/backend/auth_router.py

cp ~/APP_falando_portugues/backend/database.py \
   ~/language-tutor-platform/backend/database.py
```

- [ ] **Step 3: Create Python virtualenv and install dependencies**

```bash
cd ~/language-tutor-platform/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Expected: All packages install without errors.

- [ ] **Step 4: Commit**

```bash
cd ~/language-tutor-platform
git add backend/
git commit -m "chore: migrate backend core files"
```

---

### Task 3: Create language config registry

**Files:**
- Create: `language-tutor-platform/backend/languages.py`

- [ ] **Step 1: Write failing test**

Create `language-tutor-platform/backend/tests/test_languages.py`:

```python
import pytest
from languages import get_language_config, LanguageConfig, SUPPORTED_LANGUAGES

def test_get_english_config():
    config = get_language_config("english")
    assert config.deepgram_language == "en"
    assert config.elevenlabs_voice_env == "ENGLISH_VOICE_ID"
    assert config.prompt_module == "prompts.english"

def test_get_spanish_config():
    config = get_language_config("spanish")
    assert config.deepgram_language == "es"
    assert config.elevenlabs_voice_env == "SPANISH_VOICE_ID"
    assert config.prompt_module == "prompts.spanish"

def test_get_portuguese_config():
    config = get_language_config("portuguese")
    assert config.deepgram_language == "pt"
    assert config.elevenlabs_voice_env == "PORTUGUESE_VOICE_ID"
    assert config.prompt_module == "prompts.portuguese"

def test_get_french_config():
    config = get_language_config("french")
    assert config.deepgram_language == "fr"
    assert config.elevenlabs_voice_env == "FRENCH_VOICE_ID"
    assert config.prompt_module == "prompts.french"

def test_get_italian_config():
    config = get_language_config("italian")
    assert config.deepgram_language == "it"
    assert config.elevenlabs_voice_env == "ITALIAN_VOICE_ID"
    assert config.prompt_module == "prompts.italian"

def test_unsupported_language_raises():
    with pytest.raises(ValueError, match="Unsupported language"):
        get_language_config("klingon")

def test_supported_languages_list():
    assert set(SUPPORTED_LANGUAGES) == {"english", "spanish", "portuguese", "french", "italian"}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd ~/language-tutor-platform/backend
source .venv/bin/activate
pytest tests/test_languages.py -v
```

Expected: `ModuleNotFoundError: No module named 'languages'`

- [ ] **Step 3: Implement languages.py**

Create `language-tutor-platform/backend/languages.py`:

```python
from dataclasses import dataclass

@dataclass(frozen=True)
class LanguageConfig:
    deepgram_language: str
    elevenlabs_voice_env: str
    prompt_module: str
    ui_language: str

_REGISTRY: dict[str, LanguageConfig] = {
    "english": LanguageConfig(
        deepgram_language="en",
        elevenlabs_voice_env="ENGLISH_VOICE_ID",
        prompt_module="prompts.english",
        ui_language="en",
    ),
    "spanish": LanguageConfig(
        deepgram_language="es",
        elevenlabs_voice_env="SPANISH_VOICE_ID",
        prompt_module="prompts.spanish",
        ui_language="es",
    ),
    "portuguese": LanguageConfig(
        deepgram_language="pt",
        elevenlabs_voice_env="PORTUGUESE_VOICE_ID",
        prompt_module="prompts.portuguese",
        ui_language="pt",
    ),
    "french": LanguageConfig(
        deepgram_language="fr",
        elevenlabs_voice_env="FRENCH_VOICE_ID",
        prompt_module="prompts.french",
        ui_language="fr",
    ),
    "italian": LanguageConfig(
        deepgram_language="it",
        elevenlabs_voice_env="ITALIAN_VOICE_ID",
        prompt_module="prompts.italian",
        ui_language="it",
    ),
}

SUPPORTED_LANGUAGES = list(_REGISTRY.keys())


def get_language_config(language: str) -> LanguageConfig:
    config = _REGISTRY.get(language)
    if config is None:
        raise ValueError(f"Unsupported language: {language}. Must be one of {SUPPORTED_LANGUAGES}")
    return config
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest tests/test_languages.py -v
```

Expected: All 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
cd ~/language-tutor-platform
git add backend/languages.py backend/tests/test_languages.py
git commit -m "feat: add language config registry"
```

---

### Task 4: Create prompt files for all 5 languages

**Files:**
- Create: `language-tutor-platform/backend/prompts/__init__.py`
- Create: `language-tutor-platform/backend/prompts/portuguese.py` (migrated)
- Create: `language-tutor-platform/backend/prompts/english.py`
- Create: `language-tutor-platform/backend/prompts/spanish.py`
- Create: `language-tutor-platform/backend/prompts/french.py`
- Create: `language-tutor-platform/backend/prompts/italian.py`

- [ ] **Step 1: Create __init__.py and migrate Portuguese prompt**

Create `language-tutor-platform/backend/prompts/__init__.py`:
```python
```

```bash
cp ~/APP_falando_portugues/backend/prompts/tutor_pt.py \
   ~/language-tutor-platform/backend/prompts/portuguese.py
```

- [ ] **Step 2: Create English prompt**

Create `language-tutor-platform/backend/prompts/english.py`:

```python
def build_system_prompt(level: str, topic: str) -> str:
    return f"""You are an encouraging and patient English tutor helping {_LEVEL_DESC[level]} speakers improve their English.

The student's current level is {level} ({_LEVEL_DESC[level]}).
Today's topic: {_TOPIC_DESC.get(topic, topic)}.

YOUR ROLE:
- Speak naturally in English at a speed and complexity appropriate for {level}
- After each student response, briefly correct any grammar or vocabulary mistakes
- Format corrections as: "Almost! We say: [correct version] — because [short reason]"
- Ask follow-up questions to keep the conversation going
- Be warm, encouraging, and never make the student feel embarrassed
- Adjust vocabulary complexity to the student's level

CORRECTIONS:
- Only correct 1-2 mistakes per turn to avoid overwhelming the student
- Always acknowledge what they said correctly first
- Keep corrections short (1 sentence max)

START: Greet the student warmly in English and introduce today's topic."""

_LEVEL_DESC = {
    "A1": "complete beginner",
    "A2": "elementary",
    "B1": "intermediate",
    "B2": "upper-intermediate",
    "C1": "advanced",
    "C2": "proficient",
}

_TOPIC_DESC = {
    "travel": "travel and tourism",
    "work": "work and career",
    "family": "family and relationships",
    "food": "food and cooking",
    "culture": "culture and traditions",
    "free": "free conversation",
}
```

- [ ] **Step 3: Create Spanish prompt**

Create `language-tutor-platform/backend/prompts/spanish.py`:

```python
def build_system_prompt(level: str, topic: str) -> str:
    return f"""Eres un tutor de español paciente y animador que ayuda a hablantes de portugués/inglés a mejorar su español.

El nivel actual del estudiante es {level} ({_LEVEL_DESC[level]}).
Tema de hoy: {_TOPIC_DESC.get(topic, topic)}.

TU ROL:
- Habla en español a una velocidad y complejidad apropiada para el nivel {level}
- Después de cada respuesta del estudiante, corrige brevemente errores gramaticales o de vocabulario
- Formato de correcciones: "¡Casi! Se dice: [versión correcta] — porque [razón breve]"
- Haz preguntas de seguimiento para mantener la conversación
- Sé cálido, motivador y nunca hagas sentir vergüenza al estudiante

CORRECCIONES:
- Solo corrige 1-2 errores por turno
- Primero reconoce lo que dijeron correctamente
- Las correcciones deben ser breves (máximo 1 frase)

INICIO: Saluda al estudiante en español e introduce el tema de hoy."""

_LEVEL_DESC = {
    "A1": "principiante completo",
    "A2": "elemental",
    "B1": "intermedio",
    "B2": "intermedio-alto",
    "C1": "avanzado",
    "C2": "competente",
}

_TOPIC_DESC = {
    "travel": "viajes y turismo",
    "work": "trabajo y carrera",
    "family": "familia y relaciones",
    "food": "comida y cocina",
    "culture": "cultura y tradiciones",
    "free": "conversación libre",
}
```

- [ ] **Step 4: Create French prompt**

Create `language-tutor-platform/backend/prompts/french.py`:

```python
def build_system_prompt(level: str, topic: str) -> str:
    return f"""Tu es un tuteur de français patient et encourageant qui aide des locuteurs de portugais/anglais à améliorer leur français.

Le niveau actuel de l'étudiant est {level} ({_LEVEL_DESC[level]}).
Sujet du jour : {_TOPIC_DESC.get(topic, topic)}.

TON RÔLE :
- Parle en français à une vitesse et une complexité adaptées au niveau {level}
- Après chaque réponse de l'étudiant, corrige brièvement les erreurs de grammaire ou de vocabulaire
- Format des corrections : "Presque ! On dit : [version correcte] — parce que [raison brève]"
- Pose des questions de suivi pour maintenir la conversation
- Sois chaleureux, encourageant et ne fais jamais honte à l'étudiant

CORRECTIONS :
- Ne corrige que 1-2 erreurs par tour
- Reconnais d'abord ce qu'ils ont dit correctement
- Les corrections doivent être brèves (1 phrase maximum)

DÉBUT : Salue l'étudiant chaleureusement en français et présente le sujet du jour."""

_LEVEL_DESC = {
    "A1": "grand débutant",
    "A2": "élémentaire",
    "B1": "intermédiaire",
    "B2": "intermédiaire supérieur",
    "C1": "avancé",
    "C2": "maîtrise",
}

_TOPIC_DESC = {
    "travel": "voyages et tourisme",
    "work": "travail et carrière",
    "family": "famille et relations",
    "food": "nourriture et cuisine",
    "culture": "culture et traditions",
    "free": "conversation libre",
}
```

- [ ] **Step 5: Create Italian prompt**

Create `language-tutor-platform/backend/prompts/italian.py`:

```python
def build_system_prompt(level: str, topic: str) -> str:
    return f"""Sei un tutor di italiano paziente e incoraggiante che aiuta i parlanti di portoghese/inglese a migliorare il loro italiano.

Il livello attuale dello studente è {level} ({_LEVEL_DESC[level]}).
Argomento di oggi: {_TOPIC_DESC.get(topic, topic)}.

IL TUO RUOLO:
- Parla in italiano a una velocità e complessità appropriate per il livello {level}
- Dopo ogni risposta dello studente, correggi brevemente gli errori grammaticali o di vocabolario
- Formato delle correzioni: "Quasi! Si dice: [versione corretta] — perché [breve motivo]"
- Fai domande di follow-up per mantenere la conversazione
- Sii caloroso, incoraggiante e non far mai vergognare lo studente

CORREZIONI:
- Correggi solo 1-2 errori per turno
- Prima riconosci quello che hanno detto correttamente
- Le correzioni devono essere brevi (massimo 1 frase)

INIZIO: Saluta lo studente calorosamente in italiano e presenta l'argomento di oggi."""

_LEVEL_DESC = {
    "A1": "principiante assoluto",
    "A2": "elementare",
    "B1": "intermedio",
    "B2": "intermedio superiore",
    "C1": "avanzato",
    "C2": "padronanza",
}

_TOPIC_DESC = {
    "travel": "viaggi e turismo",
    "work": "lavoro e carriera",
    "family": "famiglia e relazioni",
    "food": "cibo e cucina",
    "culture": "cultura e tradizioni",
    "free": "conversazione libera",
}
```

- [ ] **Step 6: Commit**

```bash
cd ~/language-tutor-platform
git add backend/prompts/
git commit -m "feat: add system prompts for all 5 languages"
```

---

### Task 5: Update bot.py to be language-aware

**Files:**
- Create: `language-tutor-platform/backend/bot.py`

- [ ] **Step 1: Copy bot.py from old project**

```bash
cp ~/APP_falando_portugues/backend/bot.py \
   ~/language-tutor-platform/backend/bot.py
```

- [ ] **Step 2: Update run_bot signature to accept language**

Open `language-tutor-platform/backend/bot.py` and update the `run_bot` function signature and internals:

Find the `run_bot` function and replace its signature and prompt/STT setup:

```python
# At top of file, add:
import importlib
from languages import get_language_config

# Update run_bot signature:
async def run_bot(
    room_url: str,
    token: str,
    room_name: str,
    level: str,
    topic: str,
    voice_id: str,
    language: str = "portuguese",
) -> None:
    lang_config = get_language_config(language)

    # Load prompt dynamically
    prompt_module = importlib.import_module(lang_config.prompt_module)
    system_prompt = prompt_module.build_system_prompt(level, topic)

    # Use lang_config.deepgram_language for STT
    # Replace hardcoded language="pt" with:
    # language=lang_config.deepgram_language
```

Find the Deepgram STT initialization in `bot.py` and replace `language="pt"` with `language=lang_config.deepgram_language`.

Find where the system prompt is loaded and replace with `system_prompt` from the dynamic import above.

- [ ] **Step 3: Verify bot.py imports correctly**

```bash
cd ~/language-tutor-platform/backend
source .venv/bin/activate
python -c "from bot import run_bot; print('OK')"
```

Expected: `OK`

- [ ] **Step 4: Commit**

```bash
cd ~/language-tutor-platform
git add backend/bot.py
git commit -m "feat: make bot pipeline language-aware"
```

---

### Task 6: Update main.py with language parameter

**Files:**
- Create: `language-tutor-platform/backend/main.py`

- [ ] **Step 1: Copy main.py from old project**

```bash
cp ~/APP_falando_portugues/backend/main.py \
   ~/language-tutor-platform/backend/main.py
```

- [ ] **Step 2: Add language field to SessionRequest**

Open `language-tutor-platform/backend/main.py` and update `SessionRequest`:

```python
from languages import SUPPORTED_LANGUAGES

class SessionRequest(BaseModel):
    level: str = "B1"
    topic: str = "free"
    language: str = "portuguese"
    participant_name: str = Field(default="user", max_length=32)
    voice_id: str = _DEFAULT_VOICE_ID

    @field_validator("language")
    @classmethod
    def validate_language(cls, v: str) -> str:
        if v not in SUPPORTED_LANGUAGES:
            raise ValueError(f"language must be one of {SUPPORTED_LANGUAGES}")
        return v
```

- [ ] **Step 3: Pass language to _spawn_bot**

In `main.py`, update the `_spawn_bot` call inside `create_session`:

```python
asyncio.create_task(
    _spawn_bot(
        room_url=livekit_url,
        token=bot_token,
        room_name=room_name,
        level=req.level,
        topic=req.topic,
        voice_id=req.voice_id,
        language=req.language,
    )
)
```

Update `_spawn_bot` signature to accept and pass `language`:

```python
async def _spawn_bot(
    room_url: str,
    token: str,
    room_name: str,
    level: str,
    topic: str,
    voice_id: str = "DMcOknq8n1B6XshFIJKJ",
    language: str = "portuguese",
) -> None:
    _log = logging.getLogger("bot.spawn")
    try:
        from bot import run_bot
        _log.info("Starting bot room=%s level=%s topic=%s language=%s", room_name, level, topic, language)
        await run_bot(
            room_url=room_url,
            token=token,
            room_name=room_name,
            level=level,
            topic=topic,
            voice_id=voice_id,
            language=language,
        )
```

- [ ] **Step 4: Update required env vars to include per-language voice IDs**

In `main.py`, update `_REQUIRED_ENV_VARS`:

```python
_REQUIRED_ENV_VARS = [
    "ANTHROPIC_API_KEY",
    "DEEPGRAM_API_KEY",
    "ELEVENLABS_API_KEY",
    "LIVEKIT_URL",
    "LIVEKIT_API_KEY",
    "LIVEKIT_API_SECRET",
]

_VOICE_IDS = {
    "english": os.environ.get("ENGLISH_VOICE_ID", ""),
    "spanish": os.environ.get("SPANISH_VOICE_ID", ""),
    "portuguese": os.environ.get("PORTUGUESE_VOICE_ID", "DMcOknq8n1B6XshFIJKJ"),
    "french": os.environ.get("FRENCH_VOICE_ID", ""),
    "italian": os.environ.get("ITALIAN_VOICE_ID", ""),
}
```

- [ ] **Step 5: Verify main.py starts**

```bash
cd ~/language-tutor-platform/backend
source .venv/bin/activate
python -c "import main; print('OK')"
```

Expected: `OK` (may show missing env var warnings — that's fine without .env)

- [ ] **Step 6: Commit**

```bash
cd ~/language-tutor-platform
git add backend/main.py
git commit -m "feat: add language parameter to session endpoint"
```

---

### Task 7: Write session endpoint tests

**Files:**
- Create: `language-tutor-platform/backend/tests/test_session.py`

- [ ] **Step 1: Write failing tests**

Create `language-tutor-platform/backend/tests/test_session.py`:

```python
import pytest
from languages import get_language_config, SUPPORTED_LANGUAGES
import importlib

def test_all_prompts_have_build_system_prompt():
    for language in SUPPORTED_LANGUAGES:
        config = get_language_config(language)
        module = importlib.import_module(config.prompt_module)
        assert hasattr(module, "build_system_prompt"), \
            f"{language} prompt missing build_system_prompt"

def test_all_prompts_return_string():
    for language in SUPPORTED_LANGUAGES:
        config = get_language_config(language)
        module = importlib.import_module(config.prompt_module)
        result = module.build_system_prompt("B1", "free")
        assert isinstance(result, str), f"{language} prompt did not return string"
        assert len(result) > 100, f"{language} prompt too short"

def test_all_prompts_include_level():
    for language in SUPPORTED_LANGUAGES:
        config = get_language_config(language)
        module = importlib.import_module(config.prompt_module)
        result = module.build_system_prompt("B2", "travel")
        assert "B2" in result, f"{language} prompt missing level"

def test_session_request_validates_language():
    import sys
    sys.path.insert(0, ".")
    from pydantic import ValidationError
    # Import the model only — don't start the server
    from main import SessionRequest

    # Valid language
    req = SessionRequest(language="english")
    assert req.language == "english"

    # Invalid language raises
    with pytest.raises(ValidationError):
        SessionRequest(language="klingon")

def test_session_request_defaults_to_portuguese():
    from main import SessionRequest
    req = SessionRequest()
    assert req.language == "portuguese"
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd ~/language-tutor-platform/backend
source .venv/bin/activate
pytest tests/test_session.py -v
```

Expected: Some tests fail (missing modules or imports)

- [ ] **Step 3: Run tests after implementation**

```bash
pytest tests/ -v
```

Expected: All tests PASS.

- [ ] **Step 4: Commit**

```bash
cd ~/language-tutor-platform
git add backend/tests/test_session.py
git commit -m "test: add session and prompt coverage"
```

---

### Task 8: Create .env.example and Dockerfile

**Files:**
- Create: `language-tutor-platform/backend/.env.example`
- Create: `language-tutor-platform/backend/Dockerfile`
- Create: `language-tutor-platform/docker-compose.yml`

- [ ] **Step 1: Create .env.example**

Create `language-tutor-platform/backend/.env.example`:

```
ANTHROPIC_API_KEY=
DEEPGRAM_API_KEY=
ELEVENLABS_API_KEY=

# One ElevenLabs voice ID per language (PT-PT, ES, EN, FR, IT native voices)
PORTUGUESE_VOICE_ID=DMcOknq8n1B6XshFIJKJ
ENGLISH_VOICE_ID=
SPANISH_VOICE_ID=
FRENCH_VOICE_ID=
ITALIAN_VOICE_ID=

LIVEKIT_URL=
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=

# Security
APP_TOKEN=
ALLOWED_ORIGINS=*
DB_PATH=/data/tutor.db
```

- [ ] **Step 2: Create Dockerfile**

Create `language-tutor-platform/backend/Dockerfile`:

```dockerfile
FROM python:3.12-slim

WORKDIR /app

RUN useradd -r -u 1001 appuser

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p /data && chown appuser:appuser /data
USER appuser

ENV DB_PATH=/data/tutor.db

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

- [ ] **Step 3: Create docker-compose.yml**

Create `language-tutor-platform/docker-compose.yml`:

```yaml
services:
  backend:
    build: ./backend
    restart: unless-stopped
    ports:
      - "8000:8000"
    env_file:
      - ./backend/.env
    volumes:
      - db_data:/data

volumes:
  db_data:
```

- [ ] **Step 4: Commit**

```bash
cd ~/language-tutor-platform
git add backend/.env.example backend/Dockerfile docker-compose.yml
git commit -m "chore: add Docker config and env template"
```

---

### Task 9: Run full test suite and verify

- [ ] **Step 1: Run all backend tests**

```bash
cd ~/language-tutor-platform/backend
source .venv/bin/activate
pytest tests/ -v --tb=short
```

Expected output:
```
tests/test_languages.py::test_get_english_config PASSED
tests/test_languages.py::test_get_spanish_config PASSED
tests/test_languages.py::test_get_portuguese_config PASSED
tests/test_languages.py::test_get_french_config PASSED
tests/test_languages.py::test_get_italian_config PASSED
tests/test_languages.py::test_unsupported_language_raises PASSED
tests/test_languages.py::test_supported_languages_list PASSED
tests/test_session.py::test_all_prompts_have_build_system_prompt PASSED
tests/test_session.py::test_all_prompts_return_string PASSED
tests/test_session.py::test_all_prompts_include_level PASSED
tests/test_session.py::test_session_request_validates_language PASSED
tests/test_session.py::test_session_request_defaults_to_portuguese PASSED
```

- [ ] **Step 2: Final commit**

```bash
cd ~/language-tutor-platform
git add .
git commit -m "chore: plan 1 complete — language-aware backend ready"
```

---

## Summary

After Plan 1 is complete:
- `~/language-tutor-platform/` monorepo exists
- Backend serves all 5 languages from one server
- Each language has its own prompt, STT code, and voice config
- All tests pass
- Ready for Plan 2: Shared mobile library + Speaking English app
