import { MODULE_ID, CORES, paiUI } from "./const.js";
import { pontos, ponto as obterPonto, moverPonto } from "./dados.js";
import { pontosVisiveis, aparencia, indice, nomeLimpo, ladoDoRotulo } from "./logica.js";

/**
 * A camada de marcadores.
 *
 * HTML por cima do canvas, não PIXI: o módulo vive de linhas de 1 px e de
 * tipografia, e texto desenhado em PIXI nunca fica nítido em todos os zooms.
 * Em troca, cada marcador é reposicionado a cada `canvasPan` — com uma dúzia de
 * pontos é trabalho nenhum, e o marcador fica do mesmo tamanho no ecrã: uma
 * anotação sobre a cena, não um objeto dentro dela.
 *
 * Interação: passar o rato mostra o nome, clicar abre, arrastar muda de sítio.
 * Não há mais nada para aprender.
 */

const svgNS = "http://www.w3.org/2000/svg";

/** Cada forma é um desenho só, sem preenchimento, com um ponto no centro exato. */
const DESENHOS = {
  reticula: `<circle class="poi-corpo" cx="12" cy="12" r="7"></circle>
             <path class="poi-registo" d="M12 3.5 L12 0.5 M12 23.5 L12 20.5 M3.5 12 L0.5 12 M23.5 12 L20.5 12"></path>`,
  anel: `<circle class="poi-corpo" cx="12" cy="12" r="8.5"></circle>`,
  losango: `<path class="poi-corpo" d="M12 2.5 L21.5 12 L12 21.5 L2.5 12 Z"></path>`,
  cruz: `<path class="poi-corpo" d="M12 1.5 L12 22.5 M1.5 12 L22.5 12"></path>`,
  quadrado: `<path class="poi-corpo" d="M4 4 L20 4 L20 20 L4 20 Z"></path>`
};

function glifo(forma) {
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.classList.add("poi-glifo");
  svg.innerHTML = `${DESENHOS[forma] ?? DESENHOS.reticula}<circle class="poi-nucleo" cx="12" cy="12" r="1.7"></circle>`;
  return svg;
}

class CamadaDeMarcadores {
  #raiz = null;
  #elementos = new Map();
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
  }

  get selecionado() { return this.#selecionado; }
  get aColocar() { return this.#colocar; }

  // ---------------------------------------------------------------- desenho

  desenhar() {
    if (!this.#raiz || !canvas?.ready) return;
    const isGM = game.user.isGM;
    const vistos = new Set();

    for (const p of pontosVisiveis(pontos(), { isGM })) {
      vistos.add(p.id);
      let el = this.#elementos.get(p.id);
      if (!el) {
        el = this.#criar(p);
        this.#elementos.set(p.id, el);
        this.#raiz.appendChild(el);
      }
      this.#pintar(el, p, isGM);
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
    el.appendChild(alvo);

    const etiqueta = document.createElement("div");
    etiqueta.className = "poi-etiqueta";
    etiqueta.innerHTML = `<span class="poi-diagonal"></span>
      <div class="poi-bloco"><span class="poi-indice"></span><span class="poi-nome"></span></div>`;
    el.appendChild(etiqueta);

    alvo.addEventListener("pointerdown", (ev) => this.#pegar(ev, p.id));
    alvo.addEventListener("contextmenu", (ev) => {
      if (!game.user.isGM) return;
      ev.preventDefault();
      ev.stopPropagation();
      this.selecionar(p.id);
    });
    return el;
  }

  #pintar(el, p, isGM) {
    const { forma, cor, tamanho } = aparencia(p);
    if (el.dataset.forma !== forma) {
      el.dataset.forma = forma;
      el.querySelector(".poi-alvo").replaceChildren(glifo(forma));
    }
    el.style.setProperty("--poi-tam", tamanho);
    el.style.setProperty("--poi-cor", CORES[cor] ?? "var(--poi-acento)");
    el.dataset.oculto = p.oculto ? "1" : "0";
    el.dataset.mestre = isGM ? "1" : "0";
    el.classList.toggle("poi-selecionado", this.#selecionado === p.id);
    el.querySelector(".poi-indice").textContent = indice(p.numero);
    el.querySelector(".poi-nome").textContent = nomeLimpo(p.nome, "—").toUpperCase();
    el.querySelector(".poi-alvo").setAttribute("aria-label", `${indice(p.numero)} ${nomeLimpo(p.nome, "")}`);
  }

  /** Coordenadas de ecrã: o marcador não cresce com o zoom do mapa. */
  posicionar() {
    if (!this.#raiz || !canvas?.ready) return;
    const t = canvas.stage.worldTransform;
    const largura = globalThis.innerWidth;
    const altura = globalThis.innerHeight;

    for (const [id, el] of this.#elementos) {
      if (this.#arrasto?.id === id && this.#arrasto.mexeu) continue;   // a ser arrastado: manda o rato
      const p = obterPonto(id);
      if (!p) continue;
      const { x, y } = t.apply({ x: p.x, y: p.y });
      el.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
      el.classList.toggle("poi-fora", x < -120 || y < -120 || x > largura + 120 || y > altura + 120);
      const lado = ladoDoRotulo({ x, y, largura, altura });
      el.dataset.lado = lado.dx > 0 ? "esquerda" : "direita";
      el.dataset.vertical = lado.dy > 0 ? "baixo" : "cima";
    }
    Hooks.callAll(`${MODULE_ID}.posicionou`);
  }

  ecraDe(id) {
    const p = obterPonto(id);
    if (!p || !canvas?.ready) return null;
    return canvas.stage.worldTransform.apply({ x: p.x, y: p.y });
  }

  // ---------------------------------------------------------------- seleção

  selecionar(id) {
    if (this.#selecionado === id) return;
    this.#selecionado = id;
    for (const [outro, el] of this.#elementos) el.classList.toggle("poi-selecionado", outro === id);
    this.#aoSelecionar(id);
  }

  alternarSelecao(id) { this.selecionar(this.#selecionado === id ? null : id); }

  // ---------------------------------------------------------------- pegar e largar

  /**
   * Um gesto só: carregar e largar abre; carregar e mexer arrasta.
   *
   * O ponto não salta para debaixo do cursor — mantém a distância a que foi
   * agarrado, senão um marcador grande dava sempre um pulo ao começar a mexer.
   */
  #pegar(ev, id) {
    if (ev.button !== 0) return;
    const el = this.#elementos.get(id);
    const podeArrastar = game.user.isGM;
    const inicio = { x: ev.clientX, y: ev.clientY };
    const agora = this.ecraDe(id) ?? inicio;
    this.#arrasto = { id, inicio, mexeu: false, desvio: { x: agora.x - inicio.x, y: agora.y - inicio.y } };
    ev.stopPropagation();

    const mover = (e) => {
      if (!podeArrastar || !this.#arrasto) return;
      if (!this.#arrasto.mexeu && Math.hypot(e.clientX - inicio.x, e.clientY - inicio.y) < 4) return;
      if (!this.#arrasto.mexeu) {
        this.#arrasto.mexeu = true;
        el?.classList.add("poi-a-arrastar");
        Hooks.callAll(`${MODULE_ID}.arrastando`, id);
      }
      const x = e.clientX + this.#arrasto.desvio.x;
      const y = e.clientY + this.#arrasto.desvio.y;
      el.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
    };

    const largar = async (e) => {
      globalThis.removeEventListener("pointermove", mover);
      globalThis.removeEventListener("pointerup", largar);
      el?.classList.remove("poi-a-arrastar");
      const arrasto = this.#arrasto;
      this.#arrasto = null;
      if (!arrasto) return;
      if (!arrasto.mexeu) return this.alternarSelecao(id);
      const alvo = canvas.stage.worldTransform.applyInverse({
        x: e.clientX + arrasto.desvio.x,
        y: e.clientY + arrasto.desvio.y
      });
      await moverPonto(id, alvo.x, alvo.y);
      Hooks.callAll(`${MODULE_ID}.largou`, id);
    };

    globalThis.addEventListener("pointermove", mover);
    globalThis.addEventListener("pointerup", largar);
  }

  // ---------------------------------------------------------------- colocar

  /**
   * Modo de colocação: uma folha transparente apanha o clique e converte-o em
   * coordenadas da cena — assim não disputamos o rato com as ferramentas do
   * próprio Foundry, que é onde estes módulos costumam partir. Um clique em cima
   * de um marcador é devolvido a esse marcador em vez de criar outro por cima.
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
      folha.style.pointerEvents = "none";
      const porBaixo = document.elementFromPoint(ev.clientX, ev.clientY);
      folha.style.pointerEvents = "";
      const alvo = porBaixo?.closest?.(".poi-alvo");
      if (alvo) return this.#pegar(ev, alvo.closest(".poi-marcador").dataset.id);
      if (porBaixo?.closest?.("#poi-painel")) return;
      this.#aoColocar(canvas.stage.worldTransform.applyInverse({ x: ev.clientX, y: ev.clientY }));
    });
    paiUI().appendChild(folha);
    this.#capturador = folha;
  }
}

export const marcadores = new CamadaDeMarcadores();
