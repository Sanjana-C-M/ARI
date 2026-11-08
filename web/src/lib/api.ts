// Client for the Ari backend. In development, Vite forwards /api and /audio to port 8000.

export interface AskResponse {
  status: 'found' | 'not_found';
  transcript: string;
  answer?: string | null;
  source?: string | null;
  audio_url?: string | null;
}

async function readJson(r: Response): Promise<AskResponse> {
  if (!r.ok) {
    let detail = '';
    try {
      const body = await r.json();
      detail = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail);
    } catch {
      detail = '';
    }
    throw new Error(`Server ${r.status}: ${detail}`);
  }
  return (await r.json()) as AskResponse;
}

export function askText(question: string): Promise<AskResponse> {
  return fetch('/api/ask/text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  }).then(readJson);
}

export function askAudio(wav: Blob): Promise<AskResponse> {
  const form = new FormData();
  form.append('audio', wav, 'question.wav');
  return fetch('/api/ask/audio', { method: 'POST', body: form }).then(readJson);
}
