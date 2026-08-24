"use client";

import { useEffect, useRef, useState } from "react";
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { SpeechRecognition } from "@capgo/capacitor-speech-recognition";
import { Loader2, Mic, Square } from "lucide-react";

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

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const timer = window.setTimeout(() => setNativo(true), 0);

    return () => {
      window.clearTimeout(timer);
      listenersRef.current.forEach((listener) => listener.remove());
      SpeechRecognition.stop().catch(() => undefined);
    };
  }, []);

  async function pararDitado() {
    setOuvindo(false);
    await SpeechRecognition.stop().catch(() => undefined);
    await Promise.all(listenersRef.current.map((listener) => listener.remove()));
    listenersRef.current = [];
  }

  async function alternarDitado() {
    if (ouvindo) {
      await pararDitado();
      return;
    }

    setErro("");
    setIniciando(true);
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

  return (
    <div>
      <label className="text-xs font-medium text-slate-500 block mb-1">Descrição</label>
      <div className="relative">
        <textarea
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border border-slate-200 rounded-xl px-3 py-3 pr-12 text-sm resize-none"
        />
        {nativo && (
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
        )}
      </div>
      {ouvindo && <p className="mt-1 text-xs text-red-600">Ouvindo… toque no botão para encerrar.</p>}
      {erro && <p className="mt-1 text-xs text-red-600">{erro}</p>}
    </div>
  );
}
