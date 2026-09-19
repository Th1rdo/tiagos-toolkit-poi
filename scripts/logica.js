import { AJUDA } from "./const.js";

/**
 * Regras puras do módulo — sem `game`, sem DOM, sem canvas.
 * É aqui que vive tudo o que decide *o que se vê*, e é isto que os testes cobrem.
 */

/** "3" → "03". O número é a identidade do ponto: a mesa fala dele em voz alta. */
export const indice = (n) => String(n ?? 0).padStart(2, "0");

/** O número seguinte, sem reaproveitar buracos: renumerar por baixo dos pés confunde a mesa. */
export function proximoNumero(pontos = []) {
  return pontos.reduce((maior, p) => Math.max(maior, p.numero ?? 0), 0) + 1;
}

/**
 * `alvo` null (ou ausente) = toda a gente. Array = só esses utilizadores.
 * O mestre vê sempre tudo — é a única exceção em todo o módulo.
 */
export function visivelPara(alvo, userId, isGM = false) {
  if (isGM) return true;
  if (alvo === null || alvo === undefined) return true;
  return Array.isArray(alvo) && alvo.includes(userId);
}

/** Os pontos que este cliente desenha. O mestre também vê os ocultos (marcados como tal). */
export function pontosVisiveis(pontos = [], { userId, isGM = false } = {}) {
  return pontos.filter(p => {
    if (isGM) return true;
    if (p.oculto) return false;
    return visivelPara(p.para, userId, false);
  });
}

/** As evidências que este cliente pode ler: reveladas E endereçadas a ele. */
export function evidenciasVisiveis(ponto, { userId, isGM = false } = {}) {
  const todas = ponto?.evidencias ?? [];
  if (isGM) return todas;
  return todas.filter(e => e.revelada && visivelPara(e.para, userId, false));
}

/**
 * Em que estado é que este ponto se desenha.
 *
 * Repare-se no que NÃO existe aqui: nenhuma percentagem, nenhuma contagem, nenhum
 * "completo". "Anotado" quer dizer «há coisa registada», não «faltam duas».
 */
export function estadoDoPonto(ponto, { userId, isGM = false } = {}) {
  if (!ponto) return "oculto";
  if (ponto.oculto && !isGM) return "oculto";
  if (ponto.oculto) return "fantasma";                       // só o mestre: existe, mas eles não veem
  if (ponto.esgotado) return "esgotado";
  return evidenciasVisiveis(ponto, { userId, isGM: false }).length ? "anotado" : "disponivel";
}

/** O que o cartão mostra por baixo da descrição, conforme o grau de ajuda do ponto. */
export function caminhosDoCartao(ponto) {
  const ajuda = ponto?.ajuda ?? AJUDA.GUIADO;
  if (ajuda === AJUDA.LIVRE) return [];
  const caminhos = (ponto?.caminhos ?? []).filter(c => c.texto?.trim());
  if (ajuda === AJUDA.EXPLICITO) return caminhos;
  return caminhos.map(({ pericia, ...resto }) => resto);      // guiado: a perícia fica escondida
}

/**
 * Para que lado sai a linha-guia do rótulo.
 *
 * Por omissão sobe para a direita. Vira-se quando não há espaço — senão o nome
 * sai do ecrã, que foi o primeiro problema a aparecer com pontos no canto.
 */
export function ladoDoRotulo({ x, y, largura, altura, margem = 220 }) {
  const paraEsquerda = x > largura - margem;
  const paraBaixo = y < margem * 0.5;
  return {
    dx: paraEsquerda ? -1 : 1,
    dy: paraBaixo ? 1 : -1,
    alinhamento: paraEsquerda ? "direita" : "esquerda"
  };
}

/** A linha de metadados que só o mestre vê, por baixo do nome. */
export function resumoDoMestre(ponto) {
  if (!ponto) return "";
  if (ponto.oculto) return "oculto";
  if (ponto.esgotado) return "esgotado";
  const total = (ponto.evidencias ?? []).length;
  if (!total) return "sem evidências";
  const reveladas = (ponto.evidencias ?? []).filter(e => e.revelada).length;
  const pistas = `${total} ${total === 1 ? "pista" : "pistas"}`;
  return reveladas ? `${pistas} · ${reveladas} revelada${reveladas === 1 ? "" : "s"}` : pistas;
}

/**
 * O dossiê: tudo o que este cliente já descobriu, pela ordem em que foi revelado.
 * Cada ficha sabe de onde veio — é isso que permite voltar ao mapa a partir do painel.
 */
export function dossieDe(pontos = [], { userId, isGM = false } = {}) {
  const fichas = [];
  for (const ponto of pontosVisiveis(pontos, { userId, isGM })) {
    for (const ev of ponto.evidencias ?? []) {
      if (!isGM && !(ev.revelada && visivelPara(ev.para, userId, false))) continue;
      if (isGM && !ev.revelada) continue;                    // o mestre vê o resto no ponto, não no dossiê
      fichas.push({
        id: ev.id,
        numero: ev.numero,
        titulo: ev.titulo,
        texto: ev.texto,
        hora: ev.hora,
        importante: !!ev.importante,
        privada: Array.isArray(ev.para),
        pontoId: ponto.id,
        pontoNumero: ponto.numero,
        pontoNome: ponto.nome
      });
    }
  }
  return fichas.sort((a, b) => (a.numero ?? 0) - (b.numero ?? 0));
}

/** Numeração das evidências: contínua na cena inteira, como num processo. */
export function proximoNumeroDeEvidencia(pontos = []) {
  let maior = 0;
  for (const p of pontos) for (const e of p.evidencias ?? []) maior = Math.max(maior, e.numero ?? 0);
  return maior + 1;
}

/** "22:41" a partir de um instante. A hora é a da mesa, não a do mundo de jogo. */
export function horaCurta(ms = Date.now()) {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Nome sempre utilizável: um ponto sem nome continua a ser clicável e falável. */
export const nomeLimpo = (nome, fallback = "Ponto") => (nome ?? "").trim() || fallback;
