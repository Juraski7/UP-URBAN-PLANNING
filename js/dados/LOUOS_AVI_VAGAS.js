/* ====================================================================================================
   LOUOS_AVI_VAGAS
   ANEXO VI - NÚMERO MÍNIMO DE VAGAS DE ESTACIONAMENTO - LEI COMPLEMENTAR n. 205/2012
   ====================================================================================================
   Conteúdo: vagas exigidas por atividade (aba VAGAS)
             vagas = nº de vagas por parâmetro • regras = parâmetros (base, por, texto); com 2 regras vale o MAIOR resultado
             base: ac = área construída (m²), terreno = área do terreno (m²), unidades = unidades imobiliárias,
                   quartos, assentos, salas (sala de aula/laboratório) • por = divisor (ex.: 1 vaga para cada 60 m² -> por: 60)
             carga / embarque = carga e descarga / embarque e desembarque "Exigível" (nota 1: quando sujeito a EIV)
             excecao = regra da nota citada (ex.: acima de 5.000 m², 1 vaga para cada 80 m²)
   Origem:   TABELAS.xlsx#LOUOS_AVI_VAGAS
             GERADO por ferramentas/gerar_dados.py: não editar à mão (corrija o CSV e gere de novo).
   ==================================================================================================== */
'use strict';

const VAGAS_DB = [
    { atividade: "Apart-hotel", vagas: 1, carga: false, embarque: true,
      regras: [{ base: "quartos", por: 2, texto: "para cada 2 (dois) quartos" }] },
    { atividade: "Auditório; cinema; teatro e similar", vagas: 1, carga: false, embarque: true,
      regras: [{ base: "assentos", por: 10, texto: "para cada 10 (dez) assentos" }] },
    { atividade: "Capela; igreja; templo", vagas: 1, carga: false, embarque: true,
      regras: [{ base: "assentos", por: 30, texto: "para cada 30 (trinta) assentos" }] },
    { atividade: "Cemitério", vagas: 1, carga: false, embarque: false,
      regras: [{ base: "terreno", por: 300, texto: "para cada 300m² (trezentos metros quadrados) de área de terreno" }] },
    { atividade: "Bancos", vagas: 1, carga: true, embarque: false,
      regras: [{ base: "ac", por: 50, texto: "para cada 50m² (cinqüenta metros quadrados) de área construída" }] },
    { atividade: "Clube e complexo social/esportivo", vagas: 1, carga: false, embarque: true,
      regras: [{ base: "terreno", por: 300, texto: "para cada 300m² (trezentos metros quadrados) de área de terreno" }] },
    { atividade: "Comércio", vagas: 1, carga: true, embarque: true,
      regras: [{ base: "ac", por: 60, texto: "para cada 60m² (sessenta metros quadrados) de área construída" }, { base: "unidades", por: 1, texto: "para cada unidade imobiliária" }] },
    { atividade: "Edifício público; governamental; secretaria; autarquia; concessão de serviço público e similar", vagas: 1, carga: false, embarque: true,
      regras: [{ base: "ac", por: 50, texto: "para cada 50m² (cinquenta metros quadrados) de área construída" }] },
    { atividade: "Escola infantil; ensino fundamental, médio, inclusive curso profissionalizante", vagas: 1, carga: false, embarque: true,
      regras: [{ base: "salas", por: 1, texto: "para cada sala de aula/laboratório/ sala de informática" }] },
    { atividade: "Estádio; autódromo; hipódromo; velódromo e similar", vagas: 1, carga: false, embarque: true,
      regras: [{ base: "assentos", por: 20, texto: "para cada 20 (vinte) assentos" }] },
    { atividade: "Estação rodoviária", vagas: 1, carga: true, embarque: true,
      regras: [{ base: "ac", por: 100, texto: "para cada 100m² (cem metros quadrados) de área construída" }] },
    { atividade: "Estação ferroviária e aeroviária", vagas: 1, carga: true, embarque: true,
      regras: [{ base: "ac", por: 200, texto: "para cada 200m² (duzentos metros quadrados) de área construída" }] },
    { atividade: "Faculdade; complexo universitário; cursos de nível superior e cursos técnicos e seqüenciais", vagas: 10, carga: false, embarque: true,
      regras: [{ base: "salas", por: 1, texto: "para cada sala de aula/laboratório/sala de informática" }] },
    { atividade: "Ginásio de esporte", vagas: 1, carga: false, embarque: true,
      regras: [{ base: "assentos", por: 20, texto: "para cada 20 (vinte) assentos" }] },
    { atividade: "Hospital e Clínicas médicas com internação", vagas: 1, carga: false, embarque: true,
      regras: [{ base: "ac", por: 60, texto: "para cada 60m² (sessenta metros quadrados) de área construída", nota: 2, excecao: {"acimaDe": 5000, "por": 80} }] },
    { atividade: "Hotel, pensão, pousadas ou similares", vagas: 1, carga: false, embarque: true,
      regras: [{ base: "quartos", por: 4, texto: "para cada 04 (quatro) quartos" }] },
    { atividade: "Indústria", vagas: 1, carga: true, embarque: false,
      regras: [{ base: "ac", por: 100, texto: "para cada 100m² (cem metros quadrados) de área construída" }] },
    { atividade: "Motel", vagas: 1, carga: false, embarque: false,
      regras: [{ base: "quartos", por: 1, texto: "para cada quarto" }] },
    { atividade: "Parque de diversões", vagas: 1, carga: false, embarque: false,
      regras: [{ base: "terreno", por: 300, texto: "para cada 300m² (trezentos metros quadrados) de área de terreno" }] },
    { atividade: "Parque de exposições", vagas: 1, carga: true, embarque: true,
      regras: [{ base: "terreno", por: 200, texto: "para cada 200m² (duzentos metros quadrados) de área de terreno" }] },
    { atividade: "Presídios; penitenciária; e complexo de instalações militares", vagas: 1, carga: true, embarque: true,
      regras: [{ base: "ac", por: 200, texto: "para cada 200m² (duzentos metros quadrados) de área construída" }] },
    { atividade: "Residencial", vagas: 1, carga: false, embarque: false,
      regras: [{ base: "unidades", por: 1, texto: "para cada unidade imobiliária" }] },
    { atividade: "Salão de exposição/galeria; complexo cultural diversificado; museu e biblioteca", vagas: 1, carga: false, embarque: true,
      regras: [{ base: "ac", por: 100, texto: "para cada 100m² (cem metros quadrados) de área construída" }] },
    { atividade: "Shopping center; supermercados; hipermercados", vagas: 1, carga: true, embarque: true,
      regras: [{ base: "ac", por: 35, texto: "para cada 35m² (trinta e cinco metros quadrados) de área construída" }] },
    { atividade: "Serviços em geral", vagas: 1, carga: true, embarque: true,
      regras: [{ base: "ac", por: 60, texto: "para cada 60m² (sessenta metros quadrados) de área construída" }, { base: "unidades", por: 1, texto: "para cada unidade imobiliária" }] },
    { atividade: "Serviços de saúde; clínicas sem internação", vagas: 1, carga: false, embarque: true,
      regras: [{ base: "ac", por: 50, texto: "para cada 50m² (cinqüenta metros quadrados) de área construída" }] },
    { atividade: "Restaurante; lanchonete e similares", vagas: 1, carga: false, embarque: false,
      regras: [{ base: "ac", por: 50, texto: "para cada 50m² (cinqüenta metros quadrados) de área construída" }] },
    { atividade: "Velório e crematório", vagas: 1, carga: false, embarque: true,
      regras: [{ base: "ac", por: 50, texto: "para cada 50m² (cinqüenta metros quadrados) de área construída" }] },
    { atividade: "Salão de baile; boate; casa de show; clube noturno; discoteca e similares", vagas: 1, carga: false, embarque: true,
      regras: [{ base: "ac", por: 25, texto: "para cada 25m² (vinte e cinco metros quadrados) de área construída" }] }
];

// Notas da tabela
const VAGAS_NOTAS = {
    1: "Passível de ser exigido nos empreendimentos sujeitos ao Estudo de Impacto de Vizinhança - EIV",
    2: "Para empreendimentos com mais de 5.000m² será exigida 1 vaga para cada 80m²"
};
