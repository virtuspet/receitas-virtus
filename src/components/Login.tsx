import { useState, type FormEvent } from "react";
import { supabase } from "../lib/supabase.js";

export function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function entrar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setCarregando(false);
    if (error) setErro("E-mail ou senha inválidos.");
  }

  return (
    <div className="login">
      <h1>Conexão 360</h1>
      <p>Entre com a conta da loja para registrar e acompanhar as receitas.</p>
      <form onSubmit={entrar}>
        <input
          type="email"
          placeholder="E-mail"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Senha"
          autoComplete="current-password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
        />
        {erro && <span className="err">{erro}</span>}
        <button type="submit" disabled={carregando}>
          {carregando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
