/* UP! Urban Planning — inicialização */
'use strict';

mostrarAvisosTabelas();          // tabela da lei com problema de leitura: aviso no topo (js/tabelas.js)
initInformacoes();
buildSelects();
initCombos();
initQuadro();
initComodos();
padroesResiduos();
calcularTudo();
initCategoriaUso();
initVagas();
initRecuos();
ready = true;
preencherImpressao();
initMap();
initMedicao();
snapshotSalvo = snapshotAtual();
atualizarStatusJsk();
