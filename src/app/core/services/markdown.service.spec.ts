import { TestBed } from '@angular/core/testing';
import { MarkdownService } from './markdown.service';

describe('MarkdownService', () => {
  let servico: MarkdownService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    servico = TestBed.inject(MarkdownService);
  });

  it('renderiza markdown básico', () => {
    const html = servico.paraHtmlString('Peça **reprovada**.');
    expect(html).toContain('<strong>reprovada</strong>');
  });

  it('renderiza listas do campo de recomendações', () => {
    const html = servico.paraHtmlString('- Incluir CET\n- Corrigir disclaimer');
    expect(html).toContain('<ul>');
    expect(html).toContain('<li>Incluir CET</li>');
  });

  describe('sanitização — o conteúdo vem de LLM e é tratado como não confiável', () => {
    /**
     * As asserções olham o DOM resultante, e não a string: com `html: false` o
     * markdown-it ESCAPA a marcação em vez de removê-la, então `alert(1)` pode
     * aparecer no texto — inerte. O que importa é que nenhum nó executável ou
     * atributo de evento chegue ao documento.
     */
    function comoDom(markdown: string): HTMLElement {
      const raiz = document.createElement('div');
      raiz.innerHTML = servico.paraHtmlString(markdown);
      return raiz;
    }

    it('neutraliza script embutido, sem criar o elemento', () => {
      const dom = comoDom('ok <script>alert(1)</script>');
      expect(dom.querySelector('script')).toBeNull();
      expect(dom.textContent).toContain('ok');
    });

    it('não cria elemento com handler inline de evento', () => {
      const dom = comoDom('<img src=x onerror="alert(1)">');
      expect(dom.querySelector('img')).toBeNull();
      expect(dom.querySelector('[onerror]')).toBeNull();
    });

    it('não deixa passar iframe', () => {
      const dom = comoDom('<iframe src="https://exemplo.invalido"></iframe>');
      expect(dom.querySelector('iframe')).toBeNull();
    });

    it('não gera link com esquema javascript:', () => {
      const dom = comoDom('[clique](javascript:alert(1))');
      const links = Array.from(dom.querySelectorAll('a'));
      expect(links.every((a) => !a.getAttribute('href')?.toLowerCase().startsWith('javascript:')))
        .toBeTrue();
    });

    it('preserva HTML bruto como texto visível, nunca como marcação', () => {
      const dom = comoDom('<b>negrito forjado</b>');
      expect(dom.querySelector('b')).toBeNull();
      expect(dom.textContent).toContain('<b>negrito forjado</b>');
    });

    it('marca link externo com rel de segurança', () => {
      const ancora = comoDom('[BCB](https://www.bcb.gov.br)').querySelector('a');
      expect(ancora?.getAttribute('rel')).toBe('noopener noreferrer');
      expect(ancora?.getAttribute('target')).toBe('_blank');
    });
  });

  describe('paraTextoPlano', () => {
    it('retira a marcação para uso na célula da tabela', () => {
      expect(servico.paraTextoPlano('Peça **reprovada** por omissão.'))
        .toBe('Peça reprovada por omissão.');
    });

    it('trunca com reticências no limite informado', () => {
      const texto = servico.paraTextoPlano('palavra '.repeat(40), 20);
      expect(texto.length).toBe(20);
      expect(texto.endsWith('…')).toBeTrue();
    });

    it('devolve string vazia para conteúdo ausente', () => {
      expect(servico.paraTextoPlano('')).toBe('');
      expect(servico.paraTextoPlano(null)).toBe('');
      expect(servico.paraTextoPlano(undefined)).toBe('');
    });
  });
});
