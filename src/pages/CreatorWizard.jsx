import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronDown, ChevronUp, Camera, X, Play, Pause,
  Search, Check, Mic, Square, UploadCloud, Plus, Trash2, Key,
  Wand2, MapPin, Loader2, AlertCircle
} from 'lucide-react';

const STEP_TITLES = [
  'Vocês',
  'Fotos',
  'Mensagem',
  'Onde vocês vivem',
  'Toques finais',
  'Revisar',
];

const DEFAULT_ROULETTE = [
  'Jantar Especial 🍝',
  'Cinema em Casa 🎬',
  'Massagem Relaxante 💆',
  'Piquenique no Parque 🧺',
  'Viagem de Fim de Semana 🚗',
];

/* ─── Date helpers ───────────────────────────────────────────────────── */
function isoToBr(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function brToIso(br) {
  const match = br.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return '';
  const [, d, mo, y] = match;
  const day = +d, month = +mo, year = +y;
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2100) return '';
  return `${y}-${mo}-${d}`;
}

/* ─── DateField component ────────────────────────────────────────────── */
// The component tracks its own display text (DD/MM/AAAA) independently.
// When the user types, we parse and call onChange with the ISO value.
// The parent keeps the ISO value in formData; we initialise display from it.
// The key prop on DateField should be used to reset when needed.
function DateField({ label, value, onChange, optional }) {
  const [text, setText] = useState(() => isoToBr(value));

  function handleChange(e) {
    let v = e.target.value.replace(/\D/g, '').slice(0, 8);
    if (v.length > 4) v = `${v.slice(0, 2)}/${v.slice(2, 4)}/${v.slice(4)}`;
    else if (v.length > 2) v = `${v.slice(0, 2)}/${v.slice(2)}`;
    setText(v);
    onChange(brToIso(v));
  }

  return (
    <div>
      <label className="text-sm text-ink-600 mb-1.5 block">
        {label}{optional && <span className="text-ink-400 ml-1">(opcional)</span>}
      </label>
      <input
        type="text"
        inputMode="numeric"
        placeholder="DD/MM/AAAA"
        className="input-base"
        value={text}
        onChange={handleChange}
      />
    </div>
  );
}

export default function CreatorWizard() {
  const navigate = useNavigate();

  /* ─── Form state ─────────────────────────────────────────────────────── */
  const [formData, setFormData] = useState({
    nome1: '',
    nome2: '',
    titulo: '',
    dataInicio: '',
    dataNasc1: '',
    dataNasc2: '',
    mensagem: '',
    fotos: [],
    musicaTitulo: '',
    musicaUrl: '',
    conquistas: [],
    palavraSecreta: '',
    palavraSecretaDica: '',
    opcoesRoleta: [...DEFAULT_ROULETTE],
    audioUrl: '',
    cupidoComentario: '',
    cidade: '',
    bairro: '',
    roteiro: null,
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [formError, setFormError] = useState('');

  /* ─── Step 2 — Photos ────────────────────────────────────────────────── */
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    if (formData.fotos.length + files.length > 8) {
      setFormError('Você pode enviar no máximo 8 fotos.');
      return;
    }
    setFormError('');
    setIsUploading(true);
    const fd = new FormData();
    files.forEach(f => fd.append('photos', f));
    try {
      const res = await fetch('/api/uploads/page-photo', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.urls) {
        setFormData(prev => ({ ...prev, fotos: [...prev.fotos, ...data.urls] }));
      } else {
        setFormError(data.error || 'Erro ao enviar fotos.');
      }
    } catch {
      setFormError('Erro de conexão ao enviar fotos.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemovePhoto = (idx) => {
    setFormData(prev => ({ ...prev, fotos: prev.fotos.filter((_, i) => i !== idx) }));
  };

  /* ─── Step 4 — Place autocomplete + roteiro ──────────────────────────── */
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeSuggestions, setPlaceSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingRoteiro, setIsLoadingRoteiro] = useState(false);
  const debounceRef = useRef(null);

  const fetchSuggestions = useCallback(async (q) => {
    if (q.length < 2) { setPlaceSuggestions([]); return; }
    try {
      const res = await fetch(`/api/places/autocomplete?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setPlaceSuggestions(data.suggestions || []);
      setShowSuggestions(true);
    } catch {
      setPlaceSuggestions([]);
    }
  }, []);

  const handlePlaceInput = (val) => {
    setPlaceQuery(val);
    setFormData(prev => ({ ...prev, cidade: '', bairro: '', roteiro: null }));
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300);
  };

  const handlePickSuggestion = (suggestion) => {
    const parts = suggestion.split(',');
    const bairro = (parts[0] || '').trim();
    const cidadeRaw = (parts[1] || '').trim();
    const cidade = cidadeRaw.replace(/\s*-\s*[A-Z]{2}.*$/, '').trim() || bairro;
    setFormData(prev => ({ ...prev, bairro, cidade, roteiro: null }));
    setPlaceQuery(suggestion);
    setShowSuggestions(false);
    setPlaceSuggestions([]);
  };

  const handleGerarRoteiro = async () => {
    if (!formData.cidade || !formData.bairro) return;
    setIsLoadingRoteiro(true);
    setFormError('');
    try {
      const res = await fetch('/api/places/roteiro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cidade: formData.cidade, bairro: formData.bairro }),
      });
      const data = await res.json();
      setFormData(prev => ({ ...prev, roteiro: data }));
    } catch {
      setFormError('Erro ao buscar roteiro. Tente novamente.');
    } finally {
      setIsLoadingRoteiro(false);
    }
  };

  /* ─── Step 5 — Music search via backend proxy ────────────────────────── */
  const [songQuery, setSongQuery] = useState('');
  const [songResults, setSongResults] = useState([]);
  const [isSearchingSongs, setIsSearchingSongs] = useState(false);
  const [songError, setSongError] = useState('');
  const [previewPlayingUrl, setPreviewPlayingUrl] = useState('');
  const audioRef = useRef(null);

  const handleSearchSongs = async () => {
    if (!songQuery.trim()) return;
    setIsSearchingSongs(true);
    setSongError('');
    setSongResults([]);
    try {
      const res = await fetch(`/api/music/search?q=${encodeURIComponent(songQuery)}`);
      if (!res.ok) {
        setSongError('Não foi possível buscar agora. Tente de novo.');
        return;
      }
      const data = await res.json();
      if (!data.results || data.results.length === 0) {
        setSongError('Nenhuma música encontrada — tente outro nome.');
      } else {
        setSongResults(data.results);
      }
    } catch {
      setSongError('Não foi possível buscar agora. Tente de novo.');
    } finally {
      setIsSearchingSongs(false);
    }
  };

  const handleTogglePlaySong = (url) => {
    if (previewPlayingUrl === url) {
      audioRef.current?.pause();
      setPreviewPlayingUrl('');
    } else {
      setPreviewPlayingUrl(url);
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play().catch(() => {});
      }
    }
  };

  /* ─── Step 5 — Audio recording ───────────────────────────────────────── */
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState('');
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const handleStartRecording = async () => {
    setFormError('');
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        const mime = mediaRecorderRef.current?.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mime });
        setRecordedAudioUrl(URL.createObjectURL(blob));
        await handleUploadAudioBlob(blob);
      };
      mr.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch {
      setFormError('Permissão para usar o microfone foi negada ou não é suportada neste navegador.');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    }
  };

  const handleUploadAudioBlob = async (blob) => {
    setIsUploadingAudio(true);
    setProcessingStatus('Enviando áudio para o servidor...');
    const ext = blob.type.includes('mp4') ? 'mp4' : blob.type.includes('ogg') ? 'ogg' : 'webm';
    const fd = new FormData();
    fd.append('audio', blob, `recording.${ext}`);
    fd.append('titulo', formData.titulo);
    fd.append('mensagem', formData.mensagem);
    const t2 = setTimeout(() => setProcessingStatus('Transcrevendo fala (Whisper)...'), 1200);
    const t3 = setTimeout(() => setProcessingStatus('Consultando Claude para o veredito do Cupido...'), 2800);
    try {
      const res = await fetch('/api/uploads/page-audio', { method: 'POST', body: fd });
      const data = await res.json();
      clearTimeout(t2); clearTimeout(t3);
      if (data.url) {
        setProcessingStatus('Cupido formulou o veredito!');
        setFormData(prev => ({ ...prev, audioUrl: data.url, cupidoComentario: data.cupidoComentario || '' }));
      } else {
        setFormError('Erro ao enviar áudio gravado.');
      }
    } catch {
      clearTimeout(t2); clearTimeout(t3);
      setFormError('Erro de conexão ao enviar áudio.');
    } finally {
      setIsUploadingAudio(false);
      setProcessingStatus('');
    }
  };

  const handleAudioFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFormError('');
    setIsUploadingAudio(true);
    setProcessingStatus('Enviando arquivo de áudio...');
    const fd = new FormData();
    fd.append('audio', file);
    fd.append('titulo', formData.titulo);
    fd.append('mensagem', formData.mensagem);
    const t2 = setTimeout(() => setProcessingStatus('Transcrevendo fala (Whisper)...'), 1200);
    const t3 = setTimeout(() => setProcessingStatus('Consultando Claude...'), 2800);
    try {
      const res = await fetch('/api/uploads/page-audio', { method: 'POST', body: fd });
      const data = await res.json();
      clearTimeout(t2); clearTimeout(t3);
      if (data.url) {
        setProcessingStatus('Cupido formulou o veredito!');
        setFormData(prev => ({ ...prev, audioUrl: data.url, cupidoComentario: data.cupidoComentario || '' }));
        setRecordedAudioUrl(data.url);
      } else {
        setFormError('Erro ao enviar arquivo de áudio.');
      }
    } catch {
      clearTimeout(t2); clearTimeout(t3);
      setFormError('Erro de conexão ao enviar arquivo de áudio.');
    } finally {
      setIsUploadingAudio(false);
      setProcessingStatus('');
    }
  };

  /* ─── Step 5 — Conquistas ───────────────────────────────────────────── */
  const [milestoneTitle, setMilestoneTitle] = useState('');
  const [milestoneDesc, setMilestoneDesc] = useState('');
  const [milestonePhoto, setMilestonePhoto] = useState('');
  const [isUploadingMilestonePhoto, setIsUploadingMilestonePhoto] = useState(false);

  const handleMilestonePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploadingMilestonePhoto(true);
    const fd = new FormData();
    fd.append('photos', file);
    try {
      const res = await fetch('/api/uploads/page-photo', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.urls?.[0]) setMilestonePhoto(data.urls[0]);
      else setFormError('Erro ao enviar foto do marco.');
    } catch {
      setFormError('Erro de conexão ao enviar foto do marco.');
    } finally {
      setIsUploadingMilestonePhoto(false);
    }
  };

  const handleAddMilestone = () => {
    if (!milestoneTitle.trim()) { setFormError('Digite um título para a conquista.'); return; }
    if (!milestonePhoto) { setFormError('Envie uma foto para esta conquista.'); return; }
    setFormData(prev => ({
      ...prev,
      conquistas: [...prev.conquistas, { titulo: milestoneTitle, descricao: milestoneDesc, fotoUrl: milestonePhoto }],
    }));
    setMilestoneTitle(''); setMilestoneDesc(''); setMilestonePhoto('');
  };

  const handleRemoveMilestone = (idx) => {
    setFormData(prev => ({ ...prev, conquistas: prev.conquistas.filter((_, i) => i !== idx) }));
  };

  /* ─── Step 5 — Roleta ───────────────────────────────────────────────── */
  const [newRouletteOption, setNewRouletteOption] = useState('');

  const handleAddRouletteOption = () => {
    if (!newRouletteOption.trim()) return;
    setFormData(prev => ({ ...prev, opcoesRoleta: [...prev.opcoesRoleta, newRouletteOption.trim()] }));
    setNewRouletteOption('');
  };

  const handleRemoveRouletteOption = (idx) => {
    setFormData(prev => ({ ...prev, opcoesRoleta: prev.opcoesRoleta.filter((_, i) => i !== idx) }));
  };

  /* ─── Step 5 — accordion open state ─────────────────────────────────── */
  const [openAccordion, setOpenAccordion] = useState(null);
  const toggleAccordion = (key) => setOpenAccordion(prev => (prev === key ? null : key));

  /* ─── Step 6 — Submit ────────────────────────────────────────────────── */
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStage, setSubmitStage] = useState('');

  const SUBMIT_STAGES = [
    'Escrevendo a carta de vocês…',
    'Consultando os astros…',
    'Preparando tudo com carinho…',
    'Quase pronto…',
  ];

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setFormError('');
    let stageIdx = 0;
    setSubmitStage(SUBMIT_STAGES[0]);
    const stageTimer = setInterval(() => {
      stageIdx = (stageIdx + 1) % SUBMIT_STAGES.length;
      setSubmitStage(SUBMIT_STAGES[stageIdx]);
    }, 2500);

    try {
      const res = await fetch('/api/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: formData, email: '' }),
      });
      const data = await res.json();
      clearInterval(stageTimer);
      if (res.ok && data.slug) {
        sessionStorage.setItem('chamego-slug', data.slug);
        audioRef.current?.pause();
        navigate(`/criar/checkout?slug=${data.slug}`);
      } else {
        setFormError(data.error || 'Erro ao salvar. Tente novamente.');
        setIsSubmitting(false);
        setSubmitStage('');
      }
    } catch {
      clearInterval(stageTimer);
      setFormError('Erro de conexão. O backend está rodando?');
      setIsSubmitting(false);
      setSubmitStage('');
    }
  };

  /* ─── Navigation ─────────────────────────────────────────────────────── */
  const handleNext = () => {
    setFormError('');
    if (currentStep === 1) {
      if (!formData.nome1.trim() || !formData.nome2.trim() || !formData.dataInicio) {
        setFormError('Preencha os dois nomes e a data de início.');
        return;
      }
    }
    if (currentStep === 3 && !formData.mensagem.trim()) {
      setFormError('Por favor, escreva uma mensagem de amor.');
      return;
    }
    if (currentStep === 4) {
      if (!formData.cidade || !formData.bairro) {
        setFormError('Por favor, selecione um local com bairro e cidade.');
        return;
      }
    }
    setCurrentStep(s => Math.min(6, s + 1));
  };

  const handlePrev = () => { setFormError(''); setCurrentStep(s => Math.max(1, s - 1)); };

  /* ─── Helpers ────────────────────────────────────────────────────────── */
  const fmtTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  /* ─── nome1/nome2 → titulo sync ──────────────────────────────────────── */
  const handleNome1Change = (val) => {
    const nome2 = formData.nome2;
    const parts = [val.trim(), nome2.trim()].filter(Boolean);
    setFormData(p => ({ ...p, nome1: val, titulo: parts.join(' & ') }));
  };

  const handleNome2Change = (val) => {
    const nome1 = formData.nome1;
    const parts = [nome1.trim(), val.trim()].filter(Boolean);
    setFormData(p => ({ ...p, nome2: val, titulo: parts.join(' & ') }));
  };

  /* ─── Render steps ───────────────────────────────────────────────────── */
  const renderStep = () => {
    switch (currentStep) {
      /* ── Passo 1: Vocês ─────────────────────────────────────────────── */
      case 1:
        return (
          <div className="flex flex-col gap-6">
            <div>
              <label className="eyebrow mb-2 block">Seu nome *</label>
              <input
                className="input-base"
                type="text"
                placeholder="Ex: Mariana"
                inputMode="text"
                value={formData.nome1}
                onChange={e => handleNome1Change(e.target.value)}
              />
            </div>

            <div>
              <label className="eyebrow mb-2 block">Nome do seu amor *</label>
              <input
                className="input-base"
                type="text"
                placeholder="Ex: João"
                inputMode="text"
                value={formData.nome2}
                onChange={e => handleNome2Change(e.target.value)}
              />
            </div>

            <DateField
              label="Início do relacionamento *"
              value={formData.dataInicio}
              onChange={val => setFormData(p => ({ ...p, dataInicio: val }))}
            />

            {/* Sinastria opcional */}
            <div className="card p-5">
              <p className="eyebrow mb-1">Sinastria <span className="normal-case font-normal text-ink-400">(opcional)</span></p>
              <p className="text-sm text-ink-400 mb-4">Preencher habilita a análise astral do casal.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <DateField
                  label="Seu nascimento"
                  value={formData.dataNasc1}
                  onChange={val => setFormData(p => ({ ...p, dataNasc1: val }))}
                  optional
                />
                <DateField
                  label="Nascimento do seu amor"
                  value={formData.dataNasc2}
                  onChange={val => setFormData(p => ({ ...p, dataNasc2: val }))}
                  optional
                />
              </div>
            </div>
          </div>
        );

      /* ── Passo 2: Fotos ─────────────────────────────────────────────── */
      case 2:
        return (
          <div className="flex flex-col gap-6">
            <div className="relative card border-dashed h-40 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-cream-50 transition-colors">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                disabled={isUploading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Camera className="w-8 h-8 text-ink-400" />
              <p className="text-sm text-ink-600 font-medium">
                {isUploading ? 'Enviando…' : 'Toque para selecionar fotos'}
              </p>
              <p className="text-xs text-ink-400">Até 8 fotos</p>
            </div>

            {formData.fotos.length === 0 && (
              <p className="text-sm text-ink-400 text-center">
                Recomendamos pelo menos 3 fotos para uma página mais bonita.
              </p>
            )}

            {formData.fotos.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {formData.fotos.map((url, idx) => (
                  <div key={idx} className="relative aspect-square">
                    <img src={url} alt="" className="w-full h-full object-cover rounded-xl" />
                    <button
                      onClick={() => handleRemovePhoto(idx)}
                      className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-ink-900 text-white flex items-center justify-center text-xs hover:bg-wine-700 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      /* ── Passo 3: Mensagem ──────────────────────────────────────────── */
      case 3:
        return (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-ink-600">
              Escreva do seu jeito — a IA usa isso para escrever a carta de vocês.
            </p>
            <textarea
              className="input-base resize-none"
              rows={6}
              placeholder="Minha vida ficou muito melhor depois que te conheci…"
              value={formData.mensagem}
              onChange={e => setFormData(p => ({ ...p, mensagem: e.target.value }))}
            />
          </div>
        );

      /* ── Passo 4: Onde vocês vivem ──────────────────────────────────── */
      case 4:
        return (
          <div className="flex flex-col gap-6">
            <div className="relative">
              <label className="eyebrow mb-2 block">Bairro e cidade</label>
              <input
                className="input-base"
                type="text"
                placeholder="Ex: Pinheiros, São Paulo"
                value={placeQuery}
                onChange={e => handlePlaceInput(e.target.value)}
                onFocus={() => placeSuggestions.length > 0 && setShowSuggestions(true)}
                autoComplete="off"
              />
              {showSuggestions && placeSuggestions.length > 0 && (
                <div className="card absolute z-20 left-0 right-0 mt-1 overflow-hidden">
                  {placeSuggestions.map((s, i) => (
                    <button
                      key={i}
                      className="w-full text-left px-5 py-3 text-sm text-ink-900 hover:bg-cream-50 border-b border-ink-900/5 last:border-0 flex items-center gap-2"
                      onMouseDown={() => handlePickSuggestion(s)}
                    >
                      <MapPin className="w-4 h-4 text-wine-700 flex-shrink-0" />
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {formData.cidade && formData.bairro && (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-wine-100 text-wine-700 text-sm font-medium">
                  <MapPin className="w-4 h-4" />
                  {formData.bairro}, {formData.cidade}
                </span>
              </div>
            )}

            {formData.cidade && formData.bairro && !formData.roteiro && (
              <button
                onClick={handleGerarRoteiro}
                disabled={isLoadingRoteiro}
                className="btn-primary w-full"
              >
                {isLoadingRoteiro ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Buscando lugares reais perto de vocês…
                  </>
                ) : (
                  'Gerar roteiro de dates'
                )}
              </button>
            )}

            {formData.roteiro && (
              <div className="flex flex-col gap-4">
                <RoteiroSection icon="☀️" label="De dia" cards={formData.roteiro.dia} />
                <RoteiroSection icon="🌙" label="À noite" cards={formData.roteiro.noite} />
              </div>
            )}
          </div>
        );

      /* ── Passo 5: Toques finais ─────────────────────────────────────── */
      case 5:
        return (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-ink-400 mb-1">Todos os itens são opcionais.</p>

            {/* Música */}
            <AccordionItem
              label="Música do casal"
              isOpen={openAccordion === 'musica'}
              onToggle={() => toggleAccordion('musica')}
            >
              <div className="flex flex-col gap-3 pt-3">
                <div className="flex gap-2">
                  <input
                    className="input-base flex-1 text-sm"
                    type="text"
                    placeholder="Ex: Perfect — Ed Sheeran"
                    value={songQuery}
                    onChange={e => setSongQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearchSongs()}
                  />
                  <button
                    onClick={handleSearchSongs}
                    disabled={isSearchingSongs}
                    className="btn-ghost px-4 min-h-0 py-3"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                </div>

                {isSearchingSongs && <p className="text-sm text-ink-400 text-center py-2 animate-pulse">Buscando…</p>}

                {songError && (
                  <p className="text-sm text-wine-700">{songError}</p>
                )}

                <div className="flex flex-col gap-2 max-h-56 overflow-y-auto">
                  {songResults.map(song => (
                    <div
                      key={song.trackId}
                      className={`card flex items-center gap-3 p-3 ${formData.musicaUrl === song.previewUrl ? 'ring-2 ring-wine-700' : ''}`}
                    >
                      <img src={song.artworkUrl60} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-ink-900 truncate">{song.trackName}</p>
                        <p className="text-xs text-ink-400 truncate">{song.artistName}</p>
                      </div>
                      <button
                        className="p-2 rounded-full border border-ink-900/10 hover:border-wine-700 transition-colors"
                        onClick={() => handleTogglePlaySong(song.previewUrl)}
                      >
                        {previewPlayingUrl === song.previewUrl ? (
                          <Pause className="w-4 h-4 text-wine-700" />
                        ) : (
                          <Play className="w-4 h-4 text-ink-600" />
                        )}
                      </button>
                      <button
                        className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                          formData.musicaUrl === song.previewUrl
                            ? 'bg-wine-700 text-white'
                            : 'border border-ink-900/15 text-ink-600 hover:border-wine-700'
                        }`}
                        onClick={() => setFormData(p => ({
                          ...p,
                          musicaTitulo: `${song.trackName} — ${song.artistName}`,
                          musicaUrl: song.previewUrl,
                        }))}
                      >
                        {formData.musicaUrl === song.previewUrl ? <Check className="w-3 h-3" /> : 'Selecionar'}
                      </button>
                    </div>
                  ))}
                </div>

                {formData.musicaTitulo && (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-cream-100 border border-ink-900/10 text-sm text-ink-600">
                    <Check className="w-4 h-4 text-wine-700 flex-shrink-0" />
                    <span className="truncate">{formData.musicaTitulo}</span>
                  </div>
                )}
              </div>
            </AccordionItem>

            {/* Áudio */}
            <AccordionItem
              label="Áudio do casal"
              isOpen={openAccordion === 'audio'}
              onToggle={() => toggleAccordion('audio')}
            >
              <div className="flex flex-col gap-4 pt-3">
                <div className="flex items-center gap-3">
                  {!isRecording ? (
                    <button
                      onClick={handleStartRecording}
                      disabled={isUploadingAudio}
                      className="btn-primary flex-1"
                    >
                      <Mic className="w-4 h-4" /> Iniciar gravação
                    </button>
                  ) : (
                    <button
                      onClick={handleStopRecording}
                      className="btn-primary flex-1 animate-pulse"
                    >
                      <Square className="w-4 h-4 fill-white" /> Parar — {fmtTime(recordingTime)}
                    </button>
                  )}

                  <div className="relative flex-1">
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={handleAudioFileChange}
                      disabled={isRecording || isUploadingAudio}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <button
                      disabled={isRecording || isUploadingAudio}
                      className="btn-ghost w-full pointer-events-none"
                    >
                      <UploadCloud className="w-4 h-4" />
                      {isUploadingAudio ? 'Enviando…' : 'Enviar arquivo'}
                    </button>
                  </div>
                </div>

                {recordedAudioUrl && (
                  <audio src={recordedAudioUrl} controls className="w-full rounded-xl" />
                )}

                {isUploadingAudio && (
                  <p className="text-sm text-wine-700 text-center animate-pulse">{processingStatus}</p>
                )}

                {!isUploadingAudio && (
                  <div>
                    <label className="eyebrow mb-2 block">
                      <Wand2 className="w-3.5 h-3.5 inline mr-1" />
                      Considerações do Cupido
                    </label>
                    <textarea
                      className="input-base resize-none text-sm"
                      rows={4}
                      placeholder="Grave um áudio para gerar, ou escreva aqui."
                      value={formData.cupidoComentario}
                      onChange={e => setFormData(p => ({ ...p, cupidoComentario: e.target.value }))}
                    />
                  </div>
                )}
              </div>
            </AccordionItem>

            {/* Palavra secreta */}
            <AccordionItem
              label="Palavra secreta"
              isOpen={openAccordion === 'palavra'}
              onToggle={() => toggleAccordion('palavra')}
            >
              <div className="flex flex-col gap-3 pt-3">
                <div>
                  <label className="eyebrow mb-1.5 block">
                    <Key className="w-3.5 h-3.5 inline mr-1" />
                    Palavra
                  </label>
                  <input
                    className="input-base uppercase tracking-widest text-lg"
                    type="text"
                    placeholder="Ex: TEAMO"
                    value={formData.palavraSecreta}
                    onChange={e => setFormData(p => ({
                      ...p,
                      palavraSecreta: e.target.value.toUpperCase().replace(/\s/g, ''),
                    }))}
                  />
                </div>
                <div>
                  <label className="eyebrow mb-1.5 block">Dica</label>
                  <input
                    className="input-base"
                    type="text"
                    placeholder="Ex: Sentimento que tenho por você"
                    value={formData.palavraSecretaDica}
                    onChange={e => setFormData(p => ({ ...p, palavraSecretaDica: e.target.value }))}
                  />
                </div>
              </div>
            </AccordionItem>

            {/* Roleta */}
            <AccordionItem
              label="Roleta de dates"
              isOpen={openAccordion === 'roleta'}
              onToggle={() => toggleAccordion('roleta')}
            >
              <div className="flex flex-col gap-3 pt-3">
                <div className="flex gap-2">
                  <input
                    className="input-base flex-1 text-sm"
                    type="text"
                    placeholder="Nova opção (Ex: Jantar Italiano 🍕)"
                    value={newRouletteOption}
                    onChange={e => setNewRouletteOption(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddRouletteOption()}
                  />
                  <button onClick={handleAddRouletteOption} className="btn-ghost px-4 min-h-0 py-3">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.opcoesRoleta.map((opt, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cream-100 border border-ink-900/10 text-sm text-ink-600">
                      {opt}
                      <button
                        onClick={() => handleRemoveRouletteOption(idx)}
                        className="text-ink-400 hover:text-wine-700 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </AccordionItem>

            {/* Conquistas */}
            <AccordionItem
              label="Conquistas do casal"
              isOpen={openAccordion === 'conquistas'}
              onToggle={() => toggleAccordion('conquistas')}
            >
              <div className="flex flex-col gap-4 pt-3">
                <div className="card p-4 flex flex-col gap-3">
                  <input
                    className="input-base text-sm"
                    type="text"
                    placeholder="Título: Ex: Nosso primeiro apartamento 🏢"
                    value={milestoneTitle}
                    onChange={e => setMilestoneTitle(e.target.value)}
                  />
                  <input
                    className="input-base text-sm"
                    type="text"
                    placeholder="Descrição: Ex: Conquistamos a chave do nosso apê!"
                    value={milestoneDesc}
                    onChange={e => setMilestoneDesc(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleMilestonePhotoChange}
                        disabled={isUploadingMilestonePhoto}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <button disabled className="btn-ghost w-full pointer-events-none text-sm">
                        {isUploadingMilestonePhoto ? 'Carregando…' : milestonePhoto ? '✓ Foto selecionada' : 'Foto da conquista'}
                      </button>
                    </div>
                    <button onClick={handleAddMilestone} className="btn-primary px-5 py-0 min-h-[48px]">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {formData.conquistas.map((item, idx) => (
                  <div key={idx} className="card flex items-center gap-3 p-3">
                    <img src={item.fotoUrl} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-ink-900 truncate">{item.titulo}</p>
                      <p className="text-xs text-ink-400 truncate">{item.descricao}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveMilestone(idx)}
                      className="p-2 text-ink-400 hover:text-wine-700 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </AccordionItem>
          </div>
        );

      /* ── Passo 6: Revisar ───────────────────────────────────────────── */
      case 6:
        return (
          <div className="flex flex-col gap-5">
            <p className="text-sm text-ink-400">Confirme os detalhes antes de continuar para o pagamento.</p>

            <div className="card divide-y divide-ink-900/5 overflow-hidden">
              <ReviewRow label="Nomes" value={formData.titulo} />
              <ReviewRow
                label="Início do relacionamento"
                value={formData.dataInicio
                  ? new Date(formData.dataInicio + 'T00:00:00').toLocaleDateString('pt-BR')
                  : '—'}
              />
              <ReviewRow label="Fotos" value={formData.fotos.length > 0 ? `${formData.fotos.length} foto(s)` : '— Nenhuma foto'} />
              <ReviewRow
                label="Mensagem"
                value={formData.mensagem
                  ? formData.mensagem.substring(0, 80) + (formData.mensagem.length > 80 ? '…' : '')
                  : '—'}
              />
              <ReviewRow
                label="Local"
                value={formData.cidade && formData.bairro ? `${formData.bairro}, ${formData.cidade}` : '—'}
              />
              <ReviewRow label="Roteiro de dates" value={formData.roteiro ? '✓ Gerado' : '—'} />
              <ReviewRow label="Música" value={formData.musicaTitulo || '—'} />
              <ReviewRow label="Áudio do casal" value={formData.audioUrl ? '✓' : '—'} />
              <ReviewRow label="Palavra secreta" value={formData.palavraSecreta || '—'} />
              <ReviewRow label="Conquistas" value={formData.conquistas.length > 0 ? `${formData.conquistas.length}` : '—'} />
            </div>

            {isSubmitting && (
              <div className="card p-6 flex flex-col items-center gap-3">
                <Loader2 className="w-7 h-7 text-wine-700 animate-spin" />
                <p className="text-sm text-ink-600 animate-pulse text-center">{submitStage}</p>
              </div>
            )}

            {!isSubmitting && (
              <button onClick={handleSubmit} className="btn-primary w-full">
                Continuar para pagamento
              </button>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const progress = Math.round((currentStep / 6) * 100);

  return (
    <div className="min-h-screen bg-cream-50 pb-28 md:pb-8">
      <audio ref={audioRef} onEnded={() => setPreviewPlayingUrl('')} />

      {/* Header */}
      <header className="sticky top-0 z-10 bg-cream-50/95 backdrop-blur border-b border-ink-900/10 px-5 py-4 flex items-center justify-between">
        <a href="/" className="font-display italic text-wine-700 text-xl font-semibold tracking-tight">
          Chamego
        </a>
        <span className="eyebrow">Passo {currentStep} de 6</span>
      </header>

      {/* Progress bar */}
      <div className="h-1 bg-cream-200 w-full">
        <div
          className="h-1 bg-wine-700 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Content */}
      <main className="max-w-lg mx-auto px-5 pt-8 pb-4">
        <h1 className="font-display italic text-3xl text-ink-900 mb-6">
          {STEP_TITLES[currentStep - 1]}
        </h1>

        {formError && (
          <div className="card border border-wine-700/30 bg-wine-100 text-wine-700 text-sm px-4 py-3 flex items-start gap-2 mb-5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        {renderStep()}
      </main>

      {/* Bottom action bar */}
      <div className="fixed md:static bottom-0 inset-x-0 bg-cream-50/95 backdrop-blur border-t border-ink-900/10 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex gap-3 md:max-w-lg md:mx-auto md:px-5 md:py-6 md:border-0 md:bg-transparent md:backdrop-blur-none">
        {currentStep > 1 && (
          <button onClick={handlePrev} className="btn-ghost flex-1">
            <ChevronLeft className="w-4 h-4" /> Voltar
          </button>
        )}
        {currentStep < 6 && (
          <button onClick={handleNext} className="btn-primary flex-1">
            Avançar
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Sub-components ───────────────────────────────────────────────────── */

function AccordionItem({ label, isOpen, onToggle, children }) {
  return (
    <div className="card overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <span className="text-sm font-semibold text-ink-900">{label}</span>
        <span className="eyebrow text-xs mr-1 opacity-60">opcional</span>
        {isOpen ? <ChevronUp className="w-4 h-4 text-ink-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-ink-400 flex-shrink-0" />}
      </button>
      {isOpen && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}

function ReviewRow({ label, value }) {
  return (
    <div className="flex gap-4 px-5 py-3.5">
      <span className="eyebrow w-36 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-ink-900 flex-1 text-right">{value}</span>
    </div>
  );
}

function RoteiroSection({ icon, label, cards = [] }) {
  if (!cards.length) return null;
  return (
    <div>
      <p className="eyebrow mb-3">{icon} {label}</p>
      <div className="flex flex-col gap-3">
        {cards.map((card, i) => (
          <div key={i} className="card flex gap-3 p-3">
            {card.fotoUrl && (
              <img src={card.fotoUrl} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-ink-900 leading-tight">{card.nome}</p>
              <p className="text-xs text-ink-400 mt-0.5">
                ⭐ {card.nota} · {card.preco}
              </p>
              <p className="text-xs italic text-ink-600 mt-1 leading-snug">{card.frase}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
