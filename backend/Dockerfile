FROM python:3.12-slim

WORKDIR /app

RUN useradd -r -u 1001 appuser

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p /data && chown appuser:appuser /data

# Pipecat splits each tutor reply into sentences with NLTK before handing them to
# the speech synthesiser. The container runs as a system user created without a
# home directory, so NLTK could not write its tokenizer at runtime and the split
# silently mangled the text: the middle of every reply was dropped and the user
# heard only the opening words and the final syllable. Install the data at build
# time, as root, somewhere every user can read.
ENV NLTK_DATA=/usr/local/share/nltk_data
RUN python -m nltk.downloader -d $NLTK_DATA punkt punkt_tab \
 && chmod -R a+rX $NLTK_DATA

USER appuser

ENV DB_PATH=/data/falando.db

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
