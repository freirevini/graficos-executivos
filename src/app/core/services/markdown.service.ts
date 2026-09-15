import { Injectable, SecurityContext } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import DOMPurify from 'dompurify';
import MarkdownIt from 'markdown-it';

/**
 * Renderiza texto rico vindo da API (Parecer IA / Recomendações de ajuste).
 *
 * Pipeline obrigatório pelo padrão do chassi (.rules): markdown-it -> DOMPurify.
 * O conteúdo é gerado por LLM no BFF, então é tratado como NÃO CONFIÁVEL:
 * nenhum HTML bruto do payload chega ao DOM sem passar por sanitização.
 */
@Injectable({ providedIn: 'root' })
export class MarkdownService {
  private readonly md = new MarkdownIt({
    html: false, // não interpreta HTML embutido no markdown
    linkify: true,
    breaks: true,
  });

  private readonly configuracaoPurify: DOMPurify.Config = {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre', 'blockquote',
      'ul', 'ol', 'li', 'h3', 'h4', 'h5', 'h6', 'a', 'hr',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
    ],
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
  };

  constructor(private readonly domSanitizer: DomSanitizer) {
    // Links externos nunca herdam o contexto de navegação da SPA.
    DOMPurify.addHook('afterSanitizeAttributes', (node: Element) => {
      if (node instanceof HTMLAnchorElement && node.hasAttribute('href')) {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer');
      }
    });
  }

  /** Markdown -> HTML sanitizado, pronto para `[innerHTML]`. */
  paraHtmlSeguro(markdown: string | null | undefined): SafeHtml {
    return this.domSanitizer.bypassSecurityTrustHtml(this.paraHtmlString(markdown));
  }

  /** Markdown -> string HTML sanitizada (útil em testes e em `title`). */
  paraHtmlString(markdown: string | null | undefined): string {
    if (!markdown) {
      return '';
    }
    const bruto = this.md.render(markdown);
    const limpo = DOMPurify.sanitize(bruto, this.configuracaoPurify) as string;
    // Segunda barreira: o sanitizer do próprio Angular.
    return this.domSanitizer.sanitize(SecurityContext.HTML, limpo) ?? '';
  }

  /** Versão só-texto, para célula de tabela e aria-label. */
  paraTextoPlano(markdown: string | null | undefined, limite = 140): string {
    if (!markdown) {
      return '';
    }
    const elemento = document.createElement('div');
    elemento.innerHTML = this.paraHtmlString(markdown);
    const texto = (elemento.textContent ?? '').replace(/\s+/g, ' ').trim();
    return texto.length > limite ? `${texto.slice(0, limite - 1)}…` : texto;
  }
}
