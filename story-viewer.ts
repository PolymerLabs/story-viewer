import { LitElement, html, css, internalProperty, customElement, PropertyValues } from 'lit-element';
import { classMap } from 'lit-html/directives/class-map';

// Gesture control
import 'hammerjs';

@customElement('story-viewer')
export class StoryViewer extends LitElement {

  @internalProperty() _index: number = 0;
  get index() {
    return this._index;
  }
  set index(value: number) {
    this.children[this._index].dispatchEvent(new CustomEvent('exited'));
    this.children[value].dispatchEvent(new CustomEvent('entered'));
    this._index = value;
  }

  @internalProperty() _panData: {isFinal?: boolean, deltaX?: number} = {};

  constructor() {
    super();
    // Detect pans easily with Hammer.js
    new Hammer(this).on('pan', (e: HammerInput) => this._panData = e);
    this.index = 0;
  }

  firstUpdated() {
    this.children[this._index].dispatchEvent(new CustomEvent('entered'));
  }

  update(changedProperties: PropertyValues) {
    let { deltaX = 0, isFinal = false } = this._panData;

    // Guard against an infinite loop by looking for index.
    if (!changedProperties.has("_index") && isFinal) {
      deltaX > 0 ? this.previous() : this.next();
    }

    const width = this.clientWidth;
    const minScale = 0.8;
    // We don't want the latent deltaX when releasing a pan.
    deltaX = (isFinal ? 0 : deltaX);

    Array.from(this.children).forEach((el: Element, i) => {
      const x = (i - this.index) * width + deltaX;

      // Piecewise scale(deltaX), looks like: __/\__
      const u = deltaX / width + (i - this.index);
      const v = -Math.abs(u * (1 - minScale)) + 1;
      const scale = Math.max(v, minScale);

      (el as HTMLElement).style.transform = `translate3d(${x}px,0,0) scale(${scale})`;
    })

    super.update(changedProperties);
  }

  /* Advance to the next story card if possible */
  next() {
    this.index = Math.max(0, Math.min(this.children.length - 1, this.index + 1));
  }

  /* Go back to the previous story card if possible */
  previous() {
    this.index = Math.max(0, Math.min(this.children.length - 1, this.index - 1));
  }

  static styles = css`
    :host {
      display: block;
      position: relative;
      align-items: center;
      width: 300px;
      height: 800px;
    }
    ::slotted(*) {
      position: absolute;
      width: 100%;
      height: calc(100% - 20px);
      transition: transform 0.35s ease-out;
    }

    svg {
      position: absolute;
      top: calc(50% - 25px);
      height: 50px;
      cursor: pointer;
    }
    #next {
      right: 0;
    }

    #progress {
      position: relative;
      top: calc(100% - 20px);
      height: 20px;
      width: 50%;
      margin: 0 auto;
      display: grid;
      grid-auto-flow: column;
      grid-auto-columns: 1fr;
      grid-gap: 10px;
      align-content: center;
    }
    #progress > div {
      background: grey;
      height: 4px;
      transition: background 0.3s linear;
      cursor: pointer;
    }
    #progress > div.watched {
      background: white;
    }`;

  render() {
    return html`
      <slot></slot>

      <svg id="prev" viewBox="0 0 10 10" @click=${() => this.previous()}>
        <path d="M 6 2 L 4 5 L 6 8" stroke="#fff" fill="none" />
      </svg>
      <svg id="next" viewBox="0 0 10 10" @click=${() => this.next()}>
        <path d="M 4 2 L 6 5 L 4 8" stroke="#fff" fill="none" />
      </svg>
      
      <div id="progress">
        ${Array.from(this.children).map((_, i) => html`
          <div
            class=${classMap({watched: i <= this.index})}
            @click=${() => this.index = i}
          ></div>`
        )}
      </div>
    `;
  }
}
