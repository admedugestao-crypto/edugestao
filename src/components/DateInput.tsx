"use client";

import { useId, useState, type ComponentProps } from "react";
import { dataExiste, MENSAGEM_DATA_INVALIDA } from "@/lib/validarData";

/** Keeps the native calendar and ISO values used by forms and APIs. */
export default function DateInput({ onChange, onBlur, onInvalid, onInput, ...props }: ComponentProps<"input">) {
  const idErro = useId();
  const [erro, setErro] = useState("");

  function validar(input: HTMLInputElement) {
    input.setCustomValidity("");
    const invalida = input.validity.badInput || input.validity.valueMissing ||
      (input.value !== "" && !dataExiste(input.value));
    const mensagem = invalida ? MENSAGEM_DATA_INVALIDA :
      !input.validity.valid ? input.validationMessage : "";
    input.setCustomValidity(mensagem);
    setErro(mensagem);
  }

  return <>
    <input {...props} type="date" lang="pt-BR"
      aria-invalid={erro ? true : props["aria-invalid"]}
      aria-describedby={[props["aria-describedby"], erro ? idErro : ""].filter(Boolean).join(" ") || undefined}
      onInput={(event) => { validar(event.currentTarget); onInput?.(event); }}
      onChange={(event) => { validar(event.currentTarget); onChange?.(event); }}
      onBlur={(event) => { validar(event.currentTarget); onBlur?.(event); }}
      onInvalid={(event) => { validar(event.currentTarget); onInvalid?.(event); }}
    />
    {erro && <p id={idErro} role="alert" className="mt-1 text-xs text-red-600">{erro}</p>}
  </>;
}
