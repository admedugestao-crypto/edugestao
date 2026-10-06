"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./CompanyLogoEditor.module.css";

type Props = { url: string | null; nome: string; onClose: () => void; onSaved: (url: string) => void };

export default function CompanyLogoEditor({ url, nome, onClose, onSaved }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [source, setSource] = useState(url);
  const [picture, setPicture] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => { dialog.current?.showModal(); }, []);
  useEffect(() => {
    if (!source) return;
    let active = true;
    const image = new window.Image();
    image.crossOrigin = "anonymous";
    image.onload = () => { if (active) { setPicture(image); setError(""); } };
    image.onerror = () => { if (active) { setPicture(null); setError("Não foi possível abrir a imagem. Selecione um arquivo do computador."); } };
    image.src = source;
    return () => { active = false; if (source.startsWith("blob:")) URL.revokeObjectURL(source); };
  }, [source]);

  useEffect(() => {
    const context = canvas.current?.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, 256, 256);
    context.fillStyle = "white";
    context.fillRect(0, 0, 256, 256);
    if (!picture) return;
    const scale = Math.min(256 / picture.width, 256 / picture.height) * zoom;
    const width = picture.width * scale, height = picture.height * scale;
    context.drawImage(picture, (256 - width) / 2 + x, (256 - height) / 2 + y, width, height);
  }, [picture, zoom, x, y]);

  function reset() { setZoom(1); setX(0); setY(0); }
  async function save() {
    if (!canvas.current || !picture || saving) return;
    setSaving(true); setError("");
    try {
      const blob = await new Promise<Blob>((resolve, reject) => canvas.current!.toBlob(value => value ? resolve(value) : reject(new Error("Não foi possível preparar o ícone.")), "image/png"));
      const form = new FormData(); form.append("arquivo", blob, "icone.png");
      const response = await fetch("/api/empresa/logo", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.erro || "Não foi possível salvar o ícone.");
      onSaved(data.url); router.refresh(); onClose();
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível salvar o ícone."); }
    finally { setSaving(false); }
  }

  return <dialog ref={dialog} className={styles.dialog} aria-labelledby="company-logo-title" onCancel={event => { event.preventDefault(); if (!saving) onClose(); }}>
    <h2 id="company-logo-title">Ajustar ícone da empresa</h2>
    <p>Escolha a imagem e ajuste o enquadramento de {nome}.</p>
    <label className={styles.file}>Trocar imagem<input type="file" accept="image/png,image/jpeg,image/webp" disabled={saving} onChange={event => {
      const file = event.target.files?.[0]; event.target.value = "";
      if (!file) return;
      if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 10 * 1024 * 1024) { setError("Escolha uma imagem PNG, JPG ou WebP de até 10 MB."); return; }
      setPicture(null); setSource(URL.createObjectURL(file)); reset();
    }}/></label>
    <div className={styles.preview}><canvas ref={canvas} width={256} height={256} aria-label="Prévia do ícone ajustado"/><span>Prévia do enquadramento</span></div>
    <fieldset disabled={!picture || saving} className={styles.controls}>
      <label>Tamanho <output>{Math.round(zoom * 100)}%</output><input aria-label="Tamanho" type="range" min="0.5" max="3" step="0.05" value={zoom} onChange={e => setZoom(Number(e.target.value))}/></label>
      <label>Posição horizontal<input aria-label="Posição horizontal" type="range" min="-128" max="128" value={x} onChange={e => setX(Number(e.target.value))}/></label>
      <label>Posição vertical<input aria-label="Posição vertical" type="range" min="-128" max="128" value={y} onChange={e => setY(Number(e.target.value))}/></label>
      <button type="button" onClick={reset}>Centralizar e ajustar imagem</button>
    </fieldset>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    <footer><button type="button" disabled={saving} onClick={onClose}>Cancelar</button><button type="button" className={styles.save} disabled={!picture || saving} onClick={save}>{saving ? "Salvando…" : "Salvar ícone"}</button></footer>
  </dialog>;
}
