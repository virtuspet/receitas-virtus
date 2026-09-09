import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type { Receita } from "../shared/types.js";
import { supabase } from "./lib/supabase.js";
import { api } from "./lib/api.js";
import { Login } from "./components/Login.js";
import { CaptureView } from "./components/CaptureView.js";
import { Dashboard } from "./components/Dashboard.js";
import { ReceitaModal } from "./components/ReceitaModal.js";

type Aba = "capturar" | "painel";

export function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [aba, setAba] = useState<Aba>("capturar");
  const [receitas, setReceitas] = useState<Receita[]>([]);
  const [iaDisponivel, setIaDisponivel] = useState<boolean | null>(null);
  const [modalId, setModalId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [tema, setTema] = useState<string | null>(() => {
    try {
      return localStorage.getItem("c360.tema");
    } catch {
      return null;
    }
  });
  const toastTimer = useRef<number | undefined>(undefined);

  // sessão
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  // tema
  useEffect(() => {
    if (tema) document.documentElement.setAttribute("data-theme", tema);
    else document.documentElement.removeAttribute("data-theme");
  }, [tema]);

  const carregar = useCallback(async () => {
    try {
      const { receitas } = await api.listReceitas();
      setReceitas(receitas);
    } catch {
      /* silencioso — mostra vazio */
    }
  }, []);

  useEffect(() => {
    if (!session) return;
    api.health().then((h) => setIaDisponivel(h.ia)).catch(() => setIaDisponivel(false));
    carregar();
  }, [session, carregar]);

  const mostrarToast = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  if (session === undefined) return null;
  if (session === null) return <Login />;

  function alternarTema() {
    const escuro = tema ? tema === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    const novo = escuro ? "light" : "dark";
    setTema(novo);
    try {
      localStorage.setItem("c360.tema", novo);
    } catch {
      /* ignora */
    }
  }

  return (
    <div className="app">
      <div className="appbar">
        <span className="brand">
          <span className="logo" aria-hidden />
          <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
            <h1>Conexão 360</h1>
            <span>Receitas veterinárias · loja</span>
          </span>
        </span>
        <span className="spacer" />
        <button className="icon-btn" onClick={alternarTema} aria-label="Alternar tema" title="Alternar tema">
          ◐
        </button>
        <button
          className="icon-btn"
          onClick={() => supabase.auth.signOut()}
          aria-label="Sair"
          title="Sair"
        >
          ⎋
        </button>
      </div>

      <main>
        {aba === "capturar" ? (
          <CaptureView
            iaDisponivel={iaDisponivel}
            recentes={receitas}
            onSalvo={() => {
              carregar();
              setAba("painel");
              mostrarToast("Receita salva · painel atualizado");
            }}
            onAbrir={setModalId}
            onToast={mostrarToast}
          />
        ) : (
          <Dashboard receitas={receitas} onAbrir={setModalId} />
        )}
      </main>

      <div className="tabs" role="tablist">
        <button className="tab" role="tab" aria-selected={aba === "capturar"} onClick={() => setAba("capturar")}>
          <span className="t-ico" aria-hidden>
            📷
          </span>
          Capturar
        </button>
        <button className="tab" role="tab" aria-selected={aba === "painel"} onClick={() => setAba("painel")}>
          <span className="t-ico" aria-hidden>
            📊
          </span>
          Painel
        </button>
      </div>

      {modalId && (
        <ReceitaModal
          id={modalId}
          onFechar={() => setModalId(null)}
          onConferida={carregar}
          onToast={mostrarToast}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
