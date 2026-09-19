import { MODULE_ID, AJUDA, paiUI } from "./const.js";
import {
  ponto as obterPonto, atualizarPonto, removerPonto,
  adicionarCaminho, atualizarCaminho, removerCaminho,
  adicionarEvidencia, atualizarEvidencia, removerEvidencia
} from "./dados.js";
import { marcadores } from "./marcadores.js";
import { indice } from "./logica.js";

/**
 * O editor do mestre.
 *
 * É um painel amarrado ao ponto, não uma janela do Foundry: editar a meio de uma
 * sessão não deve tirar ninguém do mapa. Guarda sozinho (meio segundo depois de
 * parar de escrever) — um mestre com a mesa à espera não carrega em «Guardar».
 *
 * Três campos à vista; o resto vive dobrado em «Avançado». Vinte campos de uma
 * vez é a forma mais rápida de um módulo deixar de ser usado em jogo.
 */

const ESPERA = 500;

class Editor {
  #el = null;
  #id = null;
  #timers = new Map();

  montar() {
    if (this.#el) return;
    const el = document.createElement("div");
    el.id = "poi-editor";
    el.hidden = true;
    paiUI().appendChild(el);
    this.#el = el;

    el.addEventListener("click", (ev) => this.#clique(ev));
    el.addEventListener("input", (ev) => this.#escreveu(ev));
    el.addEventListener("change", (ev) => this.#mudou(ev));
    el.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape") { ev.stopPropagation(); this.fechar(); }
    });
    Hooks.on(`${MODULE_ID}.posicionou`, () => this.posicionar());
  }

  get aberto() { return !!this.#id; }

  abrir(id) {
    if (!game.user.isGM) return;
    this.#id = id;
    this.desenhar();
    requestAnimationFrame(() => this.#el.querySelector('[data-campo="nome"]')?.focus());
  }

  fechar() {
    this.#id = null;
    marcadores.marcarEdicao(null);
    if (this.#el) { this.#el.hidden = true; this.#el.classList.remove("poi-visivel"); }
  }

  /** Redesenha sem estorvar: se o mestre está a escrever num campo, aquele campo fica quieto. */
  desenhar() {
    const p = obterPonto(this.#id);
    if (!p || !this.#el) return this.fechar();
    const focado = document.activeElement?.closest?.("#poi-editor") ? document.activeElement : null;
    const marca = focado ? { campo: focado.dataset.campo, id: focado.dataset.alvo, pos: focado.selectionStart } : null;

    const jogadores = game.users.filter(u => !u.isGM && u.active);

    this.#el.innerHTML = `
      <div class="poi-traco"></div>
      <header class="poi-cabecalho">
        <div class="poi-titulo">
          <span class="poi-indice">${indice(p.numero)}</span>
          <input type="text" class="poi-campo-nome" data-campo="nome" value="${foundry.utils.escapeHTML(p.nome ?? "")}"
                 placeholder="${game.i18n.localize("POI.Campos.Nome")}" spellcheck="false">
        </div>
        <button type="button" class="poi-fechar" data-accao="fechar" aria-label="${game.i18n.localize("POI.Acoes.Fechar")}">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4 L12 12 M12 4 L4 12"></path></svg>
        </button>
      </header>

      <textarea class="poi-campo-descricao" data-campo="descricao" rows="3"
        placeholder="${game.i18n.localize("POI.Campos.Descricao")}">${foundry.utils.escapeHTML(p.descricao ?? "")}</textarea>

      <section class="poi-seccao">
        <div class="poi-seccao-titulo">${game.i18n.localize("POI.Campos.Caminhos")}</div>
        ${(p.caminhos ?? []).map(c => `
          <div class="poi-linha-editor">
            <input type="text" data-campo="caminho-texto" data-alvo="${c.id}" value="${foundry.utils.escapeHTML(c.texto ?? "")}"
                   placeholder="${game.i18n.localize("POI.Campos.CaminhoTexto")}">
            <input type="text" class="poi-campo-pericia" data-campo="caminho-pericia" data-alvo="${c.id}"
                   value="${foundry.utils.escapeHTML(c.pericia ?? "")}" placeholder="${game.i18n.localize("POI.Campos.Pericia")}">
            <button type="button" class="poi-remover" data-accao="remover-caminho" data-alvo="${c.id}"
                    aria-label="${game.i18n.localize("POI.Acoes.Remover")}">
              <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4 L12 12 M12 4 L4 12"></path></svg>
            </button>
          </div>`).join("")}
        <button type="button" class="poi-adicionar" data-accao="novo-caminho">+ ${game.i18n.localize("POI.Campos.Caminho")}</button>
      </section>

      <section class="poi-seccao">
        <div class="poi-seccao-titulo">${game.i18n.localize("POI.Campos.Evidencias")}</div>
        ${(p.evidencias ?? []).map(e => `
          <div class="poi-evidencia-editor ${e.revelada ? "poi-revelada" : ""}">
            <div class="poi-linha-editor">
              <span class="poi-ev-numero">${indice(e.numero)}</span>
              <input type="text" data-campo="ev-titulo" data-alvo="${e.id}" value="${foundry.utils.escapeHTML(e.titulo ?? "")}"
                     placeholder="${game.i18n.localize("POI.Campos.EvidenciaTitulo")}">
              <label class="poi-marca" title="${game.i18n.localize("POI.Campos.Importante")}">
                <input type="checkbox" data-campo="ev-importante" data-alvo="${e.id}" ${e.importante ? "checked" : ""}>
                <span>!</span>
              </label>
              <button type="button" class="poi-remover" data-accao="remover-ev" data-alvo="${e.id}"
                      aria-label="${game.i18n.localize("POI.Acoes.Remover")}">
                <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4 L12 12 M12 4 L4 12"></path></svg>
              </button>
            </div>
            <textarea data-campo="ev-texto" data-alvo="${e.id}" rows="2"
              placeholder="${game.i18n.localize("POI.Campos.EvidenciaTexto")}">${foundry.utils.escapeHTML(e.texto ?? "")}</textarea>
          </div>`).join("")}
        <button type="button" class="poi-adicionar" data-accao="nova-ev">+ ${game.i18n.localize("POI.Campos.Evidencia")}</button>
      </section>

      <details class="poi-avancado" ${p.ajuda !== AJUDA.GUIADO || p.para ? "open" : ""}>
        <summary>${game.i18n.localize("POI.Campos.Avancado")}</summary>

        <label class="poi-campo-linha">
          <span>${game.i18n.localize("POI.Campos.Ajuda")}</span>
          <select data-campo="ajuda">
            <option value="${AJUDA.LIVRE}" ${p.ajuda === AJUDA.LIVRE ? "selected" : ""}>${game.i18n.localize("POI.Ajuda.Livre")}</option>
            <option value="${AJUDA.GUIADO}" ${p.ajuda === AJUDA.GUIADO ? "selected" : ""}>${game.i18n.localize("POI.Ajuda.Guiado")}</option>
            <option value="${AJUDA.EXPLICITO}" ${p.ajuda === AJUDA.EXPLICITO ? "selected" : ""}>${game.i18n.localize("POI.Ajuda.Explicito")}</option>
          </select>
        </label>

        <label class="poi-campo-linha">
          <span>${game.i18n.localize("POI.Campos.Esgotado")}</span>
          <input type="checkbox" data-campo="esgotado" ${p.esgotado ? "checked" : ""}>
        </label>

        <div class="poi-campo-linha poi-campo-coluna">
          <span>${game.i18n.localize("POI.Campos.QuemVe")}</span>
          <div class="poi-jogadores">
            <label><input type="checkbox" data-campo="todos" ${p.para ? "" : "checked"}> ${game.i18n.localize("POI.Campos.Todos")}</label>
            ${jogadores.map(u => `<label><input type="checkbox" data-campo="para" data-alvo="${u.id}"
              ${p.para?.includes(u.id) ? "checked" : ""} ${p.para ? "" : "disabled"}> ${foundry.utils.escapeHTML(u.name)}</label>`).join("")}
          </div>
        </div>

        <button type="button" class="poi-apagar" data-accao="apagar">${game.i18n.localize("POI.Acoes.Apagar")}</button>
      </details>`;

    this.#el.hidden = false;
    requestAnimationFrame(() => this.#el.classList.add("poi-visivel"));
    this.posicionar();

    if (marca?.campo) {
      const selector = marca.id ? `[data-campo="${marca.campo}"][data-alvo="${marca.id}"]` : `[data-campo="${marca.campo}"]`;
      const campo = this.#el.querySelector(selector);
      if (campo) { campo.focus(); if (marca.pos != null && campo.setSelectionRange) campo.setSelectionRange(marca.pos, marca.pos); }
    }
  }

  // ------------------------------------------------------------ escrita

  #adiar(chave, fn) {
    clearTimeout(this.#timers.get(chave));
    this.#timers.set(chave, setTimeout(fn, ESPERA));
  }

  #escreveu(ev) {
    const campo = ev.target.dataset.campo;
    const alvo = ev.target.dataset.alvo;
    const valor = ev.target.value;
    const id = this.#id;
    const chave = `${campo}:${alvo ?? ""}`;

    switch (campo) {
      case "nome": return this.#adiar(chave, () => atualizarPonto(id, { nome: valor }));
      case "descricao": return this.#adiar(chave, () => atualizarPonto(id, { descricao: valor }));
      case "caminho-texto": return this.#adiar(chave, () => atualizarCaminho(id, alvo, { texto: valor }));
      case "caminho-pericia": return this.#adiar(chave, () => atualizarCaminho(id, alvo, { pericia: valor }));
      case "ev-titulo": return this.#adiar(chave, () => atualizarEvidencia(id, alvo, { titulo: valor }));
      case "ev-texto": return this.#adiar(chave, () => atualizarEvidencia(id, alvo, { texto: valor }));
    }
  }

  async #mudou(ev) {
    const campo = ev.target.dataset.campo;
    const alvo = ev.target.dataset.alvo;
    const id = this.#id;

    switch (campo) {
      case "ajuda": return atualizarPonto(id, { ajuda: ev.target.value });
      case "esgotado": return atualizarPonto(id, { esgotado: ev.target.checked });
      case "ev-importante": return atualizarEvidencia(id, alvo, { importante: ev.target.checked });
      case "todos": return atualizarPonto(id, { para: ev.target.checked ? null : [] });
      case "para": {
        const escolhidos = [...this.#el.querySelectorAll('[data-campo="para"]:checked')].map(i => i.dataset.alvo);
        return atualizarPonto(id, { para: escolhidos });
      }
    }
  }

  async #clique(ev) {
    const botao = ev.target.closest("[data-accao]");
    if (!botao) return;
    const alvo = botao.dataset.alvo;
    const id = this.#id;

    switch (botao.dataset.accao) {
      case "fechar": return this.fechar();
      case "novo-caminho": return adicionarCaminho(id);
      case "remover-caminho": return removerCaminho(id, alvo);
      case "nova-ev": return adicionarEvidencia(id);
      case "remover-ev": return removerEvidencia(id, alvo);
      case "apagar": {
        const nome = obterPonto(id)?.nome || game.i18n.localize("POI.PontoSemNome");
        const ok = await foundry.applications.api.DialogV2.confirm({
          window: { title: game.i18n.localize("POI.Acoes.Apagar") },
          content: `<p>${game.i18n.format("POI.Avisos.ConfirmarApagar", { nome })}</p>`
        });
        if (!ok) return;
        this.fechar();
        return removerPonto(id);
      }
    }
  }

  posicionar() {
    if (!this.#id || !this.#el || this.#el.hidden) return;
    const alvo = marcadores.ecraDe(this.#id);
    if (!alvo) return;
    const caixa = this.#el.getBoundingClientRect();
    const largura = caixa.width || 360;
    const altura = caixa.height || 420;
    const paraDireita = alvo.x + 40 + largura + 18 < globalThis.innerWidth;
    let x = paraDireita ? alvo.x + 40 : alvo.x - 40 - largura;
    let y = alvo.y - altura / 2;
    x = Math.max(18, Math.min(x, globalThis.innerWidth - largura - 18));
    y = Math.max(18, Math.min(y, globalThis.innerHeight - altura - 18));
    this.#el.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
  }
}

export const editor = new Editor();
