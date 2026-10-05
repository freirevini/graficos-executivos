import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable, combineLatest, map } from 'rxjs';
import { UsuarioAtual, UsuarioService } from '../../../../core/services/usuario.service';
import { Recurso } from '../../../../core/models/recurso.model';
import { ConfiguracaoProjetoDto, ResumoInicioDto, UltimaAnaliseDto } from '../../models/inicio.dto';
import { KpisInicio, montarKpis } from '../../models/kpis-inicio';
import { ultimosDias } from '../../models/periodo-recente';
import { saudacaoPorHora } from '../../models/saudacao';
import { InicioStore } from '../../state/inicio.store';
import { AtalhoInicio, PainelAtalhosComponent } from '../../components/painel-atalhos/painel-atalhos.component';
import {
  DadosDialogoConfiguracao,
  DialogoConfiguracaoComponent,
} from '../../components/dialogo-configuracao/dialogo-configuracao.component';
import {
  DadosDialogoGraficoMensal,
  DialogoGraficoMensalComponent,
} from '../../components/dialogo-grafico-mensal/dialogo-grafico-mensal.component';
import { UltimasAnalisesComponent } from '../../components/ultimas-analises/ultimas-analises.component';
import { CartaoSobreComponent } from '../../components/cartao-sobre/cartao-sobre.component';
import { ComoFuncionaComponent } from '../../components/como-funciona/como-funciona.component';
import { TileKpiComponent } from '../../components/tile-kpi/tile-kpi.component';
import { ChassiModule } from '../../../../shared/chassi/chassi.module';
import { HeroInicioComponent } from '../../components/hero-inicio/hero-inicio.component';
import { NgIf, AsyncPipe } from '@angular/common';

interface VisaoInicio {
  usuario: UsuarioAtual;
  saudacao: string;
  resumo: Recurso<ResumoInicioDto>;
  ultimas: Recurso<UltimaAnaliseDto[]>;
  kpis: KpisInicio | null;
  /** Card "Pipeline de IA": nº de agentes e versão do prompt. */
  pipeline: { agentes: number; detalhe: string } | null;
}

@Component({
    selector: 'ini-pagina-inicio',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './pagina-inicio.component.html',
    styleUrls: ['./pagina-inicio.component.scss'],
    providers: [InicioStore],
    standalone: true,
    imports: [NgIf, HeroInicioComponent, ChassiModule, TileKpiComponent, ComoFuncionaComponent, CartaoSobreComponent, UltimasAnalisesComponent, PainelAtalhosComponent, AsyncPipe]
})
export class PaginaInicioComponent {
  readonly visao$: Observable<VisaoInicio>;

  /** Atalhos com o recorte já pronto (query params do cross-filter: uma chave por dimensão). */
  readonly atalhos: AtalhoInicio[] = [
    {
      id: 'ultimos-30-dias',
      rotulo: 'Últimos 30 dias',
      descricao: 'Volume avaliado dia a dia no último mês.',
      icone: 'calendar_month',
      rota: ['/graficos-executivos'],
      queryParams: ultimosDias(30),
    },
    {
      id: 'risco-compliance',
      rotulo: 'Risco de Compliance',
      descricao: 'Peças com risco de Compliance e Regulatório.',
      icone: 'gavel',
      rota: ['/graficos-executivos'],
      queryParams: { risco: 'COMPLIANCE' },
    },
    {
      id: 'avaliar-peca',
      rotulo: 'Avaliar peça',
      descricao: 'Envie uma nova peça para análise.',
      icone: 'upload_file',
      rota: ['/avaliar'],
    },
  ];

  constructor(
    private readonly store: InicioStore,
    private readonly usuario: UsuarioService,
    private readonly dialogo: MatDialog,
  ) {
    const agora = new Date();

    this.visao$ = combineLatest({
      usuario: this.usuario.usuarioAtual$,
      resumo: this.store.resumo$,
      ultimas: this.store.ultimasAnalises$,
    }).pipe(
      map(({ usuario, resumo, ultimas }) => ({
        usuario,
        saudacao: saudacaoPorHora(agora.getHours()),
        resumo,
        ultimas,
        kpis: resumo.dados ? montarKpis(resumo.dados, agora) : null,
        pipeline: resumo.dados
          ? {
              agentes: resumo.dados.configuracao.modelos.length,
              detalhe: `RAG · Prompt ${resumo.dados.configuracao.versaoPrompt}`,
            }
          : null,
      })),
    );
  }

  recarregar(): void {
    this.store.recarregar();
  }

  abrirPipeline(configuracao: ConfiguracaoProjetoDto | null | undefined): void {
    if (!configuracao) return;
    this.dialogo.open<DialogoConfiguracaoComponent, DadosDialogoConfiguracao>(DialogoConfiguracaoComponent, {
      data: { configuracao },
      width: 'min(560px, 92vw)',
      maxHeight: '86vh',
      autoFocus: 'dialog',
      restoreFocus: true,
      ariaLabel: 'Configuração do pipeline de IA',
    });
  }

  abrirGraficoAnalises(resumo: ResumoInicioDto | null | undefined): void {
    if (!resumo) return;
    this.abrirGraficoMensal(`Análises em ${resumo.ano}`, resumo, 'total');
  }

  abrirGraficoTempoMedio(resumo: ResumoInicioDto | null | undefined): void {
    if (!resumo) return;
    this.abrirGraficoMensal('Tempo médio para análise', resumo, 'tempoMedioSegundos');
  }

  private abrirGraficoMensal(
    titulo: string,
    resumo: ResumoInicioDto,
    metrica: DadosDialogoGraficoMensal['metrica'],
  ): void {
    this.dialogo.open<DialogoGraficoMensalComponent, DadosDialogoGraficoMensal>(
      DialogoGraficoMensalComponent,
      {
        data: { titulo, pontos: resumo.serieMensal, metrica },
        width: 'min(620px, 92vw)',
        maxHeight: '86vh',
        autoFocus: 'dialog',
        restoreFocus: true,
        ariaLabel: titulo,
      },
    );
  }
}
