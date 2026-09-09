export const fmt = new Intl.NumberFormat("pt-BR");
export const fmt1 = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function fmtDate(v: string | null | undefined): string {
  if (!v) return "—";
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) {
    const d = new Date(v);
    return isNaN(d.getTime()) ? v : d.toLocaleDateString("pt-BR");
  }
  return String(v);
}

export function diaMes(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

// Reduz uma imagem para JPEG base64 (sem prefixo data:) até `max` px no maior lado.
export function reduzirImagem(file: File, max = 1600, quality = 0.85): Promise<{ base64: string; mimeType: string; previewUrl: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("canvas"));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      resolve({
        base64: dataUrl.split(",")[1] ?? "",
        mimeType: "image/jpeg",
        previewUrl: dataUrl,
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível ler a imagem."));
    };
    img.src = url;
  });
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    r.readAsDataURL(file);
  });
}
