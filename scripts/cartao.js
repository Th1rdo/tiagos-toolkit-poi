import { MODULE_ID, paiUI } from "./const.js";
import { ponto as obterPonto, ardosia, revelarEvidencia, esconderEvidencia } from "./dados.js";
import { marcadores } from "./marcadores.js";
import { indice, nomeLimpo, caminhosDoCartao, evidenciasVisiveis } from "./logica.js";

/**
 * O cartão de investigação.
 *
 * Nasce amarrado ao ponto e não no meio do ecrã: o objeto continua a ser o
 * assunto. Mostra o mínimo — nome, descrição, caminhos possíveis e o que já foi
 * descoberto. O que o cartão NUNCA mostra é quanto falta.
 */

const LARGURA = 330;
const MARGEM = 18;

class Cartao {
  #el = null;
  #fio = null;
  #id = null;

  montar() {
    if (this.#el) return;
    const el = document.createElement("div");
    el.id = "poi-cartao";
    el.hidden = true;
    paiUI().appendChild(el);
    this.#el = el;

    const fio = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    fio.id = "poi-fio";
    fio.innerHTML = `<line x1="0" y1="0" x2="0" y2="0"></line>`;
    fio.setAttribute("aria-hidden", "true");
    paiUI().appendChild(fio);
    this.#fio = fio;

    el.addEventListener("click", (ev) => this.#clique(ev));
    Hooks.on(`${MODULE_ID}.posicionou`, () => this.posicionar());
  }

  get aberto() { return !!this.#id; }

  mostrar(id) {
    if (!id) return this.fechar();
    this.#id = id;
    this.desenhar();
  }

  fechar() {
    this.#id = null;
    if (!this.#el) return;
    this.#el.hidden = true;
    this.#el.classList.remove("poi-visivel");
    this.#fio.style.opacity = "0";
  }

  desenhar() {
    const p = obterPonto(this.#id);
    if (!p || !this.#el) return this.fechar();
    const isGM = game.user.isGM;
    const userId = game.user.id;
    const hora = ardosia()?.hora ?? "";

    const caminhos = caminhosDoCartao(p);
    const evidencias = isGM ? (p.evidencias ?? []) : evidenciasVisiveis(p, { userId, isGM: false });

    this.#el.innerHTML = `
      <div class="poi-traco"></div>
      <header class="poi-cabecalho">
        <div class="poi-titulo">
          <span class="poi-indice">${indice(p.numero)}</span>
          <span class="poi-nome">${foundry.utils.escapeHTML(nomeLimpo(p.nome, "—").toUpperCase())}</span>
        </div>
        ${hora ? `<span class="poi-hora">${foundry.utils.escapeHTML(hora)}</span>` : ""}
      </header>
      ${p.descricao?.trim() ? `<p class="poi-descricao">${foundry.utils.escapeHTML(p.descricao)}</p>` : ""}
      ${caminhos.length ? `<div class="poi-caminhos">${caminhos.map(c => `
        <div class="poi-caminho">
          <span class="poi-caminho-texto">${foundry.utils.escapeHTML(c.texto)}</span>
          ${c.pericia?.trim() ? `<span class="poi-pericia">${foundry.utils.escapeHTML(c.pericia.toUpperCase())}</span>` : ""}
        </div>`).join("")}</div>` : ""}
      ${evidencias.length ? `<div class="poi-evidencias">${evidencias.map(e => this.#evidencia(e, isGM)).join("")}</div>` : ""}
      ${isGM ? `<footer class="poi-rodape">
        <button type="button" class="poi-ligacao" data-accao="editar">${game.i18n.localize("POI.Acoes.Editar")}</button>
      </footer>` : ""}`;

    this.#el.hidden = false;
    requestAnimationFrame(() => this.#el.classList.add("poi-visivel"));
    this.posicionar();
  }

  #evidencia(e, isGM) {
    const revelada = !!e.revelada;
    const privada = Array.isArray(e.para);
    return `
      <div class="poi-evidencia ${revelada ? "" : "poi-por-revelar"} ${e.importante ? "poi-importante" : ""}" data-ev="${e.id}">
        <div class="poi-ev-cabeca">
          <span class="poi-ev-numero">${game.i18n.format("POI.Evidencia", { n: indice(e.numero) })}${e.hora ? ` · ${foundry.utils.escapeHTML(e.hora)}` : ""}</span>
          ${privada && revelada ? `<span class="poi-ev-privada">${game.i18n.localize("POI.SoPara")}</span>` : ""}
          ${isGM ? `<button type="button" class="poi-ligacao" data-accao="${revelada ? "esconder" : "revelar"}" data-ev="${e.id}">
            ${game.i18n.localize(revelada ? "POI.Acoes.Esconder" : "POI.Acoes.Revelar")}
          </button>` : ""}
        </div>
        ${e.titulo?.trim() ? `<div class="poi-ev-titulo">${foundry.utils.escapeHTML(e.titulo)}</div>` : ""}
        ${e.texto?.trim() ? `<div class="poi-ev-texto">${foundry.utils.escapeHTML(e.texto)}</div>` : ""}
      </div>`;
  }

  async #clique(ev) {
    const botao = ev.target.closest("[data-accao]");
    if (!botao) return;
    ev.stopPropagation();
    const evId = botao.dataset.ev;
    switch (botao.dataset.accao) {
      case "revelar":
        await revelarEvidencia(this.#id, evId);
        Hooks.callAll(`${MODULE_ID}.revelou`, { pontoId: this.#id, evidenciaId: evId });
        break;
      case "esconder":
        await esconderEvidencia(this.#id, evId);
        break;
      case "editar":
        Hooks.callAll(`${MODULE_ID}.editar`, this.#id);
        break;
    }
  }

  /**
   * O cartão segue o ponto pelo ecrã. Se não couber de um lado, salta para o
   * outro; se não couber de nenhum, encosta-se à margem — nunca sai do ecrã,
   * que era o que acontecia com pontos no canto do mapa.
   */
  posicionar() {
    if (!this.#id || !this.#el || this.#el.hidden) return;
    const alvo = marcadores.ecraDe(this.#id);
    if (!alvo) return this.fechar();

    const caixa = this.#el.getBoundingClientRect();
    const altura = caixa.height || 200;
    const paraDireita = alvo.x + 40 + LARGURA + MARGEM < globalThis.innerWidth;
    let x = paraDireita ? alvo.x + 40 : alvo.x - 40 - LARGURA;
    let y = alvo.y - altura / 2;

    x = Math.max(MARGEM, Math.min(x, globalThis.innerWidth - LARGURA - MARGEM));
    y = Math.max(MARGEM, Math.min(y, globalThis.innerHeight - altura - MARGEM));

    this.#el.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;

    const linha = this.#fio.firstElementChild;
    const fim = { x: paraDireita ? x : x + LARGURA, y: Math.min(Math.max(alvo.y, y + 14), y + altura - 14) };
    linha.setAttribute("x1", Math.round(alvo.x));
    linha.setAttribute("y1", Math.round(alvo.y));
    linha.setAttribute("x2", Math.round(fim.x));
    linha.setAttribute("y2", Math.round(fim.y));
    this.#fio.style.opacity = "1";
  }
}

export const cartao = new Cartao();
