import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, ArrowLeft, Calendar, FileText, Image as ImageIcon, Music, Play, Pause, Search, Check, Sparkles, AlertCircle, Plus, Trash2, Trophy, Key, RotateCcw, Mic, Square, UploadCloud, Wand2 } from 'lucide-react';

export default function CreatorWizard() {
  const navigate = useNavigate();

  // Form states
  const [formData, setFormData] = useState({
    titulo: '',
    dataInicio: '',
    mensagem: '',
    fotos: [], // Holds backend uploaded Polaroid URLs
    musicaTitulo: '',
    musicaUrl: '',
    conquistas: [], // Array of { titulo, descricao, fotoUrl }
    palavraSecreta: '',
    palavraSecretaDica: '',
    opcoesRoleta: ['Jantar Especial 🍝', 'Cinema em Casa 🎬', 'Massagem Relaxante 💆‍♂️', 'Piquenique no Parque 🧺', 'Viagem de Fim de Semana 🚗'],
    audioUrl: '',
    cupidoComentario: '',
    dataNasc1: '',
    dataNasc2: '',
    signo1: null,
    signo2: null,
    horoscopoTexto: '',
    cidade: '',
    bairro: '',
    sugestaoDates: ''
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [isUploading, setIsUploading] = useState(false);
  
  // iTunes Music States
  const [songQuery, setSongQuery] = useState('');
  const [songResults, setSongResults] = useState([]);
  const [isSearchingSongs, setIsSearchingSongs] = useState(false);
  const [previewPlayingUrl, setPreviewPlayingUrl] = useState('');
  
  // Custom Milestone (Conquistas) States
  const [milestoneTitle, setMilestoneTitle] = useState('');
  const [milestoneDesc, setMilestoneDesc] = useState('');
  const [milestonePhoto, setMilestonePhoto] = useState('');
  const [isUploadingMilestonePhoto, setIsUploadingMilestonePhoto] = useState(false);

  // Custom Roulette States
  const [newRouletteOption, setNewRouletteOption] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const audioRef = useRef(null);

  // Voice Recording & Cupid AI States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState('');
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [isGeneratingCommentary, setIsGeneratingCommentary] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerIntervalRef = useRef(null);

  // Horoscope / Sinastry States & Handler
  const [isGeneratingHoroscope, setIsGeneratingHoroscope] = useState(false);
  const [isGeneratingDates, setIsGeneratingDates] = useState(false);

  const handleGenerateDateSuggestions = async () => {
    if (!formData.cidade || !formData.bairro) return;
    setIsGeneratingDates(true);
    setFormError('');
    try {
      const response = await fetch('http://localhost:3001/api/dates/suggest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          titulo: formData.titulo,
          cidade: formData.cidade,
          bairro: formData.bairro
        })
      });
      const data = await response.json();
      if (response.ok) {
        setFormData(prev => ({
          ...prev,
          sugestaoDates: data.sugestaoDates
        }));
      } else {
        setFormError(data.error || 'Erro ao sugerir encontros românticos.');
      }
    } catch (err) {
      console.error('Date suggestion generation failed:', err);
      setFormError('Erro de conexão ao gerar sugestões de dates. O backend está rodando?');
    } finally {
      setIsGeneratingDates(false);
    }
  };

  const handleGenerateHoroscope = async () => {
    if (!formData.dataNasc1 || !formData.dataNasc2) return;
    setIsGeneratingHoroscope(true);
    setFormError('');
    try {
      const response = await fetch('http://localhost:3001/api/horoscope/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          titulo: formData.titulo,
          dataInicio: formData.dataInicio,
          dataNasc1: formData.dataNasc1,
          dataNasc2: formData.dataNasc2
        })
      });
      const data = await response.json();
      if (response.ok) {
        setFormData(prev => ({
          ...prev,
          signo1: data.signo1,
          signo2: data.signo2,
          horoscopoTexto: data.horoscopoTexto
        }));
      } else {
        setFormError(data.error || 'Erro ao gerar sinastria cósmica.');
      }
    } catch (err) {
      console.error('Horoscope calculation failed:', err);
      setFormError('Erro de conexão ao gerar o horóscopo. O backend está rodando?');
    } finally {
      setIsGeneratingHoroscope(false);
    }
  };

  // Clean up recording resources on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Browser voice recording functions
  const handleStartRecording = async () => {
    setFormError('');
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const localUrl = URL.createObjectURL(audioBlob);
        setRecordedAudioUrl(localUrl);
        await handleUploadAudioBlob(audioBlob);
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (err) {
      console.error('Failed to start recording:', err);
      setFormError('Permissão para usar o microfone foi negada ou não é suportada neste navegador.');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    }
  };

  // Upload recording Blob
  const handleUploadAudioBlob = async (blob) => {
    setIsUploadingAudio(true);
    setFormError('');
    setProcessingStatus('Enviando áudio para o servidor...');
    
    const uploadData = new FormData();
    uploadData.append('audio', blob, 'recording.webm');
    uploadData.append('titulo', formData.titulo);
    uploadData.append('mensagem', formData.mensagem);
    
    // Simulate loader transition stages for real visual feedback
    const stage2Timer = setTimeout(() => {
      setProcessingStatus('Transcrevendo fala (OpenAI Whisper)...');
    }, 1200);
    
    const stage3Timer = setTimeout(() => {
      setProcessingStatus('Consultando Claude para o veredito do Cupido...');
    }, 2800);
    
    try {
      const response = await fetch('http://localhost:3001/api/uploads/page-audio', {
        method: 'POST',
        body: uploadData
      });
      const data = await response.json();
      
      clearTimeout(stage2Timer);
      clearTimeout(stage3Timer);
      
      if (data.url) {
        setProcessingStatus('Cupido formulou o veredito!');
        setFormData(prev => ({
          ...prev,
          audioUrl: data.url,
          cupidoComentario: data.cupidoComentario || ''
        }));
      } else {
        setFormError('Erro ao enviar áudio gravado.');
      }
    } catch (e) {
      clearTimeout(stage2Timer);
      clearTimeout(stage3Timer);
      console.error('Audio upload error:', e);
      setFormError('Erro de conexão ao enviar áudio gravado.');
    } finally {
      setIsUploadingAudio(false);
      setProcessingStatus('');
    }
  };

  // Upload local audio file
  const handleAudioFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setFormError('');
    setIsUploadingAudio(true);
    setProcessingStatus('Enviando arquivo de áudio...');
    
    const uploadData = new FormData();
    uploadData.append('audio', file);
    uploadData.append('titulo', formData.titulo);
    uploadData.append('mensagem', formData.mensagem);
    
    const stage2Timer = setTimeout(() => {
      setProcessingStatus('Transcrevendo fala (OpenAI Whisper)...');
    }, 1200);
    
    const stage3Timer = setTimeout(() => {
      setProcessingStatus('Consultando Claude para o veredito do Cupido...');
    }, 2800);
    
    try {
      const response = await fetch('http://localhost:3001/api/uploads/page-audio', {
        method: 'POST',
        body: uploadData
      });
      const data = await response.json();
      
      clearTimeout(stage2Timer);
      clearTimeout(stage3Timer);
      
      if (data.url) {
        setProcessingStatus('Cupido formulou o veredito!');
        setFormData(prev => ({
          ...prev,
          audioUrl: data.url,
          cupidoComentario: data.cupidoComentario || ''
        }));
        setRecordedAudioUrl(`http://localhost:3001${data.url}`);
      } else {
        setFormError('Erro ao enviar arquivo de áudio.');
      }
    } catch (error) {
      clearTimeout(stage2Timer);
      clearTimeout(stage3Timer);
      console.error('Audio file upload error:', error);
      setFormError('Erro de conexão ao enviar arquivo de áudio.');
    } finally {
      setIsUploadingAudio(false);
      setProcessingStatus('');
    }
  };

  // Auto-focus on inputs
  const inputRef = useRef(null);
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [currentStep]);

  // Audio preview player management
  const handleTogglePlaySong = (url) => {
    if (previewPlayingUrl === url) {
      audioRef.current.pause();
      setPreviewPlayingUrl('');
    } else {
      setPreviewPlayingUrl(url);
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play().catch(e => console.log("Audio play failed: ", e));
      }
    }
  };

  // Search songs on iTunes API
  const handleSearchSongs = async () => {
    if (!songQuery.trim()) return;
    setIsSearchingSongs(true);
    try {
      const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(songQuery)}&media=music&limit=6`);
      const data = await response.json();
      setSongResults(data.results || []);
    } catch (e) {
      console.error("iTunes search failed:", e);
    } finally {
      setIsSearchingSongs(false);
    }
  };

  // Upload photos to backend as they are chosen
  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    if (formData.fotos.length + files.length > 8) {
      setFormError('Você pode escolher no máximo 8 fotos para as Polaroids.');
      return;
    }

    setFormError('');
    setIsUploading(true);
    const uploadData = new FormData();
    files.forEach(file => {
      uploadData.append('photos', file);
    });

    try {
      const response = await fetch('http://localhost:3001/api/uploads/page-photo', {
        method: 'POST',
        body: uploadData
      });
      const data = await response.json();
      if (data.urls) {
        setFormData(prev => ({
          ...prev,
          fotos: [...prev.fotos, ...data.urls]
        }));
      } else if (data.error) {
        setFormError(data.error);
      }
    } catch (error) {
      console.error('File upload failed:', error);
      setFormError('Erro ao enviar fotos. O backend está ativo?');
    } finally {
      setIsUploading(false);
    }
  };

  // Upload photo for specific couple milestone (Conquista)
  const handleMilestonePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFormError('');
    setIsUploadingMilestonePhoto(true);
    const uploadData = new FormData();
    uploadData.append('photos', file); // Multer expects 'photos' array

    try {
      const response = await fetch('http://localhost:3001/api/uploads/page-photo', {
        method: 'POST',
        body: uploadData
      });
      const data = await response.json();
      if (data.urls && data.urls.length > 0) {
        setMilestonePhoto(data.urls[0]);
      } else {
        setFormError('Erro ao enviar foto do marco.');
      }
    } catch (error) {
      console.error('Milestone photo upload failed:', error);
      setFormError('Erro de conexão ao enviar foto do marco.');
    } finally {
      setIsUploadingMilestonePhoto(false);
    }
  };

  // Remove photo from state
  const handleRemovePhoto = (index) => {
    setFormData(prev => ({
      ...prev,
      fotos: prev.fotos.filter((_, i) => i !== index)
    }));
  };

  // Add a couple milestone (Conquistas)
  const handleAddMilestone = () => {
    setFormError('');
    if (!milestoneTitle.trim()) {
      setFormError('Digite um título para a conquista.');
      return;
    }
    if (!milestonePhoto) {
      setFormError('Por favor, envie uma foto para esta conquista.');
      return;
    }

    setFormData(prev => ({
      ...prev,
      conquistas: [
        ...prev.conquistas,
        {
          titulo: milestoneTitle,
          descricao: milestoneDesc,
          fotoUrl: milestonePhoto
        }
      ]
    }));

    // Clear sub-form fields
    setMilestoneTitle('');
    setMilestoneDesc('');
    setMilestonePhoto('');
  };

  // Remove milestone
  const handleRemoveMilestone = (index) => {
    setFormData(prev => ({
      ...prev,
      conquistas: prev.conquistas.filter((_, i) => i !== index)
    }));
  };

  // Add roulette option
  const handleAddRouletteOption = () => {
    if (!newRouletteOption.trim()) return;
    setFormData(prev => ({
      ...prev,
      opcoesRoleta: [...prev.opcoesRoleta, newRouletteOption.trim()]
    }));
    setNewRouletteOption('');
  };

  // Remove roulette option
  const handleRemoveRouletteOption = (index) => {
    setFormData(prev => ({
      ...prev,
      opcoesRoleta: prev.opcoesRoleta.filter((_, i) => i !== index)
    }));
  };

  // Next step navigation with validation
  const handleNextStep = () => {
    setFormError('');
    if (currentStep === 1 && !formData.titulo.trim()) {
      setFormError('Por favor, digite o nome do casal.');
      return;
    }
    if (currentStep === 2) {
      if (!formData.dataInicio) {
        setFormError('Por favor, selecione a data do início.');
        return;
      }
      // If birth dates are filled and we haven't generated the horoscope yet, we generate it first!
      if (formData.dataNasc1 && formData.dataNasc2 && !formData.horoscopoTexto) {
        handleGenerateHoroscope();
        return; // Don't advance yet, show them the horoscope so they can read/edit it!
      }
    }
    if (currentStep === 3) {
      if (!formData.cidade.trim() || !formData.bairro.trim()) {
        setFormError('Por favor, informe a Cidade e o Bairro para sugerirmos dates românticos.');
        return;
      }
      if (!formData.sugestaoDates) {
        handleGenerateDateSuggestions();
        return; // Don't advance yet, show the suggestions!
      }
    }
    if (currentStep === 4 && !formData.mensagem.trim()) {
      setFormError('Por favor, escreva uma mensagem de amor.');
      return;
    }

    setCurrentStep(prev => prev + 1);
  };

  const handlePrevStep = () => {
    setFormError('');
    setCurrentStep(prev => Math.max(1, prev - 1));
  };

  // Submit E2E free configuration
  const handleSubmitForm = async () => {
    setIsSubmitting(true);
    setFormError('');

    // Generate unique slug
    const cleanNames = formData.titulo
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') 
      .replace(/[^a-z0-9\s-]/g, '') 
      .trim()
      .replace(/\s+/g, '-');
    const uniqueSlug = `${cleanNames}-${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      const payload = {
        slug: uniqueSlug,
        email: '',
        status: 'paid', // 100% active by default
        data: {
          titulo: formData.titulo,
          dataInicio: formData.dataInicio,
          mensagem: formData.mensagem,
          fotos: formData.fotos,
          musicaTitulo: formData.musicaTitulo,
          musicaUrl: formData.musicaUrl,
          conquistas: formData.conquistas,
          palavraSecreta: formData.palavraSecreta,
          palavraSecretaDica: formData.palavraSecretaDica,
          opcoesRoleta: formData.opcoesRoleta,
          audioUrl: formData.audioUrl,
          cupidoComentario: formData.cupidoComentario,
          dataNasc1: formData.dataNasc1,
          dataNasc2: formData.dataNasc2,
          signo1: formData.signo1,
          signo2: formData.signo2,
          horoscopoTexto: formData.horoscopoTexto,
          cidade: formData.cidade,
          bairro: formData.bairro,
          sugestaoDates: formData.sugestaoDates
        }
      };

      const response = await fetch('http://localhost:3001/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const resData = await response.json();
      
      if (response.ok && resData.success) {
        sessionStorage.setItem(`couple-page-draft-${uniqueSlug}`, JSON.stringify({
          ...formData,
          slug: uniqueSlug
        }));
        localStorage.setItem("couple-page-last", uniqueSlug);

        if (audioRef.current) {
          audioRef.current.pause();
        }

        // Redirect directly E2E
        navigate(`/p/${uniqueSlug}`);
      } else {
        setFormError('Erro ao salvar no servidor. Tente novamente.');
      }
    } catch (e) {
      console.error('Submit error:', e);
      setFormError('Erro de conexão. O backend está rodando?');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepFields = () => {
    switch(currentStep) {
      case 1:
        return (
          <div className="flex flex-col gap-4">
            <label className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <span>❤️</span> Nome do casal
            </label>
            <p className="text-xs text-slate-500 font-bold">Como vocês chamam o casal — aparece no topo da página (ex: Mariana & João).</p>
            <input 
              ref={inputRef}
              type="text" 
              placeholder="Ex: Mariana & João"
              value={formData.titulo}
              onChange={(e) => setFormData({...formData, titulo: e.target.value})}
              className="w-full px-5 py-4 border border-pink-200 rounded-2xl bg-white text-slate-805 font-bold text-lg shadow-sm focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
            />
          </div>
        );
      case 2:
        return (
          <div className="flex flex-col gap-4">
            <label className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <Calendar className="w-4.5 h-4.5 text-rose-500" /> Datas Especiais & Sinastria
            </label>
            <p className="text-xs text-slate-500 font-bold">
              Insira a data do início do relacionamento para o contador, e as datas de nascimento de vocês para a Sinastria Cósmica.
            </p>
            
            <div className="flex flex-col gap-3">
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide">Data do Início do Relacionamento *</span>
                <input 
                  type="date" 
                  value={formData.dataInicio}
                  onChange={(e) => setFormData({...formData, dataInicio: e.target.value})}
                  className="w-full mt-1 px-4 py-3 border border-pink-200 rounded-xl bg-white text-slate-800 font-bold text-sm shadow-sm focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide">Sua Data de Nascimento</span>
                  <input 
                    type="date" 
                    value={formData.dataNasc1 || ''}
                    onChange={(e) => setFormData({...formData, dataNasc1: e.target.value, horoscopoTexto: ''})}
                    className="w-full mt-1 px-4 py-3 border border-pink-200 rounded-xl bg-white text-slate-800 font-bold text-sm shadow-sm focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide">Nascimento do seu Amor</span>
                  <input 
                    type="date" 
                    value={formData.dataNasc2 || ''}
                    onChange={(e) => setFormData({...formData, dataNasc2: e.target.value, horoscopoTexto: ''})}
                    className="w-full mt-1 px-4 py-3 border border-pink-200 rounded-xl bg-white text-slate-800 font-bold text-sm shadow-sm focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
                  />
                </div>
              </div>
            </div>

            {/* Horoscope Generation status / results */}
            {isGeneratingHoroscope ? (
              <div className="mt-4 border-2 border-dashed border-rose-300 rounded-2xl p-6 bg-rose-50/25 flex flex-col items-center justify-center gap-2 animate-pulse">
                <div className="w-8 h-8 border-3 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs font-black text-rose-500">Lendo as estrelas e consultando o Claude... 🌌👼</p>
              </div>
            ) : formData.horoscopoTexto ? (
              <div className="mt-4 border border-pink-200 bg-rose-50/25 rounded-2xl p-4 flex flex-col gap-2.5 shadow-sm">
                <div className="flex items-center justify-between border-b border-pink-100 pb-2">
                  <span className="text-xs font-black text-rose-800 uppercase tracking-widest flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" /> Sinastria Cósmica Gerada: {formData.signo1?.symbol} + {formData.signo2?.symbol}
                  </span>
                  <span className="text-[9px] font-black text-slate-400 uppercase">Sinta-se livre para editar</span>
                </div>
                <textarea
                  rows={5}
                  value={formData.horoscopoTexto}
                  onChange={(e) => setFormData({...formData, horoscopoTexto: e.target.value})}
                  className="w-full p-3 border border-pink-200 rounded-xl bg-white text-xs font-bold text-slate-700 resize-none focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
                />
              </div>
            ) : (
              formData.dataNasc1 && formData.dataNasc2 && (
                <button
                  type="button"
                  onClick={handleGenerateHoroscope}
                  className="mt-2 w-full py-3 bg-gradient-to-r from-pink-500 to-rose-500 hover:opacity-95 text-white border border-transparent font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-pink-500/20 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Calcular Sinastria Cósmica (Claude)
                </button>
              )
            )}
          </div>
        );
      case 3:
        return (
          <div className="flex flex-col gap-4">
            <label className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <span>📍</span> Sugestão de Dates Românticos
            </label>
            <p className="text-xs text-slate-500 font-bold">
              Informe sua cidade e bairro para sugerirmos um dia perfeito de encontros (café da manhã, almoço e jantar).
            </p>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide">Cidade *</span>
                <input 
                  type="text" 
                  placeholder="Ex: São Paulo"
                  value={formData.cidade}
                  onChange={(e) => setFormData({...formData, cidade: e.target.value, sugestaoDates: ''})}
                  className="w-full mt-1 px-4 py-3 border border-pink-200 rounded-xl bg-white text-slate-805 font-bold text-sm shadow-sm focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
                />
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide">Bairro *</span>
                <input 
                  type="text" 
                  placeholder="Ex: Pinheiros"
                  value={formData.bairro}
                  onChange={(e) => setFormData({...formData, bairro: e.target.value, sugestaoDates: ''})}
                  className="w-full mt-1 px-4 py-3 border border-pink-200 rounded-xl bg-white text-slate-805 font-bold text-sm shadow-sm focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
                />
              </div>
            </div>

            {isGeneratingDates ? (
              <div className="mt-4 border-2 border-dashed border-orange-300 rounded-2xl p-6 bg-orange-50/25 flex flex-col items-center justify-center gap-2 animate-pulse">
                <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs font-black text-orange-500">Buscando melhores locais na região com o Claude... ☕🥐🕯️</p>
              </div>
            ) : formData.sugestaoDates ? (
              <div className="mt-4 border border-pink-200 bg-rose-50/25 rounded-2xl p-4 flex flex-col gap-2.5 shadow-sm">
                <div className="flex items-center justify-between border-b border-pink-100 pb-2">
                  <span className="text-xs font-black text-rose-800 uppercase tracking-widest flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" /> Roteiro de Dates Sugerido:
                  </span>
                  <span className="text-[9px] font-black text-slate-400 uppercase">Sinta-se livre para editar</span>
                </div>
                <textarea
                  rows={8}
                  value={formData.sugestaoDates}
                  onChange={(e) => setFormData({...formData, sugestaoDates: e.target.value})}
                  className="w-full p-3 border border-pink-200 rounded-xl bg-white text-xs font-bold text-slate-700 resize-none focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
                />
              </div>
            ) : (
              formData.cidade && formData.bairro && (
                <button
                  type="button"
                  onClick={handleGenerateDateSuggestions}
                  className="mt-2 w-full py-3 bg-gradient-to-r from-pink-500 to-rose-500 hover:opacity-95 text-white border border-transparent font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-pink-500/20 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Gerar Roteiro de Dates (Claude)
                </button>
              )
            )}
          </div>
        );
      case 4:
        return (
          <div className="flex flex-col gap-4">
            <label className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <FileText className="w-4.5 h-4.5 text-rose-500" /> Mensagem especial
            </label>
            <p className="text-xs text-slate-500 font-bold">Sua carta de amor dedicada, que aparece em destaque na página.</p>
            <textarea 
              ref={inputRef}
              rows={4}
              placeholder="Minha vida ficou muito melhor depois que te conheci..."
              value={formData.mensagem}
              onChange={(e) => setFormData({...formData, mensagem: e.target.value})}
              className="w-full px-5 py-4 border border-pink-200 rounded-2xl bg-white text-slate-805 font-bold text-base shadow-sm focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 resize-none"
            />
          </div>
        );
      case 5:
        return (
          <div className="flex flex-col gap-4">
            <label className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <ImageIcon className="w-4.5 h-4.5 text-rose-500" /> Fotos em Polaroid
            </label>
            <p className="text-xs text-slate-500 font-bold">Selecione até 8 fotos para exibir em formato Polaroid com fade.</p>
            
            <div className="relative border-[3px] border-dashed border-slate-300 rounded-3xl p-6 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors">
              <input 
                type="file" 
                multiple 
                accept="image/*"
                onChange={handleFileChange}
                disabled={isUploading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <ImageIcon className="w-10 h-10 text-slate-400 mb-2" />
              <p className="text-sm font-bold text-slate-600">
                {isUploading ? 'Enviando imagens...' : 'Clique para selecionar fotos'}
              </p>
            </div>

            {formData.fotos.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mt-4">
                {formData.fotos.map((url, idx) => (
                  <div key={idx} className="relative aspect-square border border-pink-200 rounded-xl overflow-hidden shadow-md shadow-pink-100/20 bg-white p-1">
                    <img src={`http://localhost:3001${url}`} alt="polaroid" className="w-full h-full object-cover rounded-lg" />
                    <button 
                      onClick={() => handleRemovePhoto(idx)}
                      className="absolute -top-1 -right-1 bg-red-500 border border-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-black hover:bg-red-600 shadow cursor-pointer"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case 6:
        return (
          <div className="flex flex-col gap-4">
            <label className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <Trophy className="w-4.5 h-4.5 text-rose-500" /> Conquistas do Casal (Linha do Tempo)
            </label>
            <p className="text-xs text-slate-500 font-bold">Marcos e conquistas do casal (ex: primeiro carro 🚗, o apartamento 🏢, a primeira viagem ✈️).</p>
            
            {/* Subform to add milestones */}
            <div className="border-2 border-slate-200 rounded-2xl p-4 bg-slate-50 flex flex-col gap-3">
              <input 
                type="text" 
                placeholder="Título: Ex: Nosso primeiro apartamento 🏢"
                value={milestoneTitle}
                onChange={(e) => setMilestoneTitle(e.target.value)}
                className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg font-bold text-xs bg-white focus:outline-none"
              />
              <input 
                type="text" 
                placeholder="Descrição rápida: Ex: Conquistamos a chave do nosso apê!"
                value={milestoneDesc}
                onChange={(e) => setMilestoneDesc(e.target.value)}
                className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg font-bold text-xs bg-white focus:outline-none"
              />
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleMilestonePhotoChange}
                    disabled={isUploadingMilestonePhoto}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <button 
                    type="button" 
                    className="w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-lg font-bold text-xs text-slate-600 text-left truncate flex items-center gap-1.5"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    {isUploadingMilestonePhoto ? 'Carregando...' : milestonePhoto ? '✓ Foto selecionada' : 'Adicionar foto da conquista'}
                  </button>
                </div>
                <button 
                  type="button"
                  onClick={handleAddMilestone}
                  className="px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-black rounded-lg text-xs flex items-center gap-1 cursor-pointer hover:from-pink-600 hover:to-rose-600 shadow-md shadow-pink-500/20 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar
                </button>
              </div>
            </div>

            {/* List of current milestones */}
            {formData.conquistas.length > 0 && (
              <div className="flex flex-col gap-2 mt-2">
                {formData.conquistas.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 border border-slate-200 rounded-xl bg-white">
                    <div className="flex items-center gap-3 min-w-0">
                      <img src={`http://localhost:3001${item.fotoUrl}`} alt="milestone" className="w-10 h-10 rounded-lg object-cover" />
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-800 truncate">{item.titulo}</p>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">{item.descricao}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleRemoveMilestone(idx)}
                      className="p-1 text-slate-400 hover:text-red-500 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

          </div>
        );
      case 7:
        return (
          <div className="flex flex-col gap-4">
            {/* Wordgame config */}
            <div>
              <label className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <Key className="w-4.5 h-4.5 text-rose-500" /> Palavra Secreta
              </label>
              <p className="text-xs text-slate-500 font-bold mt-1">Um jogo onde seu amor descobre uma palavra decifrando a dica.</p>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <input 
                  type="text" 
                  placeholder="Palavra: Ex: TEAMO"
                  value={formData.palavraSecreta}
                  onChange={(e) => setFormData({...formData, palavraSecreta: e.target.value.toUpperCase().replace(/\s/g, '')})}
                  className="w-full px-3 py-2 border border-pink-200 rounded-xl font-bold text-xs bg-white focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100 transition-colors"
                />
                <input 
                  type="text" 
                  placeholder="Dica: Ex: Sentimento por você"
                  value={formData.palavraSecretaDica}
                  onChange={(e) => setFormData({...formData, palavraSecretaDica: e.target.value})}
                  className="w-full px-3 py-2 border border-pink-200 rounded-xl font-bold text-xs bg-white focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100 transition-colors"
                />
              </div>
            </div>

            <hr className="border-slate-100 my-2" />

            {/* Roulette config */}
            <div>
              <label className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <RotateCcw className="w-4.5 h-4.5 text-rose-500" /> Roleta do Destino
              </label>
              <p className="text-xs text-slate-500 font-bold mt-1">Opções para rodar a roleta e decidir o que fazer no próximo encontro.</p>
              
              <div className="flex gap-2 mt-3">
                <input 
                  type="text" 
                  placeholder="Nova opção (Ex: Jantar Italiano 🍕)"
                  value={newRouletteOption}
                  onChange={(e) => setNewRouletteOption(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddRouletteOption()}
                  className="flex-1 px-3 py-2 border border-pink-250 rounded-xl font-semibold text-xs focus:outline-none focus:border-pink-500"
                />
                <button 
                  onClick={handleAddRouletteOption}
                  className="px-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white border border-transparent font-black rounded-xl text-xs flex items-center justify-center cursor-pointer shadow shadow-pink-500/20"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 mt-3">
                {formData.opcoesRoleta.map((opt, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-slate-300 bg-white font-bold text-[10px] text-slate-700 shadow-sm">
                    {opt}
                    <button 
                      onClick={() => handleRemoveRouletteOption(idx)}
                      className="text-slate-400 hover:text-red-500 ml-1 font-black cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

          </div>
        );
      case 8:
        return (
          <div className="flex flex-col gap-4">
            <label className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <Music className="w-4.5 h-4.5 text-rose-500" /> Trilha sonora especial
            </label>
            <p className="text-xs text-slate-500 font-bold">Pesquise e selecione a música que marca a história de vocês.</p>

            <div className="flex gap-2">
              <input 
                ref={inputRef}
                type="text" 
                placeholder="Ex: Perfect - Ed Sheeran"
                value={songQuery}
                onChange={(e) => setSongQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchSongs()}
                className="flex-1 px-4 py-3 border border-pink-200 rounded-xl bg-white text-slate-805 font-bold text-sm shadow-sm focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
              />
              <button 
                onClick={handleSearchSongs}
                disabled={isSearchingSongs}
                className="px-4 py-3 bg-gradient-to-r from-pink-500 to-rose-500 border border-transparent text-white font-black rounded-xl text-xs hover:opacity-95 shadow-md shadow-pink-500/25 flex items-center gap-1.5 cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" />
                Buscar
              </button>
            </div>

            {isSearchingSongs ? (
              <p className="text-xs text-slate-400 font-bold animate-pulse text-center py-4">Buscando faixas...</p>
            ) : (
              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                {songResults.map((song) => (
                  <div 
                    key={song.trackId}
                    className={`flex items-center justify-between p-2 border rounded-xl bg-white transition-all ${
                      formData.musicaUrl === song.previewUrl 
                        ? 'border-rose-500 shadow-sm bg-rose-50/30' 
                        : 'border-pink-100 hover:border-pink-400'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img src={song.artworkUrl60} alt="cover" className="w-8 h-8 rounded-lg object-cover" />
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-800 truncate leading-none">{song.trackName}</p>
                        <p className="text-[10px] font-bold text-slate-400 truncate mt-1">{song.artistName}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button 
                        type="button"
                        onClick={() => handleTogglePlaySong(song.previewUrl)}
                        className="p-1 rounded-full border border-pink-200 hover:border-pink-500 bg-white cursor-pointer"
                      >
                        {previewPlayingUrl === song.previewUrl ? <Pause className="w-3 h-3 text-rose-500" /> : <Play className="w-3 h-3 text-slate-500" />}
                      </button>

                      <button 
                        type="button"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            musicaTitulo: `${song.trackName} - ${song.artistName}`,
                            musicaUrl: song.previewUrl
                          });
                        }}
                        className={`px-2 py-1 rounded-lg border text-[9px] font-black cursor-pointer ${
                          formData.musicaUrl === song.previewUrl
                            ? 'bg-rose-500 text-white border-rose-500'
                            : 'bg-white text-slate-800 border-pink-350'
                        }`}
                      >
                        {formData.musicaUrl === song.previewUrl ? 'Selecionada' : 'Selecionar'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {formData.musicaTitulo && (
              <div className="bg-emerald-50 border-2 border-emerald-500 rounded-xl p-3 flex items-center justify-between text-xs mt-2">
                <div>
                  <p className="text-[10px] font-black text-emerald-800 uppercase tracking-wide">Trilha Selecionada</p>
                  <p className="font-bold text-slate-800 mt-0.5">{formData.musicaTitulo}</p>
                </div>
                <Check className="w-5 h-5 text-emerald-600" />
              </div>
            )}
          </div>
        );
      case 9:
        return (
          <div className="flex flex-col gap-4">
            <label className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <Mic className="w-4.5 h-4.5 text-rose-500" /> Áudio Especial & Considerações do Cupido
            </label>
            <p className="text-xs text-slate-500 font-bold">
              Grave uma mensagem ou faça o upload de um áudio. O Cupido usará o conteúdo para escrever considerações românticas especiais sobre vocês!
            </p>

            {/* Guidelines Card */}
            <div className="bg-amber-50/70 border-2 border-amber-200 rounded-2xl p-4 text-xs text-slate-700">
              <p className="font-black text-amber-900 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> O que falar no áudio (Instruções simples):
              </p>
              <ul className="list-disc pl-4 space-y-1 font-bold text-slate-650">
                <li>Diga o nome de vocês e como se conheceram ou comecem a falar da história de vocês.</li>
                <li>Fale sobre uma mania fofa ou detalhe que você mais ama no seu parceiro(a).</li>
                <li>Deixe uma jura sincera de amor ou desejo para o futuro de vocês.</li>
                <li>Mantenha o tom natural e sincero, fale com o coração!</li>
              </ul>
            </div>

            {/* Recorder Controls */}
            <div className="flex flex-col gap-3 p-4 border border-pink-150 rounded-2xl bg-slate-50/50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-550 uppercase tracking-wider">Gravar pelo Navegador</span>
                {isRecording && (
                  <span className="flex items-center gap-1 text-xs text-red-500 font-black animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                {!isRecording ? (
                  <button
                    type="button"
                    onClick={handleStartRecording}
                    disabled={isUploadingAudio}
                    className="flex-1 py-3 bg-red-500 hover:bg-red-655 text-white border border-transparent font-black rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-red-500/20 cursor-pointer"
                  >
                    <Mic className="w-4 h-4" /> Iniciar Gravação
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStopRecording}
                    className="flex-1 py-3 bg-gradient-to-r from-pink-600 to-rose-600 text-white border border-transparent font-black rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-pink-500/20 cursor-pointer animate-pulse"
                  >
                    <Square className="w-4 h-4 fill-white" /> Parar e Salvar
                  </button>
                )}
                
                {/* Upload File Alternative */}
                <div className="relative flex-1">
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleAudioFileChange}
                    disabled={isRecording || isUploadingAudio}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <button
                    type="button"
                    disabled={isRecording || isUploadingAudio}
                    className="w-full py-3 bg-white border border-pink-200 text-pink-600 font-black rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-sm hover:bg-pink-50/20 cursor-pointer"
                  >
                    <UploadCloud className="w-4 h-4" />
                    {isUploadingAudio ? 'Enviando...' : 'Enviar Arquivo'}
                  </button>
                </div>
              </div>

              {recordedAudioUrl && (
                <div className="mt-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ouvir Gravação Atual</p>
                  <audio src={recordedAudioUrl} controls className="w-full mt-1.5 rounded-lg border border-pink-200 bg-white" />
                </div>
              )}
            </div>

            {/* Cupid AI Commentary Block */}
            <div className="border border-pink-200 bg-rose-50/25 rounded-2xl p-4 flex flex-col gap-2.5 shadow-sm">
              <div className="flex items-center justify-between border-b border-pink-100 pb-2">
                <span className="text-xs font-black text-rose-800 uppercase tracking-widest flex items-center gap-1">
                  <Wand2 className="w-3.5 h-3.5" /> Considerações do Cupido (IA)
                </span>
                {isUploadingAudio && (
                  <span className="text-[10px] text-rose-500 font-bold animate-pulse">👼 Processando...</span>
                )}
              </div>

              {isUploadingAudio ? (
                <div className="py-6 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 border border-pink-300 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs font-black text-rose-455 animate-pulse text-center">
                    {processingStatus || 'Analisando áudio...'}
                  </p>
                </div>
              ) : (
                <textarea
                  rows={4}
                  placeholder="Grave ou envie um áudio acima para que o Cupido escreva considerações românticas sobre vocês, ou edite diretamente o veredito gerado aqui!"
                  value={formData.cupidoComentario}
                  onChange={(e) => setFormData({...formData, cupidoComentario: e.target.value})}
                  className="w-full p-3 border border-pink-200 rounded-xl bg-white text-xs text-slate-750 font-semibold resize-none focus:outline-none focus:border-pink-500"
                />
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-sugar-50 text-slate-800 font-sans flex flex-col justify-between select-none">
      
      <audio ref={audioRef} onEnded={() => setPreviewPlayingUrl('')} />

      <header className="border-b border-pink-100 bg-white/80 backdrop-blur-md py-4 px-6 flex items-center justify-between shadow-sm">
        <a href="/" className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-pink-500 fill-pink-500" />
          <span className="font-display font-black text-lg text-pink-600 tracking-tight">Chamego</span>
        </a>
        <div className="text-xs font-black text-slate-450 uppercase tracking-widest text-pink-500">
          🎬 Cenas Românticas Premium
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-5 py-8 grid md:grid-cols-[1fr_340px] gap-8 items-start">
        
        {/* Left Form */}
        <div className="bg-white border border-pink-100 rounded-[32px] p-6 shadow-xl shadow-pink-100/30 flex flex-col justify-between min-h-[500px]">
          
          <div>
            <div className="flex items-center justify-between text-xs font-black text-slate-400 mb-2">
              <span>PASSO {currentStep} DE 9</span>
              <span>{Math.round((currentStep / 9) * 100)}% CONCLUÍDO</span>
            </div>
            
            <div className="h-2 bg-pink-50 border border-pink-100 rounded-full overflow-hidden mb-6">
              <div 
                className="h-full bg-gradient-to-r from-pink-500 to-rose-500 transition-all duration-300"
                style={{ width: `${(currentStep / 9) * 100}%` }}
              />
            </div>

            {formError && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2 text-xs text-red-800 font-bold">
                <AlertCircle className="w-4.5 h-4.5 text-red-600 flex-shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <div className="py-2">
              {renderStepFields()}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-6 mt-6">
            <button 
              onClick={handlePrevStep}
              disabled={currentStep === 1}
              className={`flex items-center gap-1 font-black text-sm transition-all cursor-pointer ${
                currentStep === 1 ? 'opacity-30 cursor-not-allowed text-slate-400' : 'text-slate-655 hover:text-slate-950'
              }`}
            >
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>

            {currentStep < 9 ? (
              <button 
                onClick={handleNextStep}
                className="btn-3d-primary text-sm px-6 py-2.5"
              >
                Avançar →
              </button>
            ) : (
              <button 
                onClick={handleSubmitForm}
                disabled={isSubmitting}
                className="relative inline-flex items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-7 py-3 text-sm font-bold text-white transition-all duration-200 cursor-pointer shadow-lg shadow-emerald-500/25 hover:scale-[1.02] hover:shadow-xl hover:shadow-emerald-500/35"
              >
                {isSubmitting ? 'Salvando...' : '❤️ Criar Página de Graça!'}
              </button>
            )}
          </div>

        </div>

        {/* Right Preview */}
        <div className="hidden md:flex flex-col items-center gap-4">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-spin" /> Prévia ao vivo da página
          </p>

          <div className="border border-pink-200 rounded-[40px] bg-white shadow-xl shadow-pink-150/20 p-2 w-[250px] h-[490px]">
            <div className="w-full h-full rounded-[30px] overflow-hidden bg-rose-50 border border-pink-100 p-4 flex flex-col justify-between relative select-none">
              
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-20">
                <span className="text-xl">❤️</span>
              </div>

              <div className="text-center">
                <div className="text-[10px] font-black uppercase text-pink-500 tracking-wider">Chamego</div>
                <div className="font-marker text-md text-slate-850 truncate mt-1">
                  {formData.titulo || 'Seu Amor'}
                </div>
              </div>

              {/* Live Preview Cards depending on step */}
              {currentStep === 9 ? (
                <div className="bg-gradient-to-br from-rose-50 to-amber-50 p-2.5 border border-pink-100 rounded-xl shadow-md rotate-[-1deg] my-2 flex-1 flex flex-col justify-between max-h-[180px] overflow-hidden select-none">
                  <div className="text-center">
                    <span className="text-md">👼</span>
                    <p className="font-marker text-[9px] text-rose-500 leading-none mt-1">O Veredito do Cupido</p>
                  </div>
                  <div className="bg-white/85 border border-rose-200 rounded-lg p-1.5 flex-1 overflow-y-auto max-h-[85px] mt-1">
                    <p className="text-[7.5px] font-bold text-slate-650 leading-relaxed italic text-center">
                      "{formData.cupidoComentario || 'Grave um áudio para ver o veredito...'}"
                    </p>
                  </div>
                  <div className="bg-slate-900 text-white rounded-full py-1.5 px-2.5 flex items-center justify-center gap-1 text-[7px] font-black uppercase tracking-wider mt-1.5 shadow">
                    <Mic className="w-2 h-2 text-rose-400" /> Play Áudio do Casal
                  </div>
                </div>
              ) : currentStep === 3 ? (
                <div className="bg-gradient-to-br from-amber-50 to-orange-100 p-2.5 border border-pink-100 rounded-xl shadow-md rotate-[1deg] my-2 flex-1 flex flex-col justify-between max-h-[180px] overflow-hidden select-none">
                  <div className="text-center">
                    <span className="text-md">🗺️</span>
                    <p className="font-marker text-[9px] text-orange-650 leading-none mt-1">Dates dos Sonhos</p>
                    <p className="text-[7px] font-black text-slate-455 uppercase mt-0.5">{formData.cidade || 'Sua Cidade'}</p>
                  </div>
                  <div className="bg-white/85 border border-orange-200 rounded-lg p-1.5 flex-1 overflow-y-auto max-h-[85px] mt-1">
                    <p className="text-[7.5px] font-bold text-slate-655 leading-relaxed italic text-center whitespace-pre-line">
                      {formData.sugestaoDates || 'Insira cidade e bairro para gerar as ideias de dates...'}
                    </p>
                  </div>
                  <div className="bg-slate-900 text-white rounded-full py-1 px-2.5 flex items-center justify-center gap-1 text-[6.5px] font-black uppercase tracking-wider mt-1.5 shadow">
                    📍 {formData.bairro || 'Seu Bairro'}
                  </div>
                </div>
              ) : currentStep === 6 && formData.conquistas.length > 0 ? (
                <div className="bg-white p-2 border border-pink-100 rounded-xl shadow-md rotate-[-2deg] my-2 flex-1 flex flex-col justify-between max-h-[160px]">
                  <div className="bg-slate-100 rounded overflow-hidden flex-1">
                    <img 
                      src={`http://localhost:3001${formData.conquistas[formData.conquistas.length - 1].fotoUrl}`} 
                      alt="milestone" 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <p className="font-marker text-[8px] text-center mt-1 text-slate-700 truncate leading-none">
                    🏆 {formData.conquistas[formData.conquistas.length - 1].titulo}
                  </p>
                </div>
              ) : (
                /* Polaroid preview */
                <div className="bg-white p-2 border border-pink-100 rounded-xl shadow-md rotate-2 my-2 flex-1 flex flex-col justify-between max-h-[160px]">
                  <div className="bg-slate-100 rounded overflow-hidden flex-1 flex items-center justify-center">
                    {formData.fotos.length > 0 ? (
                      <img 
                        src={`http://localhost:3001${formData.fotos[formData.fotos.length - 1]}`} 
                        alt="couple" 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-slate-300" />
                    )}
                  </div>
                  <p className="font-marker text-[9px] text-center mt-1 text-slate-700 truncate">
                    {formData.mensagem ? formData.mensagem.substring(0, 15) + '...' : 'Seus momentos!'}
                  </p>
                </div>
              )}

              {/* Counter preview */}
              <div className="bg-white/85 border border-pink-100 rounded-2xl p-2.5 text-center shadow-sm flex flex-col gap-0.5">
                <div className="text-[8px] font-black text-slate-400 uppercase tracking-wide">Tempo Juntos</div>
                <div className="font-black text-slate-800 text-[10px] truncate">
                  {formData.dataInicio ? 'Calculando tempo...' : 'A data especial'}
                </div>
              </div>

              {/* Song bottom preview */}
              {formData.musicaTitulo && (
                <div className="bg-slate-900 text-white rounded-full py-1.5 px-3 flex items-center gap-1.5 text-[8px] font-bold truncate mt-2 shadow">
                  <Music className="w-2.5 h-2.5 text-rose-400 flex-shrink-0 animate-bounce" />
                  <span className="truncate flex-1">{formData.musicaTitulo}</span>
                </div>
              )}

            </div>
          </div>
        </div>

      </main>

      <footer className="text-center py-6 text-xs text-slate-400 border-t border-slate-200 bg-white">
        © 2026 Chamego · Criação Livre 🔓
      </footer>

    </div>
  );
}
