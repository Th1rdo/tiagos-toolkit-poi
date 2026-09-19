import { MODULE_ID, TEMPO, log, paiUI } from "./const.js";
import { pontos, ponto as obterPonto, moverPonto, alternarOculto, alternarEsgotado, proximaPorRevelar, revelarEvidencia } from "./dados.js";
import { pontosVisiveis, estadoDoPonto, indice, resumoDoMestre, ladoDoRotulo, nomeLimpo } from "./logica.js";

/**
 * A camada de marcadores.
 *
 * Fica em HTML por cima do canvas, não dentro dele: o módulo vive de tipografia
 * fina e de linhas de 1 px, e texto desenhado em PIXI nunca fica nítido em todos
 * os níveis de zoom. Em troca, cada marcador é reposicionado a cada `canvasPan`
 * — com dez marcadores é trabalho nenhum, e o tamanho no ecrã passa a ser
 * constante, como uma anotação numa fotografia e não como um objeto do mapa.
 */

const svgNS = "http://www.w3.org/2000/svg";

function reticula() {
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.classList.add("poi-reticula");
  svg.innerHTML = `
    <circle class="poi-anel" cx="12" cy="12" r="7"></circle>
    <circle class="poi-nucleo" cx="12" cy="12" r="1.6"></circle>
    <path class="poi-registo" d="M12 3.5 L12 0.5 M12 23.5 L12 20.5 M3.5 12 L0.5 12 M23.5 12 L20.5 12"></path>`;
  return svg;
}

function botaoIcone(accao, rotulo, caminho) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "poi-acao";
  b.dataset.accao = accao;
  b.title = rotulo;
  b.setAttribute("aria-label", rotulo);
  b.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true">${caminho}</svg>`;
  return b;
}

class CamadaDeMarcadores {
  #raiz = null;
  #elementos = new Map();      // pontoId → elemento
  #selecionado = null;
  #colocar = false;
  #capturador = null;
  #aoSelecionar = () => {};
  #aoColocar = () => {};
  #arrasto = null;

  montar({ aoSelecionar, aoColocar }) {
    this.#aoSelecionar = aoSelecionar;
    this.#aoColocar = aoColocar;
    if (this.#raiz) return;
    const raiz = document.createElement("div");
    raiz.id = "poi-camada";
    paiUI().appendChild(raiz);
    this.#raiz = raiz;

    Hooks.on("canvasPan", () => this.posicionar());
    globalThis.addEventListener("resize", () => this.posicionar());
    globalThis.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape" && this.#selecionado) this.selecionar(null);
    });
  }

  get selecionado() { return this.#selecionado; }

  // ---------------------------------------------------------------- desenho

  /** Redesenha do zero. Chamado quando a cena muda de flags — não a cada frame. */
  desenhar() {
    if (!this.#raiz || !canvas?.ready) return;
    const isGM = game.user.isGM;
    const userId = game.user.id;
    const visiveis = pontosVisiveis(pontos(), { userId, isGM });
    const vistos = new Set();
    let entrada = 0;

    for (const p of visiveis) {
      vistos.add(p.id);
      let el = this.#elementos.get(p.id);
      const novo = !el;
      if (novo) {
        el = this.#criar(p);
        this.#elementos.set(p.id, el);
        this.#raiz.appendChild(el);
        // entram em escada, pela ordem do índice: lê-se como uma varredura
        el.style.animationDelay = `${entrada++ * TEMPO.ESCADA}ms`;
        el.classList.add("poi-a-entrar");
      }
      this.#pintar(el, p, { isGM, userId });
    }

    for (const [id, el] of this.#elementos) {
      if (vistos.has(id)) continue;
      el.remove();
      this.#elementos.delete(id);
      if (this.#selecionado === id) this.selecionar(null);
    }

    this.posicionar();
  }

  #criar(p) {
    const el = document.createElement("div");
    el.className = "poi-marcador";
    el.dataset.id = p.id;

    const alvo = document.createElement("button");
    alvo.type = "button";
    alvo.className = "poi-alvo";
    alvo.appendChild(reticula());
    el.appendChild(alvo);

    const etiqueta = document.createElement("div");
    etiqueta.className = "poi-etiqueta";
    etiqueta.innerHTML = `
      <span class="poi-diagonal"></span>
      <div class="poi-bloco">
        <div class="poi-texto"><span class="poi-indice"></span><span class="poi-nome"></span></div>
        <div class="poi-meta"></div>
      </div>`;
    el.appendChild(etiqueta);

    const barra = document.createElement("div");
    barra.className = "poi-barra";
    barra.append(
      botaoIcone("revelarPonto", game.i18n.localize("POI.Acoes.RevelarPonto"),
        `<path d="M1 8 C4 3.5 12 3.5 15 8 C12 12.5 4 12.5 1 8 Z" fill="none"></path><circle cx="8" cy="8" r="2.2" class="poi-cheio"></circle>`),
      botaoIcone("revelarPista", game.i18n.localize("POI.Acoes.RevelarPista"),
        `<path d="M3 13 L13 3 M9 3 L13 3 L13 7" fill="none"></path>`),
      botaoIcone("esgotar", game.i18n.localize("POI.Acoes.Esgotar"),
        `<circle cx="8" cy="8" r="5.5" fill="none"></circle><circle cx="8" cy="8" r="2.6" class="poi-cheio"></circle>`),
      botaoIcone("editar", game.i18n.localize("POI.Acoes.Editar"),
        `<path d="M3 13 L3 10.5 L11 2.5 L13.5 5 L5.5 13 Z" fill="none"></path>`)
    );
    el.appendChild(barra);

    alvo.addEventListener("click", (ev) => {
      ev.stopPropagation();
      if (this.#arrasto?.mexeu) return;                 // acabou de ser arrastado: não seleciona
      this.selecionar(this.#selecionado === p.id ? null : p.id);
    });
    alvo.addEventListener("pointerdown", (ev) => this.#comecarArrasto(ev, p.id));
    barra.addEventListener("click", (ev) => this.#accaoRapida(ev, p.id));

    return el;
  }

  #pintar(el, p, { isGM, userId }) {
    const estado = estadoDoPonto(p, { userId, isGM });
    el.dataset.estado = estado;
    el.dataset.mestre = isGM ? "1" : "0";
    el.classList.toggle("poi-selecionado", this.#selecionado === p.id);
    el.querySelector(".poi-indice").textContent = indice(p.numero);
    el.querySelector(".poi-nome").textContent = nomeLimpo(p.nome, "—").toUpperCase();
    const meta = el.querySelector(".poi-meta");
    meta.textContent = isGM ? resumoDoMestre(p) : "";
    meta.hidden = !isGM;
    el.querySelector(".poi-alvo").setAttribute("aria-label", `${indice(p.numero)} ${nomeLimpo(p.nome, "")}`);
  }

  /** Cada marcador é colocado em coordenadas de ecrã: não cresce com o zoom. */
  posicionar() {
    if (!this.#raiz || !canvas?.ready) return;
    const t = canvas.stage.worldTransform;
    const largura = globalThis.innerWidth;
    const altura = globalThis.innerHeight;

    for (const [id, el] of this.#elementos) {
      const p = obterPonto(id);
      if (!p) continue;
      const { x, y } = t.apply({ x: p.x, y: p.y });
      el.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
      // fora do ecrã não desaparece — encolhe, para o mapa não ficar a piscar ao arrastar
      el.classList.toggle("poi-fora", x < -80 || y < -80 || x > largura + 80 || y > altura + 80);
      const lado = ladoDoRotulo({ x, y, largura, altura });
      el.dataset.lado = lado.dx > 0 ? "esquerda" : "direita";
      el.dataset.vertical = lado.dy > 0 ? "baixo" : "cima";
    }
    Hooks.callAll(`${MODULE_ID}.posicionou`);
  }

  /** Onde está, no ecrã, o ponto — o cartão precisa de saber para se amarrar a ele. */
  ecraDe(id) {
    const p = obterPonto(id);
    if (!p || !canvas?.ready) return null;
    const { x, y } = canvas.stage.worldTransform.apply({ x: p.x, y: p.y });
    return { x, y };
  }

  // ---------------------------------------------------------------- seleção

  selecionar(id) {
    if (this.#selecionado === id) return;
    this.#selecionado = id;
    for (const [outro, el] of this.#elementos) el.classList.toggle("poi-selecionado", outro === id);
    this.#aoSelecionar(id);
  }

  // ---------------------------------------------------------------- arrastar (mestre)

  #comecarArrasto(ev, id) {
    if (!game.user.isGM || ev.button !== 0) return;
    const inicio = { x: ev.clientX, y: ev.clientY };
    this.#arrasto = { id, inicio, mexeu: false };
    const el = this.#elementos.get(id);

    const mover = (e) => {
      const d = Math.hypot(e.clientX - inicio.x, e.clientY - inicio.y);
      if (d < 4) return;
      this.#arrasto.mexeu = true;
      el?.classList.add("poi-a-arrastar");
      el.style.transform = `translate3d(${Math.round(e.clientX)}px, ${Math.round(e.clientY)}px, 0)`;
    };

    const largar = async (e) => {
      globalThis.removeEventListener("pointermove", mover);
      globalThis.removeEventListener("pointerup", largar);
      el?.classList.remove("poi-a-arrastar");
      if (this.#arrasto?.mexeu) {
        const cena = canvas.stage.worldTransform.applyInverse({ x: e.clientX, y: e.clientY });
        await moverPonto(id, cena.x, cena.y);
      }
      // o clique dispara logo a seguir ao pointerup: só depois é que limpamos
      setTimeout(() => (this.#arrasto = null), 0);
    };

    globalThis.addEventListener("pointermove", mover);
    globalThis.addEventListener("pointerup", largar);
  }

  // ---------------------------------------------------------------- ações rápidas

  async #accaoRapida(ev, id) {
    const botao = ev.target.closest("[data-accao]");
    if (!botao) return;
    ev.stopPropagation();
    const p = obterPonto(id);
    if (!p) return;

    switch (botao.dataset.accao) {
      case "revelarPonto":
        await alternarOculto(id);
        break;
      case "revelarPista": {
        const ev2 = proximaPorRevelar(p);
        if (!ev2) return ui.notifications.info(game.i18n.localize("POI.Avisos.SemPistas"));
        await revelarEvidencia(id, ev2.id);
        Hooks.callAll(`${MODULE_ID}.revelou`, { pontoId: id, evidenciaId: ev2.id });
        break;
      }
      case "esgotar":
        await alternarEsgotado(id);
        break;
      case "editar":
        Hooks.callAll(`${MODULE_ID}.editar`, id);
        break;
    }
  }

  // ---------------------------------------------------------------- colocar

  /**
   * Modo de colocação: uma folha transparente por cima de tudo apanha o clique e
   * converte-o em coordenadas da cena. Assim não disputamos o rato com as
   * ferramentas do próprio Foundry, que é onde estes módulos costumam partir.
   */
  modoColocar(ligado) {
    this.#colocar = ligado;
    document.body.classList.toggle("poi-a-colocar", ligado);
    if (!ligado) {
      this.#capturador?.remove();
      this.#capturador = null;
      return;
    }
    if (this.#capturador) return;
    const folha = document.createElement("div");
    folha.id = "poi-capturador";
    folha.addEventListener("pointerdown", (ev) => {
      if (ev.button !== 0) return;
      ev.preventDefault();
      ev.stopPropagation();
      const alvo = canvas.stage.worldTransform.applyInverse({ x: ev.clientX, y: ev.clientY });
      this.#aoColocar(alvo);
    });
    paiUI().appendChild(folha);
    this.#capturador = folha;
    log("modo de colocação ligado");
  }

  get aColocar() { return this.#colocar; }
}

export const marcadores = new CamadaDeMarcadores();
