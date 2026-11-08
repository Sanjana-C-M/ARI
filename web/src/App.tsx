/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Home,
  Mic,
  Moon,
  Pause,
  Play,
  RefreshCw,
  Send,
  Square,
  Sun,
  Terminal,
  Volume2,
} from 'lucide-react';
import GradientASCII from './components/GradientASCII';
import { askText, askAudio, type AskResponse } from './lib/api';
import { blobToWav } from './lib/audio';

type ThemeMode = 'light' | 'dark';
type NavTab = 'home' | 'ask' | 'about';
type VoiceState = 'idle' | 'recording' | 'recorded' | 'processing';
type AboutLang = 'en' | 'ta';

interface SampleItem {
  id: number;
  keywords: string[];
  question: string;
  answer: string;
  source: string;
}

interface AnswerResult {
  status: 'found' | 'not_found';
  question: string;
  answer?: string;
  source?: string;
  audioUrl?: string | null;
}

const SAMPLE_DATA: SampleItem[] = [
  { id: 1, keywords: [], question: 'விரல் நெட்டி முறிச்சா மூட்டுவலி வருமா?', answer: '', source: '' },
  { id: 2, keywords: [], question: 'சவரம் பண்ணா முடி அடர்த்தியா வளருமா?', answer: '', source: '' },
  { id: 3, keywords: [], question: 'மூளையில 10 சதவீதம்தான் பயன்படுத்துவோமா?', answer: '', source: '' },
  { id: 4, keywords: [], question: 'மின்னல் ஒரே இடத்தில் இரண்டு முறை தாக்குமா?', answer: '', source: '' },
  { id: 5, keywords: [], question: 'தங்க மீன்களுக்கு நினைவாற்றல் இருக்குமா?', answer: '', source: '' },
  { id: 6, keywords: [], question: 'சர்க்கரை சாப்பிட்டா குழந்தைகள் துறுதுறுன்னு ஆவாங்களா?', answer: '', source: '' },
  { id: 7, keywords: [], question: 'கோடையில சூரியனுக்கு பக்கத்துல பூமி வருமா?', answer: '', source: '' },
  { id: 8, keywords: [], question: 'கேரட் சாப்பிட்டா கண் பார்வை கூர்மையா இருக்குமா?', answer: '', source: '' },
  { id: 9, keywords: [], question: 'மைக்ரோவேவ்ல சூடு பண்ணா உணவு கதிரியக்கமாகுமா?', answer: '', source: '' },
  { id: 10, keywords: [], question: 'திருக்குறள்ல எத்தனை குறள் இருக்கு?', answer: '', source: '' },
  { id: 11, keywords: [], question: 'தஞ்சை பெரிய கோவில் யார் கட்டினது?', answer: '', source: '' },
  { id: 12, keywords: [], question: 'பொங்கல் எத்தனை நாள் பண்டிகை?', answer: '', source: '' },
];

const ABOUT_POINTS_EN: string[] = [
  'Ari is a Tamil voice guide. You ask a question out loud in Tamil, and Ari answers with a short, checked answer, and tells you where the answer came from.',
  'Ari is built for people who prefer speaking to typing, for students who want reliable science answers in Tamil, and for anyone who has come across a myth on social media and wants to check it.',
  'Every answer comes from a verified source, and when Ari doesn’t know something, it says so instead of guessing.',
  'Built on Gnani AI’s voice models: Prisma listens to a question spoken in Tamil and turns it into text, Ari finds the matching verified answer, and Timbre speaks it back so the whole experience works in Tamil from start to finish.',
];

const ABOUT_POINTS_TA: string[] = [
  'ஒரு தமிழ் குரல் வழிகாட்டி. தமிழில் சத்தமாக ஒரு கேள்வி கேளுங்கள், Ari சுருக்கமான, சரிபார்க்கப்பட்ட பதில் சொல்லும். அந்த பதில் எங்கிருந்து வந்தது என்பதையும் சொல்லும்.',
  'பேசுவது எளிதாக இருப்பவர்களுக்கும், பள்ளி மாணவர்களுக்கு நம்பகமான அறிவியல் பதில்கள் வேண்டுமென்பவர்களுக்கும், சமூக வலைதளங்களில் பார்த்த ஒரு நம்பிக்கை உண்மையா என்று சரிபார்க்க விரும்புபவர்களுக்கும் Ari உதவுகிறது.',
  'ஒவ்வொரு பதிலுக்கும் ஒரு நம்பகமான மூலம் உண்டு. Ari-க்கு தெரியாத கேள்விக்கு யூகிக்காமல், தெரியவில்லை என்று நேர்மையாகச் சொல்லும்.',
  'Ari, Gnani AI-யின் குரல் மாடல்களின் மேல் உருவாக்கப்பட்டது: Prisma மாடல் பேசப்பட்ட தமிழ் கேள்வியை எழுத்தாக மாற்றுகிறது, Ari சரிபார்க்கப்பட்ட பதிலைத் தேடுகிறது, Timbre மாடல் அதைத் தமிழில் பேசுகிறது—இதனால் முழு அனுபவமும் தமிழிலேயே நடக்கிறது.',
];

const TAMIL_CHARACTERS = ' ·இஉஎகசதநபமயரவழளறஅஆஐஔ';
const DARK_ASCII_COLORS = ['#043b22', '#10b981', '#39ff14', '#d9f99d'];
const LIGHT_ASCII_COLORS = ['#0c4a6e', '#0284c7', '#00b8d9', '#7dd3fc'];
const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

const MOCK_AUDIO_DURATION_MS = 5200;
const SAMPLE_BATCH_SIZE = 3;
const SAMPLE_ALTERNATE_DELAY_MS = 6500;

function shuffleItems<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function splitTamilGraphemes(text: string): string[] {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const segmenter = new Intl.Segmenter('ta', { granularity: 'grapheme' });
    return Array.from(segmenter.segment(text), (seg) => seg.segment);
  }
  return Array.from(text);
}

function formatDuration(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function App() {
  // Session-only state (no localStorage)
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [isBrandHovered, setIsBrandHovered] = useState<boolean>(false);
  const [aboutLang, setAboutLang] = useState<AboutLang>('en');

  // Ask screen states
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [inputText, setInputText] = useState<string>('');
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [typedAnswer, setTypedAnswer] = useState<string>('');
  const [isTypingAnswer, setIsTypingAnswer] = useState<boolean>(false);
  const [spinnerIdx, setSpinnerIdx] = useState<number>(0);

  // Alternating & shuffled Sample Questions state in Ask section
  const sampleDeckRef = useRef<SampleItem[]>(shuffleItems(SAMPLE_DATA));
  const sampleDeckCursorRef = useRef<number>(SAMPLE_BATCH_SIZE);
  const [displayedSamples, setDisplayedSamples] = useState<SampleItem[]>(() =>
    sampleDeckRef.current.slice(0, SAMPLE_BATCH_SIZE)
  );
  const [typedSamples, setTypedSamples] = useState<string[]>(['', '', '']);
  const [activeSampleTypingIdx, setActiveSampleTypingIdx] =
    useState<number>(-1);
  const isSampleHoverPausedRef = useRef<boolean>(false);
  const voiceStateRef = useRef<VoiceState>('idle');

  // Voice playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playProgress, setPlayProgress] = useState<number>(0);

  const [prefersReducedMotion, setPrefersReducedMotion] =
    useState<boolean>(false);

  const recordingDurationTimerRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const isRecordingActiveRef = useRef<boolean>(false);
  const autoSendOnStopRef = useRef<boolean>(false);

  const processingTimerRef = useRef<number | null>(null);
  const answerTypingTimerRef = useRef<number | null>(null);
  const sampleTypingTimerRef = useRef<number | null>(null);
  const sampleRotateTimerRef = useRef<number | null>(null);
  const voiceSamplePoolRef = useRef<SampleItem[]>(shuffleItems(SAMPLE_DATA));
  const sampleCursorRef = useRef<number>(0);

  const audioRafRef = useRef<number | null>(null);
  const playStartTimestampRef = useRef<number | null>(null);
  const accumulatedMsRef = useRef<number>(0);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    voiceStateRef.current = voiceState;
  }, [voiceState]);

  const rotateSampleQuestions = () => {
    setDisplayedSamples((prev) => {
      const prevIds = new Set(prev.map((item) => item.id));
      let nextBatch: SampleItem[] = [];

      if (
        sampleDeckCursorRef.current + SAMPLE_BATCH_SIZE <=
        sampleDeckRef.current.length
      ) {
        nextBatch = sampleDeckRef.current.slice(
          sampleDeckCursorRef.current,
          sampleDeckCursorRef.current + SAMPLE_BATCH_SIZE
        );
        sampleDeckCursorRef.current += SAMPLE_BATCH_SIZE;
      } else {
        // Reshuffle full 14-item pool, placing non-overlapping items first so consecutive sets always differ
        const fresh = shuffleItems(SAMPLE_DATA);
        const nonOverlapping = fresh.filter((item) => !prevIds.has(item.id));
        const overlapping = fresh.filter((item) => prevIds.has(item.id));
        sampleDeckRef.current = [...nonOverlapping, ...overlapping];
        nextBatch = sampleDeckRef.current.slice(0, SAMPLE_BATCH_SIZE);
        sampleDeckCursorRef.current = SAMPLE_BATCH_SIZE;
      }

      return nextBatch;
    });
  };

  // Sync theme class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Listen to prefers-reduced-motion
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Terminal Braille Spinner during recording/processing
  useEffect(() => {
    if (
      (voiceState !== 'recording' && voiceState !== 'processing') ||
      prefersReducedMotion
    ) {
      return;
    }
    const id = window.setInterval(() => {
      setSpinnerIdx((prev) => (prev + 1) % SPINNER_FRAMES.length);
    }, 95);
    return () => window.clearInterval(id);
  }, [voiceState, prefersReducedMotion]);

  // Typewriter animation + automatic alternation for displayed sample questions
  useEffect(() => {
    if (sampleTypingTimerRef.current !== null) {
      window.clearInterval(sampleTypingTimerRef.current);
      sampleTypingTimerRef.current = null;
    }
    if (sampleRotateTimerRef.current !== null) {
      window.clearTimeout(sampleRotateTimerRef.current);
      sampleRotateTimerRef.current = null;
    }

    if (activeTab !== 'ask') return;

    const scheduleNextRotation = (delayMs: number) => {
      if (sampleRotateTimerRef.current !== null) {
        window.clearTimeout(sampleRotateTimerRef.current);
      }
      sampleRotateTimerRef.current = window.setTimeout(() => {
        if (
          isSampleHoverPausedRef.current ||
          voiceStateRef.current !== 'idle'
        ) {
          scheduleNextRotation(2000);
          return;
        }
        rotateSampleQuestions();
      }, delayMs);
    };

    if (prefersReducedMotion) {
      setTypedSamples(displayedSamples.map((d) => d.question));
      setActiveSampleTypingIdx(-1);
      scheduleNextRotation(SAMPLE_ALTERNATE_DELAY_MS + 1500);
      return () => {
        if (sampleRotateTimerRef.current !== null) {
          window.clearTimeout(sampleRotateTimerRef.current);
          sampleRotateTimerRef.current = null;
        }
      };
    }

    const segmentedList = displayedSamples.map((d) =>
      splitTamilGraphemes(d.question)
    );
    let qIdx = 0;
    let charIdx = 0;
    setTypedSamples(['', '', '']);
    setActiveSampleTypingIdx(0);

    sampleTypingTimerRef.current = window.setInterval(() => {
      charIdx += 1;
      const currentGraphemes = segmentedList[qIdx];
      const nextSlice = currentGraphemes.slice(0, charIdx).join('');

      setTypedSamples((prev) => {
        const copy = [...prev];
        copy[qIdx] = nextSlice;
        return copy;
      });

      if (charIdx >= currentGraphemes.length) {
        qIdx += 1;
        charIdx = 0;
        if (qIdx >= segmentedList.length) {
          if (sampleTypingTimerRef.current !== null) {
            window.clearInterval(sampleTypingTimerRef.current);
            sampleTypingTimerRef.current = null;
          }
          setActiveSampleTypingIdx(-1);
          scheduleNextRotation(SAMPLE_ALTERNATE_DELAY_MS);
        } else {
          setActiveSampleTypingIdx(qIdx);
        }
      }
    }, 24);

    return () => {
      if (sampleTypingTimerRef.current !== null) {
        window.clearInterval(sampleTypingTimerRef.current);
        sampleTypingTimerRef.current = null;
      }
      if (sampleRotateTimerRef.current !== null) {
        window.clearTimeout(sampleRotateTimerRef.current);
        sampleRotateTimerRef.current = null;
      }
    };
  }, [activeTab, displayedSamples, prefersReducedMotion]);

  const stopMediaCaptureResources = () => {
    isRecordingActiveRef.current = false;
    autoSendOnStopRef.current = false;
    if (recordingDurationTimerRef.current !== null) {
      window.clearInterval(recordingDurationTimerRef.current);
      recordingDurationTimerRef.current = null;
    }
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const clearAskTimers = () => {
    stopMediaCaptureResources();
    if (processingTimerRef.current !== null) {
      window.clearTimeout(processingTimerRef.current);
      processingTimerRef.current = null;
    }
    if (answerTypingTimerRef.current !== null) {
      window.clearInterval(answerTypingTimerRef.current);
      answerTypingTimerRef.current = null;
    }
  };

  const resetAudioPlayback = () => {
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current = null;
    }
    if (audioRafRef.current !== null) {
      window.cancelAnimationFrame(audioRafRef.current);
      audioRafRef.current = null;
    }
    setIsPlaying(false);
    setPlayProgress(0);
    playStartTimestampRef.current = null;
    accumulatedMsRef.current = 0;
  };

  useEffect(() => {
    return () => {
      clearAskTimers();
      if (sampleTypingTimerRef.current !== null) {
        window.clearInterval(sampleTypingTimerRef.current);
      }
      if (sampleRotateTimerRef.current !== null) {
        window.clearTimeout(sampleRotateTimerRef.current);
      }
      if (audioRafRef.current !== null) {
        window.cancelAnimationFrame(audioRafRef.current);
      }
    };
  }, []);

  const startAnswerTyping = (fullAnswer: string) => {
    if (answerTypingTimerRef.current !== null) {
      window.clearInterval(answerTypingTimerRef.current);
      answerTypingTimerRef.current = null;
    }

    const graphemes = splitTamilGraphemes(fullAnswer);
    const delay = prefersReducedMotion ? 10 : 24;
    let idx = 0;
    setTypedAnswer('');
    setIsTypingAnswer(true);

    answerTypingTimerRef.current = window.setInterval(() => {
      idx += 1;
      setTypedAnswer(graphemes.slice(0, idx).join(''));
      if (idx >= graphemes.length) {
        if (answerTypingTimerRef.current !== null) {
          window.clearInterval(answerTypingTimerRef.current);
          answerTypingTimerRef.current = null;
        }
        setIsTypingAnswer(false);
      }
    }, delay);
  };

  const startVoicePlayback = (url: string) => {
    resetAudioPlayback();
    const el = new Audio(url);
    audioElRef.current = el;
    el.ontimeupdate = () => {
      if (el.duration && isFinite(el.duration)) {
        setPlayProgress((el.currentTime / el.duration) * 100);
      }
    };
    el.onended = () => {
      setIsPlaying(false);
      setPlayProgress(100);
    };
    el.onerror = () => setIsPlaying(false);
    setIsPlaying(true);
    el.play().catch(() => setIsPlaying(false));
  };

  const applyAnswer = (data: AskResponse, fallbackQuestion: string) => {
    const question = data.transcript || fallbackQuestion;
    if (data.status === 'found' && data.answer) {
      setResult({
        status: 'found',
        question,
        answer: data.answer,
        source: data.source ?? undefined,
        audioUrl: data.audio_url ?? null,
      });
      startAnswerTyping(data.answer);
      if (data.audio_url) {
        startVoicePlayback(data.audio_url);
      }
    } else {
      setTypedAnswer('');
      setResult({ status: 'not_found', question });
    }
  };

  async function handleQuestion(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;

    clearAskTimers();
    resetAudioPlayback();
    setRecordedAudioBlob(null);
    setRecordingSeconds(0);
    setActiveTab('ask');
    setVoiceState('processing');
    setIsTypingAnswer(false);

    try {
      const data = await askText(trimmed);
      applyAnswer(data, trimmed);
    } catch (err) {
      console.error('Ask failed:', err);
      setTypedAnswer('');
      setResult({ status: 'not_found', question: trimmed });
    } finally {
      setVoiceState('idle');
    }
  }

  function sendRecording(blobOverride?: Blob | null) {
    if (voiceState === 'processing') return;

    // Send pressed while still recording: stop first, then send automatically
    if (voiceState === 'recording' && !blobOverride) {
      autoSendOnStopRef.current = true;
      stopRecording();
      return;
    }

    const audioPayload = blobOverride ?? recordedAudioBlob;
    if (!audioPayload) return;

    clearAskTimers();
    resetAudioPlayback();
    setActiveTab('ask');
    setRecordedAudioBlob(null);
    setRecordingSeconds(0);
    setVoiceState('processing');

    (async () => {
      try {
        const wav = await blobToWav(audioPayload);
        const data = await askAudio(wav);
        applyAnswer(data, '');
      } catch (err) {
        console.error('Voice question failed:', err);
        setTypedAnswer('');
        setResult({ status: 'not_found', question: '' });
      } finally {
        setVoiceState('idle');
      }
    })();
  }

  function stopRecording() {
    if (voiceState !== 'recording') return;

    isRecordingActiveRef.current = false;
    if (recordingDurationTimerRef.current !== null) {
      window.clearInterval(recordingDurationTimerRef.current);
      recordingDurationTimerRef.current = null;
    }

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
      mediaRecorderRef.current = null;
      return;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    const fallbackBlob = new Blob(audioChunksRef.current, {
      type: 'audio/webm',
    });
    setRecordedAudioBlob(fallbackBlob);

    if (autoSendOnStopRef.current) {
      autoSendOnStopRef.current = false;
      sendRecording(fallbackBlob);
    } else {
      setVoiceState('recorded');
    }
  }

  async function startRecording() {
    if (voiceState === 'processing' || voiceState === 'recording') return;

    clearAskTimers();
    resetAudioPlayback();
    audioChunksRef.current = [];
    setRecordedAudioBlob(null);
    setRecordingSeconds(0);
    setActiveTab('ask');
    setVoiceState('recording');
    isRecordingActiveRef.current = true;

    recordingDurationTimerRef.current = window.setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);

    if (
      typeof navigator !== 'undefined' &&
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function' &&
      typeof MediaRecorder !== 'undefined'
    ) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        if (!isRecordingActiveRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        mediaStreamRef.current = stream;
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (event: BlobEvent) => {
          if (event.data && event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        recorder.onstop = () => {
          if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach((track) => track.stop());
            mediaStreamRef.current = null;
          }
          const capturedBlob = new Blob(audioChunksRef.current, {
            type: recorder.mimeType || 'audio/webm',
          });
          setRecordedAudioBlob(capturedBlob);

          if (autoSendOnStopRef.current) {
            autoSendOnStopRef.current = false;
            sendRecording(capturedBlob);
          } else {
            setVoiceState('recorded');
          }
        };

        recorder.start(250);
      } catch {
        // Fallback smoothly if mic permission is denied or blocked in iframe preview
      }
    }
  }

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inputText.trim() || voiceState === 'processing') return;
    const query = inputText;
    setInputText('');
    handleQuestion(query);
  };

  const togglePlayMockAudio = () => {
    const el = audioElRef.current;
    if (!result || result.status !== 'found' || !el) return;

    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
      return;
    }
    if (el.ended) {
      el.currentTime = 0;
    }
    el.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
  };

  const handleAboutPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (prefersReducedMotion) return;
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width - 0.5;
    const relY = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.setProperty('--rx', `${(-relY * 4.5).toFixed(2)}deg`);
    el.style.setProperty('--ry', `${(relX * 4.5).toFixed(2)}deg`);
  };

  const handleAboutPointerLeave = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
  };

  const switchTab = (tab: NavTab) => {
    if (tab !== 'ask') {
      clearAskTimers();
      resetAudioPlayback();
      setRecordedAudioBlob(null);
      setRecordingSeconds(0);
      setVoiceState('idle');
    } else if (activeTab !== 'ask') {
      rotateSampleQuestions();
    }
    setIsBrandHovered(false);
    setActiveTab(tab);
  };

  const aboutPoints = aboutLang === 'en' ? ABOUT_POINTS_EN : ABOUT_POINTS_TA;

  // Build ASCII progress bar for terminal output (20 blocks wide)
  const filledBlocks = Math.round((playProgress / 100) * 18);
  const asciiBar = `${'█'.repeat(filledBlocks)}${'░'.repeat(
    Math.max(0, 18 - filledBlocks)
  )}`;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-white text-slate-900 dark:bg-black dark:text-gray-200 theme-transition font-en selection:bg-[#00B8D9]/25 dark:selection:bg-[#39FF14]/25 flex flex-col">
      {/* React Bits WebGL2 GradientASCII Background with Tamil Characters & Slow Velocity */}
      <div
        className={`fixed inset-0 z-0 transition-opacity duration-500 ${
          activeTab === 'home' ? 'opacity-100' : 'opacity-40 pointer-events-none'
        }`}
      >
        <GradientASCII
          colors={theme === 'dark' ? DARK_ASCII_COLORS : LIGHT_ASCII_COLORS}
          shape="horizon"
          characters={TAMIL_CHARACTERS}
          fontFamily='"Noto Sans Tamil", sans-serif'
          cellSize={22}
          density={0.82}
          glyphOpacity={0.88}
          glow={0.28}
          flicker={0.1}
          softness={0.55}
          flow={0.32}
          speed={0.22}
          gradientOpacity={0.88}
          grain={0.05}
          scrambleRadius={0.11}
          clickEffect="wave"
          lightMode={theme === 'light'}
        />
      </div>

      {/* Fitted Top Navigation Bar (with thin neon cyan border in Light mode) */}
      <header className="sticky top-0 z-30 pt-4 px-4 flex justify-center pointer-events-none">
        <nav
          aria-label="Primary navigation"
          className="neon-box pointer-events-auto w-fit inline-flex items-center gap-1 p-1.5 rounded-2xl bg-white/92 dark:bg-zinc-950/90 backdrop-blur-md"
        >
          <button
            type="button"
            onClick={() => switchTab('home')}
            aria-label="Home"
            aria-current={activeTab === 'home' ? 'page' : undefined}
            className={`min-h-[40px] min-w-[42px] px-3 py-1.5 rounded-xl flex items-center justify-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00B8D9] dark:focus-visible:ring-[#39FF14] cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'home'
                ? 'bg-[#00B8D9] dark:bg-[#39FF14] text-slate-950 dark:text-black font-bold shadow-xs'
                : 'text-slate-700 dark:text-gray-300 hover:bg-cyan-50 dark:hover:bg-zinc-900'
            }`}
          >
            <Home className="w-4 h-4" strokeWidth={2.3} aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => switchTab('ask')}
            aria-current={activeTab === 'ask' ? 'page' : undefined}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00B8D9] dark:focus-visible:ring-[#39FF14] cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'ask'
                ? 'bg-[#00B8D9] dark:bg-[#39FF14] text-slate-950 dark:text-black font-bold shadow-xs'
                : 'text-slate-700 dark:text-gray-300 hover:bg-cyan-50 dark:hover:bg-zinc-900'
            }`}
          >
            Ask
          </button>

          <button
            type="button"
            onClick={() => switchTab('about')}
            aria-current={activeTab === 'about' ? 'page' : undefined}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00B8D9] dark:focus-visible:ring-[#39FF14] cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'about'
                ? 'bg-[#00B8D9] dark:bg-[#39FF14] text-slate-950 dark:text-black font-bold shadow-xs'
                : 'text-slate-700 dark:text-gray-300 hover:bg-cyan-50 dark:hover:bg-zinc-900'
            }`}
          >
            About
          </button>

          <span
            aria-hidden="true"
            className="w-px h-4 bg-[#00D2F5]/45 dark:bg-zinc-800 mx-0.5"
          />

          <button
            type="button"
            onClick={() =>
              setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
            }
            aria-label={
              theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'
            }
            className="min-h-[40px] min-w-[40px] px-2.5 py-1.5 rounded-xl text-slate-700 dark:text-[#39FF14] hover:bg-cyan-50 dark:hover:bg-zinc-900 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00B8D9] dark:focus-visible:ring-[#39FF14] cursor-pointer shrink-0"
          >
            {theme === 'light' ? (
              <Moon className="w-4 h-4 text-[#007B94]" aria-hidden="true" />
            ) : (
              <Sun className="w-4 h-4 text-[#39FF14]" aria-hidden="true" />
            )}
          </button>
        </nav>
      </header>

      {/* TAB 1: HOME PAGE */}
      {activeTab === 'home' && (
        <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pb-16 pointer-events-none">
          <div className="relative flex flex-col items-center gap-4">
            <div
              aria-hidden="true"
              className="absolute -inset-10 rounded-full bg-white/80 dark:bg-black/75 blur-2xl pointer-events-none"
            />

            {/* Hover-only Fairytale App Name ("Ari" -> Calligraphic Tamil "அறி") in Background Gradient */}
            <div
              onPointerEnter={() => setIsBrandHovered(true)}
              onPointerLeave={() => setIsBrandHovered(false)}
              onFocus={() => setIsBrandHovered(true)}
              onBlur={() => setIsBrandHovered(false)}
              tabIndex={0}
              role="heading"
              aria-level={1}
              aria-label="Ari — அறி"
              className="pointer-events-auto relative z-10 w-[280px] sm:w-[360px] h-[124px] sm:h-[148px] flex items-center justify-center rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00B8D9] dark:focus-visible:ring-[#39FF14] cursor-pointer select-none"
            >
              <span
                aria-hidden={isBrandHovered}
                className={`absolute inset-0 flex items-center justify-center font-fairytale text-6xl sm:text-7xl md:text-8xl font-normal tracking-wide drop-shadow-[0_2px_18px_rgba(255,255,255,0.95)] dark:drop-shadow-[0_0_28px_rgba(57,255,20,0.38)] brand-word-layer ${
                  isBrandHovered ? 'brand-word-hidden-up' : 'brand-word-visible'
                }`}
              >
                <span className="brand-gradient-text px-4 py-2 leading-normal">
                  Ari
                </span>
              </span>

              <span
                lang="ta"
                aria-hidden={!isBrandHovered}
                className={`absolute inset-0 flex items-center justify-center font-tamil-fairytale text-6xl sm:text-7xl md:text-8xl font-normal tracking-wide drop-shadow-[0_4px_24px_rgba(0,184,217,0.3)] dark:drop-shadow-[0_0_32px_rgba(57,255,20,0.5)] brand-word-layer ${
                  isBrandHovered
                    ? 'brand-word-visible'
                    : 'brand-word-hidden-down'
                }`}
              >
                <span className="brand-gradient-text px-4 py-3 leading-normal">
                  அறி
                </span>
              </span>
            </div>

            {/* Moving Tagline in the same Fairytale font & Background Gradient */}
            <div
              aria-label="Debunk myths. Discover Tamil heritage."
              className="pointer-events-auto relative z-10 w-[290px] sm:w-[420px] md:w-[480px] overflow-hidden py-1.5 tagline-mask"
            >
              {prefersReducedMotion ? (
                <p className="font-fairytale text-center text-base sm:text-lg font-normal tracking-wide">
                  <span className="brand-gradient-text px-2 py-0.5">
                    Debunk myths. Discover Tamil heritage.
                  </span>
                </p>
              ) : (
                <div aria-hidden="true" className="animate-tagline-move">
                  <div className="font-fairytale flex items-center gap-5 pr-5 text-base sm:text-lg font-normal tracking-wide whitespace-nowrap">
                    <span className="brand-gradient-text px-1 py-0.5">
                      Debunk myths. Discover Tamil heritage.
                    </span>
                    <span className="text-[#00B8D9] dark:text-[#39FF14]">·</span>
                    <span className="brand-gradient-text px-1 py-0.5">
                      Debunk myths. Discover Tamil heritage.
                    </span>
                    <span className="text-[#00B8D9] dark:text-[#39FF14]">·</span>
                  </div>
                  <div className="font-fairytale flex items-center gap-5 pr-5 text-base sm:text-lg font-normal tracking-wide whitespace-nowrap">
                    <span className="brand-gradient-text px-1 py-0.5">
                      Debunk myths. Discover Tamil heritage.
                    </span>
                    <span className="text-[#00B8D9] dark:text-[#39FF14]">·</span>
                    <span className="brand-gradient-text px-1 py-0.5">
                      Debunk myths. Discover Tamil heritage.
                    </span>
                    <span className="text-[#00B8D9] dark:text-[#39FF14]">·</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      )}

      {/* TAB 2: ASK SECTION (Input & Terminal Output Side-by-Side) */}
      {activeTab === 'ask' && (
        <main className="relative z-10 flex-1 mx-auto w-full max-w-6xl px-4 sm:px-8 pt-8 pb-14 flex items-center">
          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-7 items-stretch">
            {/* LEFT COLUMN: Input Box */}
            <section
              aria-label="Ask a question"
              className="neon-box min-h-[420px] md:min-h-[465px] p-6 sm:p-8 rounded-3xl bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md flex flex-col justify-between gap-6"
            >
              <div className="flex flex-col items-center gap-5 pt-1">
                {/* Mic + Stop Recording + Send Recording Controls */}
                <div className="w-full flex flex-col items-center gap-3">
                  <div className="flex items-center justify-center gap-3 sm:gap-3.5">
                    {/* Mic Button */}
                    <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                      {voiceState === 'idle' && (
                        <span
                          aria-hidden="true"
                          className="absolute inset-0 rounded-full border border-[#00D2F5] dark:border-[#39FF14] animate-mic-ring pointer-events-none"
                        />
                      )}

                      {voiceState === 'processing' && (
                        <svg
                          viewBox="0 0 64 64"
                          aria-hidden="true"
                          className="absolute inset-0 w-full h-full animate-ring-rotate pointer-events-none"
                        >
                          <circle
                            cx="32"
                            cy="32"
                            r="29"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeDasharray="48 145"
                            className="text-[#00B8D9] dark:text-[#39FF14]"
                          />
                        </svg>
                      )}

                      <button
                        type="button"
                        onClick={startRecording}
                        disabled={
                          voiceState === 'recording' ||
                          voiceState === 'processing'
                        }
                        aria-label={
                          voiceState === 'recording'
                            ? 'Recording in progress'
                            : voiceState === 'processing'
                              ? 'Checking answer'
                              : voiceState === 'recorded'
                                ? 'Record again'
                                : 'Tap to begin voice question'
                        }
                        className={`relative z-10 w-[52px] h-[52px] rounded-full flex items-center justify-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-white ${
                          voiceState === 'idle' || voiceState === 'recorded'
                            ? 'bg-[#00B8D9] dark:bg-[#39FF14] text-slate-950 dark:text-black shadow-[0_5px_16px_rgba(0,184,217,0.38)] dark:shadow-[0_0_18px_rgba(57,255,20,0.45)] hover:scale-105 cursor-pointer'
                            : voiceState === 'recording'
                              ? 'bg-slate-900 dark:bg-black border-2 border-[#00D2F5] dark:border-[#39FF14] text-[#00D2F5] dark:text-[#39FF14] cursor-default'
                              : 'bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-gray-300 cursor-wait'
                        }`}
                      >
                        {voiceState === 'recording' ? (
                          <div
                            aria-hidden="true"
                            className="flex items-center justify-center gap-1 h-4"
                          >
                            <span className="w-1 h-4 rounded-full bg-current wave-bar wave-delay-1" />
                            <span className="w-1 h-4 rounded-full bg-current wave-bar wave-delay-2" />
                            <span className="w-1 h-4 rounded-full bg-current wave-bar wave-delay-3" />
                            <span className="w-1 h-4 rounded-full bg-current wave-bar wave-delay-5" />
                          </div>
                        ) : (
                          <Mic
                            className="w-5 h-5"
                            strokeWidth={2.3}
                            aria-hidden="true"
                          />
                        )}
                      </button>
                    </div>

                    {/* Stop Recording Button (on the right of Mic) */}
                    <button
                      type="button"
                      onClick={stopRecording}
                      disabled={voiceState !== 'recording'}
                      aria-label="Stop recording"
                      className={`min-h-[48px] px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00B8D9] dark:focus-visible:ring-[#39FF14] whitespace-nowrap shrink-0 ${
                        voiceState === 'recording'
                          ? 'bg-rose-500/15 dark:bg-rose-500/20 border border-rose-500 dark:border-rose-400 text-rose-700 dark:text-rose-300 hover:bg-rose-500/25 active:scale-95 cursor-pointer shadow-[0_0_14px_rgba(244,63,94,0.22)]'
                          : 'neon-subbox bg-slate-100/70 dark:bg-zinc-900/70 text-slate-500 dark:text-gray-500 opacity-45 cursor-not-allowed'
                      }`}
                    >
                      <Square
                        className="w-3.5 h-3.5 fill-current"
                        aria-hidden="true"
                      />
                      <span>Stop</span>
                    </button>

                    {/* Send Recording Button (sends voice recording to backend) */}
                    <button
                      type="button"
                      onClick={() => sendRecording()}
                      disabled={
                        voiceState !== 'recorded' && voiceState !== 'recording'
                      }
                      aria-label="Send voice recording"
                      className="min-h-[48px] px-4.5 py-2.5 rounded-xl bg-[#00B8D9] dark:bg-[#39FF14] text-slate-950 dark:text-black font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 hover:opacity-90 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-white disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <span>Send</span>
                      <Send className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>

                  <span
                    aria-live="polite"
                    className="text-xs sm:text-[13px] font-semibold text-slate-700 dark:text-gray-300 tabular-nums"
                  >
                    {voiceState === 'recording'
                      ? `Listening... (${formatDuration(recordingSeconds)})`
                      : voiceState === 'recorded'
                        ? `Recording ready (${formatDuration(recordingSeconds)}) — tap Send`
                        : voiceState === 'processing'
                          ? 'Checking...'
                          : 'Tap to begin'}
                  </span>
                </div>

                {/* Small Text Box to Type and Send */}
                <form
                  onSubmit={handleFormSubmit}
                  className="w-full flex items-center gap-2.5"
                >
                  <label htmlFor="ask-small-input" className="sr-only">
                    Type your question
                  </label>
                  <input
                    id="ask-small-input"
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    disabled={voiceState === 'processing'}
                    placeholder="Or type a question..."
                    className="neon-subbox flex-1 min-h-[48px] px-4 py-2.5 rounded-xl bg-white dark:bg-black text-slate-950 dark:text-gray-100 placeholder:text-slate-500 dark:placeholder:text-gray-400 text-xs sm:text-sm focus:outline-none focus:border-[#00B8D9] dark:focus:border-[#39FF14] disabled:opacity-60"
                  />
                  <button
                    type="submit"
                    disabled={voiceState === 'processing' || !inputText.trim()}
                    aria-label="Send"
                    className="min-h-[48px] px-4.5 py-2.5 rounded-xl bg-[#00B8D9] dark:bg-[#39FF14] text-slate-950 dark:text-black font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 hover:opacity-90 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-white disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <span>Send</span>
                    <Send className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </form>
              </div>

              {/* Alternating Sample Questions Underneath with Typing Animations */}
              <div
                onPointerEnter={() => {
                  isSampleHoverPausedRef.current = true;
                }}
                onPointerLeave={() => {
                  isSampleHoverPausedRef.current = false;
                }}
                onFocusCapture={() => {
                  isSampleHoverPausedRef.current = true;
                }}
                onBlurCapture={() => {
                  isSampleHoverPausedRef.current = false;
                }}
                className="w-full pt-4 border-t border-[#00D2F5]/35 dark:border-zinc-800 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-600 dark:text-gray-400">
                    Sample questions
                  </p>
                  <button
                    type="button"
                    onClick={rotateSampleQuestions}
                    disabled={voiceState === 'processing'}
                    aria-label="Show another set of sample questions"
                    title="More questions"
                    className="p-1.5 rounded-lg text-slate-500 dark:text-gray-400 hover:text-[#007B94] dark:hover:text-[#39FF14] hover:bg-cyan-50 dark:hover:bg-zinc-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00B8D9] dark:focus-visible:ring-[#39FF14] disabled:opacity-45 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
                <div className="flex flex-col gap-2.5">
                  {displayedSamples.map((item, idx) => (
                    <button
                      key={item.id}
                      type="button"
                      disabled={voiceState === 'processing'}
                      onClick={() => handleQuestion(item.question)}
                      aria-label={item.question}
                      className="neon-subbox w-full min-h-[48px] px-4 py-2.5 rounded-xl bg-cyan-50/40 dark:bg-zinc-900/80 text-left font-tamil text-xs sm:text-sm font-medium text-slate-900 dark:text-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00B8D9] dark:focus-visible:ring-[#39FF14] disabled:opacity-50 cursor-pointer"
                    >
                      <span>{typedSamples[idx] ?? ''}</span>
                      {activeSampleTypingIdx === idx && (
                        <span
                          aria-hidden="true"
                          className="typing-caret bg-[#00B8D9] dark:bg-[#39FF14]"
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* RIGHT COLUMN: Terminal-Style Animated Output Box */}
            <section
              aria-live="polite"
              aria-label="Terminal answer output"
              className="neon-box min-h-[420px] md:min-h-[465px] relative overflow-hidden rounded-3xl bg-slate-50/95 dark:bg-[#050806]/95 backdrop-blur-md flex flex-col font-mono-term"
            >
              {/* Subtle Animated Scanline Sweep */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-transparent via-[#00D2F5]/10 dark:via-[#39FF14]/10 to-transparent animate-terminal-scan"
              />

              {/* Terminal Header Chrome */}
              <div className="relative z-10 px-5 py-3.5 border-b border-[#00D2F5]/45 dark:border-[#39FF14]/35 bg-white/80 dark:bg-zinc-950/90 flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5" aria-hidden="true">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-400/85" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400/85" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/85" />
                </div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-[#39FF14]/90 truncate">
                  <Terminal className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>ari-terminal</span>
                </div>
                <span className="min-w-[44px] text-right text-[10px] font-bold text-[#006B80] dark:text-[#39FF14]">
                  {voiceState === 'recording'
                    ? 'Listening'
                    : voiceState === 'processing'
                      ? 'Running'
                      : ''}
                </span>
              </div>

              {/* Terminal Body */}
              <div className="relative z-10 flex-1 p-6 sm:p-7 flex flex-col justify-between gap-5 text-xs sm:text-[13px]">
                {/* STATE A: Recording / Processing / Idle Placeholders */}
                {(voiceState !== 'idle' || result === null) && (
                  <div className="space-y-4">
                    {/* Command Prompt Line */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-[#006B80] dark:text-[#39FF14] font-semibold">
                        <span>$</span>
                        <span>
                          {voiceState === 'recording'
                            ? `prisma --listen ${SPINNER_FRAMES[spinnerIdx]}`
                            : voiceState === 'recorded'
                              ? `audio --captured (${formatDuration(recordingSeconds)})`
                              : voiceState === 'processing'
                                ? `ari --verify --speak ${SPINNER_FRAMES[spinnerIdx]}`
                                : 'ari --await-input'}
                        </span>
                        {(voiceState === 'idle' || voiceState === 'recorded') && (
                          <span
                            aria-hidden="true"
                            className="terminal-block-cursor bg-[#00B8D9] dark:bg-[#39FF14]"
                          />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-gray-400 pl-4">
                        {voiceState === 'recording'
                          ? 'Capturing spoken Tamil audio stream...'
                          : voiceState === 'recorded'
                            ? 'Voice clip ready. Press Send to upload to backend.'
                            : voiceState === 'processing'
                              ? 'Matching verified source & synthesizing Timbre voice...'
                              : 'Speak or select a Tamil question on the left.'}
                      </p>
                    </div>

                    {/* Animated Text Output Placeholder */}
                    <div className="pt-3 border-t border-[#00D2F5]/30 dark:border-[#39FF14]/20 space-y-2">
                      <span className="text-[10px] font-bold text-[#006B80] dark:text-[#39FF14] block">
                        $ text --output
                      </span>
                      <div className="space-y-1.5 pl-3">
                        <div
                          className={`h-2.5 w-11/12 rounded-sm bg-[#00B8D9]/25 dark:bg-[#39FF14]/25 shimmer-delay-1 ${
                            voiceState === 'recording' ||
                            voiceState === 'processing'
                              ? 'animate-placeholder-pulse'
                              : 'animate-placeholder-idle'
                          }`}
                        />
                        <div
                          className={`h-2.5 w-4/5 rounded-sm bg-[#00B8D9]/25 dark:bg-[#39FF14]/25 shimmer-delay-2 ${
                            voiceState === 'recording' ||
                            voiceState === 'processing'
                              ? 'animate-placeholder-pulse'
                              : 'animate-placeholder-idle'
                          }`}
                        />
                        <div
                          className={`h-2.5 w-3/5 rounded-sm bg-[#00B8D9]/25 dark:bg-[#39FF14]/25 shimmer-delay-3 ${
                            voiceState === 'recording' ||
                            voiceState === 'processing'
                              ? 'animate-placeholder-pulse'
                              : 'animate-placeholder-idle'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Animated Voice Output Placeholder */}
                    <div className="pt-3 border-t border-[#00D2F5]/30 dark:border-[#39FF14]/20 space-y-2">
                      <span className="text-[10px] font-bold text-[#006B80] dark:text-[#39FF14] block">
                        $ voice
                      </span>
                      <div className="flex items-center gap-3 pl-3">
                        <Volume2
                          className="w-4 h-4 text-[#007B94] dark:text-[#39FF14]/80 shrink-0"
                          aria-hidden="true"
                        />
                        <div
                          aria-hidden="true"
                          className="flex-1 flex items-center gap-1 h-5"
                        >
                          {[
                            'wave-delay-1',
                            'wave-delay-2',
                            'wave-delay-3',
                            'wave-delay-4',
                            'wave-delay-5',
                            'wave-delay-6',
                            'wave-delay-7',
                            'wave-delay-2',
                            'wave-delay-4',
                            'wave-delay-1',
                            'wave-delay-3',
                            'wave-delay-5',
                          ].map((delayClass, idx) => (
                            <span
                              key={idx}
                              className={`flex-1 h-4 rounded-xs ${delayClass} ${
                                voiceState === 'recording' ||
                                voiceState === 'processing'
                                  ? 'bg-[#00B8D9] dark:bg-[#39FF14] wave-bar'
                                  : 'bg-[#00B8D9]/30 dark:bg-[#39FF14]/25 wave-bar-idle'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* STATE B: Verified Answer Found */}
                {voiceState === 'idle' &&
                  result &&
                  result.status === 'found' && (
                    <div className="space-y-4">
                      {/* Command Echo */}
                      <div className="animate-term-line-1 space-y-1">
                        <div className="flex items-center gap-2 text-[#006B80] dark:text-[#39FF14] font-semibold">
                          <span>$</span>
                          <span>query</span>
                        </div>
                        <p className="font-tamil text-xs sm:text-[13px] font-medium text-slate-700 dark:text-gray-300 pl-3">
                          “{result.question}”
                        </p>
                      </div>

                      {/* Typed Tamil Answer */}
                      <div className="animate-term-line-2 pt-3 border-t border-[#00D2F5]/30 dark:border-[#39FF14]/20 space-y-1.5">
                        <span className="text-[10px] font-bold text-[#006B80] dark:text-[#39FF14] block">
                          $ text --output
                        </span>
                        <p className="font-tamil text-sm sm:text-base font-bold text-slate-950 dark:text-white leading-relaxed min-h-[2.25rem] pl-3">
                          <span>{typedAnswer}</span>
                          {isTypingAnswer && (
                            <span
                              aria-hidden="true"
                              className="terminal-block-cursor bg-[#00B8D9] dark:bg-[#39FF14]"
                            />
                          )}
                        </p>
                      </div>

                      {/* Terminal Voice Synthesizer Player */}
                      <div className="animate-term-line-3 pt-3 border-t border-[#00D2F5]/30 dark:border-[#39FF14]/20 space-y-2">
                        <span className="text-[10px] font-bold text-[#006B80] dark:text-[#39FF14] block">
                          $ voice
                        </span>
                        <div className="flex flex-wrap items-center gap-3 pl-3">
                          <button
                            type="button"
                            onClick={togglePlayMockAudio}
                            aria-label={
                              isPlaying
                                ? 'Pause voice answer'
                                : 'Play voice answer'
                            }
                            className="min-h-[42px] px-3.5 py-1.5 rounded-lg bg-[#00B8D9] dark:bg-[#39FF14] text-slate-950 dark:text-black font-bold text-xs flex items-center gap-1.5 hover:opacity-90 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-white cursor-pointer whitespace-nowrap shrink-0"
                          >
                            {isPlaying ? (
                              <>
                                <Pause
                                  className="w-3.5 h-3.5 fill-current"
                                  aria-hidden="true"
                                />
                                <span>Pause</span>
                              </>
                            ) : (
                              <>
                                <Play
                                  className="w-3.5 h-3.5 fill-current"
                                  aria-hidden="true"
                                />
                                <span>Play</span>
                              </>
                            )}
                          </button>

                          <div
                            role="progressbar"
                            aria-label="Voice answer progress"
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={Math.round(playProgress)}
                            className="text-[11px] tracking-tight text-[#006B80] dark:text-[#39FF14] tabular-nums select-none"
                          >
                            [{asciiBar}] {Math.round(playProgress)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                {/* STATE C: Not Found */}
                {voiceState === 'idle' &&
                  result &&
                  result.status === 'not_found' && (
                    <div className="space-y-3">
                      <div className="animate-term-line-1 space-y-1">
                        <div className="flex items-center gap-2 text-[#006B80] dark:text-[#39FF14] font-semibold">
                          <span>$</span>
                          <span>query</span>
                        </div>
                        <p className="font-tamil text-xs text-slate-700 dark:text-gray-300 pl-3">
                          “{result.question}”
                        </p>
                      </div>

                      <div className="animate-term-line-2 pt-3 border-t border-amber-500/40 space-y-1.5">
                        <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 block">
                          $ result --unverified
                        </span>
                        <p className="font-tamil text-sm sm:text-base font-bold text-slate-950 dark:text-white leading-relaxed pl-3">
                          இதற்கு பதில் இன்னும் தெரியவில்லை
                        </p>
                        <p className="font-en text-xs text-slate-600 dark:text-gray-300 pl-3">
                          Try another question.
                        </p>
                      </div>
                    </div>
                  )}

                {/* Terminal Footer: Verified Source Line */}
                <div className="pt-3 border-t border-[#00D2F5]/35 dark:border-[#39FF14]/25 flex items-center justify-between gap-2 text-[11px]">
                  <span className="text-slate-600 dark:text-gray-400 truncate">
                    <span className="font-bold text-[#006B80] dark:text-[#39FF14]">
                      $ source:
                    </span>{' '}
                    {voiceState === 'idle' &&
                    result &&
                    result.status === 'found'
                      ? result.source
                      : voiceState === 'recording' ||
                          voiceState === 'processing'
                        ? 'resolving citation...'
                        : 'awaiting verified match'}
                  </span>
                </div>
              </div>
            </section>
          </div>
        </main>
      )}

      {/* TAB 3: ABOUT SECTION (Thin Neon Cyan Border in Light Mode) */}
      {activeTab === 'about' && (
        <main className="relative z-10 flex-1 mx-auto w-full max-w-2xl px-4 py-8 flex items-center justify-center">
          <div
            onPointerMove={handleAboutPointerMove}
            onPointerLeave={handleAboutPointerLeave}
            className="about-dynamic-card neon-box w-full p-6 sm:p-7 rounded-3xl bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md space-y-5"
          >
            <div className="flex items-center justify-between gap-4 border-b border-[#00D2F5]/40 dark:border-zinc-800 pb-3.5">
              <h1
                className={`text-lg sm:text-xl font-normal tracking-wide text-slate-950 dark:text-white ${
                  aboutLang === 'ta'
                    ? 'font-tamil-fairytale text-xl sm:text-2xl'
                    : 'font-fairytale'
                }`}
              >
                {aboutLang === 'en' ? 'About Ari' : 'அறி பற்றி'}
              </h1>

              {/* Interactive Tamil/English Crest Logo Button */}
              <button
                type="button"
                onClick={() =>
                  setAboutLang((prev) => (prev === 'en' ? 'ta' : 'en'))
                }
                aria-label={
                  aboutLang === 'en'
                    ? 'Switch About section to Tamil'
                    : 'Switch About section to English'
                }
                title={aboutLang === 'en' ? 'தமிழ்' : 'English'}
                className="group relative w-11 h-11 rounded-full bg-cyan-50/70 dark:bg-zinc-900 border border-[#00D2F5] dark:border-[#39FF14]/70 hover:bg-[#00B8D9] dark:hover:bg-[#39FF14] text-[#006B80] dark:text-[#39FF14] hover:text-slate-950 dark:hover:text-black flex items-center justify-center shadow-[0_0_12px_rgba(0,210,245,0.22)] dark:shadow-[0_0_16px_rgba(57,255,20,0.28)] transition-all duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00B8D9] dark:focus-visible:ring-[#39FF14] cursor-pointer shrink-0"
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full border border-[#00D2F5] dark:border-[#39FF14] animate-touch-ping pointer-events-none"
                />
                <svg
                  viewBox="0 0 40 40"
                  className="w-7 h-7"
                  aria-hidden="true"
                >
                  <circle
                    cx="20"
                    cy="20"
                    r="16.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeDasharray="3 2.5"
                    opacity="0.7"
                  />
                  {aboutLang === 'en' ? (
                    <text
                      x="20"
                      y="25"
                      textAnchor="middle"
                      fill="currentColor"
                      className="font-tamil-fairytale text-[17px]"
                    >
                      அ
                    </text>
                  ) : (
                    <text
                      x="20"
                      y="25.5"
                      textAnchor="middle"
                      fill="currentColor"
                      className="font-fairytale text-[17px]"
                    >
                      A
                    </text>
                  )}
                </svg>
              </button>
            </div>

            <ul
              key={aboutLang}
              lang={aboutLang === 'ta' ? 'ta' : 'en'}
              className={`space-y-3.5 ${
                aboutLang === 'ta' ? 'font-tamil' : 'font-en'
              }`}
            >
              {aboutPoints.map((pointText, idx) => {
                const animClass =
                  idx === 0
                    ? 'animate-point-1'
                    : idx === 1
                      ? 'animate-point-2'
                      : idx === 2
                        ? 'animate-point-3'
                        : 'animate-point-4';
                return (
                  <li
                    key={idx}
                    className={`${animClass} flex items-start gap-3 text-xs sm:text-[13.5px] text-slate-800 dark:text-gray-200 leading-relaxed`}
                  >
                    <span
                      aria-hidden="true"
                      className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#00B8D9] dark:bg-[#39FF14] shrink-0"
                    />
                    <span>{pointText}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </main>
      )}
    </div>
  );
}
