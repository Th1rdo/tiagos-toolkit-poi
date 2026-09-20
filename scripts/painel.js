import { MODULE_ID, FORMAS, CORES, TAMANHO, OPACIDADE, paiUI } from "./const.js";
import { ponto as obterPonto, atualizarPonto, removerPonto, alternarOculto } from "./dados.js";
import { marcadores } from "./marcadores.js";
import { indice, nomeLimpo, aparencia } from "./logica.js";

/**
 * O painel — um só, para os dois lados da mesa.
 *
 * O jogador lê; o mestre escreve **no mesmo sítio**, com os mesmos tipos de letra
 * e a mesma largura. Não há «modo de edição»: o mestre está sempre a ver o
 * cartão que a mesa vê, e é nele que mexe. Na versão anterior havia um cartão e
 * um editor separados, que abriam no mesmo ponto do ecrã e se tapavam um ao
 * outro — metade dos problemas do primeiro teste vinham daí.
 *
 * Guarda sozinho, meio segundo depois de parar de escrever: um mestre com a mesa
 * à espera não carrega em «Guardar».
 */

const ESPERA = 450;
const LARGURA = 320;

class Painel {
  #el = null;
  #fio = null;
  #id = null;
  #timer = null;

  montar() {
    if (this.#el) return;
    const el = document.createElement("div");
    el.id = "poi-painel";
    el.hidden = true;
    paiUI().appendChild(el);
    this.#el = el;

    const fio = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    fio.id = "poi-fio";
    fio.setAttribute("aria-hidden", "true");
    fio.innerHTML = `<line x1="0" y1="0" x2="0" y2="0"></line>`;
    paiUI().appendChild(fio);
    this.#fio = fio;

    el.addEventListener("click", (ev) => this.#clique(ev));
    el.addEventListener("input", (ev) => this.#escreveu(ev));
    el.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape") { ev.stopPropagation(); this.fechar(); marcadores.selecionar(null); }
    });

    // enquanto o ponto vai a caminho, o painel sai da frente
    Hooks.on(`${MODULE_ID}.arrastando`, () => this.#el.classList.add("poi-a-fugir"));
    Hooks.on(`${MODULE_ID}.largou`, () => { this.#el.classList.remove("poi-a-fugir"); this.posicionar(); });
    Hooks.on(`${MODULE_ID}.posicionou`, () => this.posicionar());
  }

  get aberto() { return !!this.#id; }

  mostrar(id) {
    if (!id) return this.fechar();
    const primeiro = this.#id !== id;
    this.#id = id;
    this.desenhar();
    if (primeiro && game.user.isGM) {
      const campo = this.#el.querySelector('[data-campo="nome"]');
      if (campo && !campo.value) requestAnimationFrame(() => campo.focus());
    }
  }

  fechar() {
    this.#id = null;
    if (!this.#el) return;
    this.#el.classList.remove("poi-visivel");
    this.#fio.style.opacity = "0";
    setTimeout(() => { if (!this.#id) this.#el.hidden = true; }, 160);
  }

  /** Redesenha sem estorvar: o campo onde o mestre está a escrever fica quieto. */
  desenhar() {
    const p = obterPonto(this.#id);
    if (!p || !this.#el) return this.fechar();

    const focado = document.activeElement;
    const aEscrever = focado?.closest?.("#poi-painel") ? focado.dataset.campo : null;
    const pos = aEscrever ? focado.selectionStart : null;

    this.#el.innerHTML = game.user.isGM ? this.#deMestre(p) : this.#deJogador(p);
    this.#el.dataset.mestre = game.user.isGM ? "1" : "0";
    this.#el.hidden = false;
    requestAnimationFrame(() => this.#el.classList.add("poi-visivel"));
    this.posicionar();

    if (aEscrever) {
      const campo = this.#el.querySelector(`[data-campo="${aEscrever}"]`);
      if (campo) { campo.focus(); if (pos != null && campo.setSelectionRange) campo.setSelectionRange(pos, pos); }
    }
  }

  #deJogador(p) {
    return `
      <div class="poi-traco"></div>
      <header class="poi-cabecalho">
        <span class="poi-indice">${indice(p.numero)}</span>
        <span class="poi-nome">${foundry.utils.escapeHTML(nomeLimpo(p.nome, "—").toUpperCase())}</span>
      </header>
      ${p.descricao?.trim() ? `<p class="poi-descricao">${foundry.utils.escapeHTML(p.descricao)}</p>` : ""}`;
  }

  #deMestre(p) {
    const { forma, cor, tamanho, opacidade } = aparencia(p);
    return `
      <div class="poi-traco"></div>
      <header class="poi-cabecalho">
        <span class="poi-indice">${indice(p.numero)}</span>
        <input type="text" class="poi-nome" data-campo="nome" spellcheck="false"
               value="${foundry.utils.escapeHTML(p.nome ?? "")}"
               placeholder="${game.i18n.localize("POI.Campos.Nome")}">
        <button type="button" class="poi-olho" data-accao="ocultar"
                title="${game.i18n.localize(p.oculto ? "POI.Acoes.Mostrar" : "POI.Acoes.Esconder")}"
                aria-label="${game.i18n.localize(p.oculto ? "POI.Acoes.Mostrar" : "POI.Acoes.Esconder")}">
          ${p.oculto
            ? `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1 8 C4 3.5 12 3.5 15 8 C12 12.5 4 12.5 1 8 Z"></path><path d="M3 13 L13 3"></path></svg>`
            : `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1 8 C4 3.5 12 3.5 15 8 C12 12.5 4 12.5 1 8 Z"></path><circle cx="8" cy="8" r="2.4" class="poi-cheio"></circle></svg>`}
        </button>
      </header>

      <textarea class="poi-descricao" data-campo="descricao" rows="3"
        placeholder="${game.i18n.localize("POI.Campos.Descricao")}">${foundry.utils.escapeHTML(p.descricao ?? "")}</textarea>

      <div class="poi-aspeto">
        <div class="poi-formas" role="group" aria-label="${game.i18n.localize("POI.Campos.Forma")}">
          ${FORMAS.map(f => `
            <button type="button" class="poi-swatch ${f === forma ? "poi-escolhido" : ""}" data-accao="forma" data-valor="${f}"
                    title="${game.i18n.localize(`POI.Formas.${f}`)}" aria-label="${game.i18n.localize(`POI.Formas.${f}`)}">
              <span class="poi-mini poi-mini-${f}"></span>
            </button>`).join("")}
        </div>
        <div class="poi-cores" role="group" aria-label="${game.i18n.localize("POI.Campos.Cor")}">
          ${Object.keys(CORES).map(c => `
            <button type="button" class="poi-ponto-cor ${c === cor ? "poi-escolhido" : ""}" data-accao="cor" data-valor="${c}"
                    title="${game.i18n.localize(`POI.Cores.${c}`)}" aria-label="${game.i18n.localize(`POI.Cores.${c}`)}"
              ><span class="poi-amostra" style="background: ${CORES[c] ?? "var(--poi-acento)"}"></span></button>`).join("")}
        </div>
        <label class="poi-cursor">
          <span class="poi-etiqueta-campo">${game.i18n.localize("POI.Campos.Tamanho")}</span>
          <input type="range" data-campo="tamanho" min="${TAMANHO.min}" max="${TAMANHO.max}" step="${TAMANHO.passo}" value="${tamanho}">
        </label>
        <label class="poi-cursor">
          <span class="poi-etiqueta-campo">${game.i18n.localize("POI.Campos.Opacidade")}</span>
          <input type="range" data-campo="opacidade" min="${OPACIDADE.min}" max="${OPACIDADE.max}" step="${OPACIDADE.passo}" value="${opacidade}">
        </label>
      </div>

      <footer class="poi-rodape">
        <button type="button" class="poi-ligacao poi-apagar" data-accao="apagar">${game.i18n.localize("POI.Acoes.Apagar")}</button>
      </footer>`;
  }

  // ------------------------------------------------------------ escrita

  #guardar(patch) {
    clearTimeout(this.#timer);
    const id = this.#id;
    this.#timer = setTimeout(() => atualizarPonto(id, patch), ESPERA);
  }

  #escreveu(ev) {
    const campo = ev.target.dataset.campo;
    if (campo === "nome") return this.#guardar({ nome: ev.target.value });
    if (campo === "descricao") return this.#guardar({ descricao: ev.target.value });
    // tamanho e opacidade mexem-se à vista, sem esperar pela gravação
    if (campo === "tamanho" || campo === "opacidade") {
      const el = document.querySelector(`.poi-marcador[data-id="${this.#id}"]`);
      el?.style.setProperty(campo === "tamanho" ? "--poi-tam" : "--poi-op", ev.target.value);
      return this.#guardar({ [campo]: ev.target.value });
    }
  }

  async #clique(ev) {
    const botao = ev.target.closest("[data-accao]");
    if (!botao) return;
    const id = this.#id;
    switch (botao.dataset.accao) {
      case "forma": return atualizarPonto(id, { forma: botao.dataset.valor });
      case "cor": return atualizarPonto(id, { cor: botao.dataset.valor });
      case "ocultar": return alternarOculto(id);
      case "apagar": {
        const nome = nomeLimpo(obterPonto(id)?.nome, game.i18n.localize("POI.PontoSemNome"));
        const ok = await foundry.applications.api.DialogV2.confirm({
          window: { title: game.i18n.localize("POI.Acoes.Apagar") },
          content: `<p>${game.i18n.format("POI.Avisos.ConfirmarApagar", { nome })}</p>`
        });
        if (!ok) return;
        this.fechar();
        marcadores.selecionar(null);
        return removerPonto(id);
      }
    }
  }

  /**
   * O painel segue o ponto pelo ecrã e nunca sai dele: se não couber de um lado
   * salta para o outro, se não couber de nenhum encosta-se à margem.
   */
  posicionar() {
    if (!this.#id || !this.#el || this.#el.hidden) return;
    const alvo = marcadores.ecraDe(this.#id);
    if (!alvo) return this.fechar();

    const altura = this.#el.getBoundingClientRect().height || 200;
    const folga = 44;
    const paraDireita = alvo.x + folga + LARGURA + 18 < globalThis.innerWidth;
    let x = paraDireita ? alvo.x + folga : alvo.x - folga - LARGURA;
    let y = alvo.y - altura / 2;
    x = Math.max(18, Math.min(x, globalThis.innerWidth - LARGURA - 18));
    y = Math.max(18, Math.min(y, globalThis.innerHeight - altura - 18));
    this.#el.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;

    const linha = this.#fio.firstElementChild;
    linha.setAttribute("x1", Math.round(alvo.x));
    linha.setAttribute("y1", Math.round(alvo.y));
    linha.setAttribute("x2", Math.round(paraDireita ? x : x + LARGURA));
    linha.setAttribute("y2", Math.round(Math.min(Math.max(alvo.y, y + 14), y + altura - 14)));
    this.#fio.style.opacity = "1";
  }
}

export const painel = new Painel();
