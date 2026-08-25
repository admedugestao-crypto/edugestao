"use client";

import { useEffect, useRef, useState } from "react";
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { SpeechRecognition } from "@capgo/capacitor-speech-recognition";
import { Loader2, Mic, Square } from "lucide-react";

type BrowserSpeechRecognitionEvent = {
  resultIndex: number;
  results: ArrayLike<{ 0?: { transcript?: string } }>;
};

type BrowserSpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export default function DescricaoPorVozMobile({ value, onChange }: Props) {
  const [nativo, setNativo] = useState(false);
  const [ouvindo, setOuvindo] = useState(false);
  const [iniciando, setIniciando] = useState(false);
  const [erro, setErro] = useState("");
  const baseRef = useRef("");
  const listenersRef = useRef<PluginListenerHandle[]>([]);
  const reconhecimentoWebRef = useRef<BrowserSpeechRecognition | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const plataformaNativa = Capacitor.isNativePlatform();
    const timer = window.setTimeout(() => setNativo(plataformaNativa), 0);

    return () => {
      window.clearTimeout(timer);
      listenersRef.current.forEach((listener) => listener.remove());
      reconhecimentoWebRef.current?.abort();
      if (plataformaNativa) SpeechRecognition.stop().catch(() => undefined);
    };
  }, []);

  async function pararDitado() {
    setOuvindo(false);
    if (nativo) {
      await SpeechRecognition.stop().catch(() => undefined);
      await Promise.all(listenersRef.current.map((listener) => listener.remove()));
      listenersRef.current = [];
    } else {
      reconhecimentoWebRef.current?.stop();
      reconhecimentoWebRef.current = null;
    }
  }

  async function iniciarDitadoNativo() {
    try {
      const permissao = await SpeechRecognition.requestPermissions();
      if (permissao.speechRecognition !== "granted") {
        setErro("Permita o uso do microfone para ditar a descrição.");
        return;
      }

      const { available } = await SpeechRecognition.available();
      if (!available) {
        setErro("O reconhecimento de voz não está disponível neste aparelho.");
        return;
      }

      baseRef.current = value.trimEnd();
      const resultadoParcial = await SpeechRecognition.addListener("partialResults", ({ matches, accumulatedText }) => {
        const transcricao = accumulatedText || matches?.[0] || "";
        if (!transcricao) return;
        onChange(baseRef.current ? `${baseRef.current} ${transcricao}` : transcricao);
      });
      const estadoDaEscuta = await SpeechRecognition.addListener("listeningState", ({ status }) => {
        if (status === "stopped") setOuvindo(false);
      });
      listenersRef.current = [resultadoParcial, estadoDaEscuta];

      await SpeechRecognition.start({
        language: "pt-BR",
        partialResults: true,
        addPunctuation: true,
        popup: false,
      });
      setOuvindo(true);
    } catch {
      await Promise.all(listenersRef.current.map((listener) => listener.remove()));
      listenersRef.current = [];
      setErro("Não foi possível iniciar o ditado. Tente novamente.");
    } finally {
      setIniciando(false);
    }
  }

  function iniciarDitadoNoNavegador() {
    const janelaComVoz = window as Window & {
      SpeechRecognition?: BrowserSpeechRecognitionConstructor;
      webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
    };
    const ConstrutorReconhecimento = janelaComVoz.SpeechRecognition ?? janelaComVoz.webkitSpeechRecognition;

    if (!ConstrutorReconhecimento) {
      textareaRef.current?.focus();
      setErro("Neste navegador, use o microfone do teclado do iPhone para ditar a descrição.");
      setIniciando(false);
      return;
    }

    const reconhecimento = new ConstrutorReconhecimento();
    reconhecimento.lang = "pt-BR";
    reconhecimento.continuous = false;
    reconhecimento.interimResults = true;
    baseRef.current = value.trimEnd();

    reconhecimento.onresult = (event) => {
      let transcricao = "";
      for (let indice = event.resultIndex; indice < event.results.length; indice += 1) {
        transcricao += event.results[indice]?.[0]?.transcript ?? "";
      }
      if (transcricao.trim()) {
        onChange(baseRef.current ? `${baseRef.current} ${transcricao.trim()}` : transcricao.trim());
      }
    };
    reconhecimento.onend = () => {
      setOuvindo(false);
      reconhecimentoWebRef.current = null;
    };
    reconhecimento.onerror = () => {
      setOuvindo(false);
      setErro("Não foi possível iniciar o ditado no navegador. Verifique a permissão do microfone.");
      reconhecimentoWebRef.current = null;
    };

    reconhecimentoWebRef.current = reconhecimento;
    try {
      reconhecimento.start();
      setOuvindo(true);
    } catch {
      reconhecimentoWebRef.current = null;
      setErro("Não foi possível iniciar o ditado no navegador. Tente novamente.");
    } finally {
      setIniciando(false);
    }
  }

  async function alternarDitado() {
    if (ouvindo) {
      await pararDitado();
      return;
    }

    setErro("");
    setIniciando(true);
    if (nativo) {
      await iniciarDitadoNativo();
    } else {
      iniciarDitadoNoNavegador();
    }
  }

  return (
    <div>
      <label className="text-xs font-medium text-slate-500 block mb-1">Descrição</label>
      <div className="relative">
        <textarea
          ref={textareaRef}
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border border-slate-200 rounded-xl px-3 py-3 pr-12 text-sm resize-none"
        />
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={alternarDitado}
          disabled={iniciando}
          aria-label={ouvindo ? "Encerrar ditado" : "Ditado por voz"}
          title={ouvindo ? "Encerrar ditado" : "Ditado por voz"}
          className={`absolute right-2 bottom-2 w-9 h-9 rounded-full flex items-center justify-center transition-colors disabled:opacity-60 ${
            ouvindo ? "bg-red-100 text-red-600" : "bg-indigo-50 text-indigo-600 active:bg-indigo-100"
          }`}
        >
          {iniciando ? <Loader2 size={17} className="animate-spin" /> : ouvindo ? <Square size={15} /> : <Mic size={17} />}
        </button>
      </div>
      {ouvindo && <p className="mt-1 text-xs text-red-600">Ouvindo… toque no botão para encerrar.</p>}
      {erro && <p className="mt-1 text-xs text-red-600">{erro}</p>}
    </div>
  );
}
