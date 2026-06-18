/* ==================================================
   1. CONFIGURAÇÃO SUPABASE (AGUARDANDO PASSO 3)
   ================================================== */
const SUPABASE_URL = 'SUA_URL_AQUI_NO_FUTURO';
const SUPABASE_KEY = 'SUA_CHAVE_AQUI_NO_FUTURO';

/* ==================================================
   2. VARIÁVEIS GLOBAIS E ESTADO
   ================================================== */
let semanaSelecionada = null; 

// A SUA LISTA EXATA DE PRODUTOS
let mockEstoque = [
    { id: 1, nome: 'Café', qtd: 20, preco: 1.00 },
    { id: 2, nome: 'Chocolate', qtd: 15, preco: 2.50 },
    { id: 3, nome: 'Chocolate 50%', qtd: 10, preco: 2.50 },
    { id: 4, nome: 'Chocolate c/ Morango', qtd: 10, preco: 2.50 },
    { id: 5, nome: 'Chocolate c/ Churros', qtd: 5, preco: 2.50 },
    { id: 6, nome: 'Coco', qtd: 12, preco: 2.50 },
    { id: 7, nome: 'Coco c/ chocolate', qtd: 8, preco: 2.50 },
    { id: 8, nome: 'Castanha', qtd: 10, preco: 2.50 },
    { id: 9, nome: 'Churros', qtd: 6, preco: 2.50 },
    { id: 10, nome: 'Doce de Leite c/ Coco', qtd: 9, preco: 2.50 },
    { id: 11, nome: 'Limão', qtd: 15, preco: 2.50 },
    { id: 12, nome: 'Maracujá', qtd: 14, preco: 2.50 },
    { id: 13, nome: 'Ninho c/ Morango', qtd: 10, preco: 2.50 },
    { id: 14, nome: 'Paçoca', qtd: 8, preco: 2.50 },
    { id: 15, nome: 'Oreo', qtd: 5, preco: 2.50 },
    { id: 16, nome: 'Cone Trufado', qtd: 6, preco: 12.00 },
    { id: 17, nome: 'Brownie', qtd: 4, preco: 6.00 }
];

// Dados da venda, salvando apenas o ID do produto e a quantidade comprada
let mockVendas_Weekly = [
    { id: 1, data: '02/06/2026', colaborador: 'Douglas', itens: [{ id_produto: 2, qtd: 2 }, { id_produto: 1, qtd: 1 }], obs: 'Pago no PIX', total_devido: 6.00 },
    { id: 2, data: '03/06/2026', colaborador: 'Janaelson', itens: [{ id_produto: 16, qtd: 1 }], obs: '', total_devido: 12.00 }
];

/* ==================================================
   3. FUNÇÕES DE INTERFACE (UI) & LÓGICA DE SEMANA
   ================================================== */
function mudarAba(abaId) {
    document.getElementById('aba-dashboard').classList.add('hidden');
    document.getElementById('aba-vendas').classList.add('hidden');
    document.getElementById('aba-estoque').classList.add('hidden');
    document.getElementById('aba-financeiro').classList.add('hidden');
    
    document.getElementById(`aba-${abaId}`).classList.remove('hidden');

    const titulos = {
        'dashboard': 'Visão Geral',
        'vendas': 'Controle de Consumo Semanal',
        'estoque': 'Gerenciamento de Estoque',
        'financeiro': 'Acertos Financeiros'
    };
    document.getElementById('titulo-aba').innerText = titulos[abaId];

    if(!semanaSelecionada) calcularSemanaAtual();

    if(abaId === 'estoque') renderizarEstoque();
    if(abaId === 'vendas') renderizarVendasSemanais();
    if(abaId === 'financeiro') renderizarFinanceiro();
    if(abaId === 'dashboard') calcularDashboard();
}

function abrirModal(id) { document.getElementById(id).classList.remove('hidden'); }
function fecharModal(id) { document.getElementById(id).classList.add('hidden'); }

function getStartAndEndOfWeek(date) {
    let day = date.getDay();
    let diff = date.getDate() - day + (day === 0 ? -6 : 1);
    let start = new Date(date.setDate(diff));
    let end = new Date(start);
    end.setDate(start.getDate() + 4);
    return { start, end };
}

function calcularSemanaAtual() {
    let hoje = new Date();
    semanaSelecionada = getStartAndEndOfWeek(new Date(hoje));
}

function popularWeekSelector() {
    const selector = document.getElementById('semana-filtro');
    selector.innerHTML = '';
    let { start: semanaAtualStart } = getStartAndEndOfWeek(new Date());

    for (let i = 0; i < 5; i++) {
        let diff = semanaAtualStart.getDate() - (i * 7);
        let start = new Date(semanaAtualStart);
        start.setDate(diff);
        let end = new Date(start);
        end.setDate(start.getDate() + 4);

        let rangeText = `${start.toLocaleDateString('pt-BR')} a ${end.toLocaleDateString('pt-BR')}`;
        let option = document.createElement('option');
        option.value = rangeText;
        option.innerText = i === 0 ? `${rangeText} (Atual)` : rangeText;
        selector.appendChild(option);
    }
}

function alterarSemanaFiltro() {
    const selector = document.getElementById('semana-filtro');
    const rangeText = selector.value.replace(' (Atual)', '');
    const [inicioStr, fimStr] = rangeText.split(' a ');
    
    const [dI, mI, aI] = inicioStr.split('/');
    const [dF, mF, aF] = fimStr.split('/');

    semanaSelecionada = {
        start: new Date(aI, mI - 1, dI),
        end: new Date(aF, mF - 1, dF)
    };
    mudarAba('vendas');
}

/* ==================================================
   4. ESTOQUE: CRUD Dinâmico
   ================================================== */
function renderizarEstoque() {
    const grid = document.getElementById('grid-estoque');
    grid.innerHTML = '';
    
    mockEstoque.forEach(p => {
        let corEstoque = p.qtd <= 3 ? 'text-red-500' : 'text-blue-600';
        grid.innerHTML += `
            <div class="bg-white p-4 rounded-lg shadow border border-gray-200 relative group">
                <button onclick="excluirProduto(${p.id})" class="absolute top-2 right-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition" title="Excluir">
                    <i class="fa-solid fa-trash text-sm"></i>
                </button>
                <h4 class="font-bold text-gray-800 text-sm truncate pr-6" title="${p.nome}">${p.nome}</h4>
                <p class="text-xs text-gray-500 mb-2">R$ ${p.preco.toFixed(2).replace('.',',')}</p>
                <div class="flex items-end justify-between border-t pt-2">
                    <span class="text-xs text-gray-400 uppercase">Em estoque</span>
                    <span class="block text-xl font-bold ${corEstoque}">${p.qtd} <span class="text-xs font-normal text-gray-500">un</span></span>
                </div>
            </div>
        `;
    });
}

function salvarEstoque() {
    const nome = document.getElementById('input-prod-nome').value;
    const qtd = parseInt(document.getElementById('input-prod-qtd').value);
    const preco = parseFloat(document.getElementById('input-prod-preco').value);

    if(!nome || isNaN(qtd) || isNaN(preco)) return alert("Preencha todos os campos!");

    mockEstoque.push({ id: Date.now(), nome, qtd, preco });
    fecharModal('modal-estoque');
    renderizarEstoque();
}

function excluirProduto(id) {
    if(confirm("Tem certeza que deseja excluir este produto do sistema?")) {
        mockEstoque = mockEstoque.filter(p => p.id !== id);
        renderizarEstoque();
    }
}

/* ==================================================
   5. VENDAS: Visualização Limpa
   ================================================== */
function renderizarVendasSemanais() {
    if (!semanaSelecionada) calcularSemanaAtual();
    const container = document.getElementById('container-vendas-semanais');
    container.innerHTML = '';

    document.getElementById('vendas-semana-info').innerText = `Semana: ${semanaSelecionada.start.toLocaleDateString('pt-BR')} a ${semanaSelecionada.end.toLocaleDateString('pt-BR')}`;
    document.getElementById('vendas-gerado-info').innerText = `Gerado: ${new Date().toLocaleString('pt-BR')}`;

    const vendasSemana = mockVendas_Weekly.filter(v => {
        const [day, month, year] = v.data.split('/');
        const dataVenda = new Date(year, month - 1, day);
        return dataVenda >= semanaSelecionada.start && dataVenda <= semanaSelecionada.end;
    });

    const agrupamentoDias = { 'Segunda-feira': [], 'Terça-feira': [], 'Quarta-feira': [], 'Quinta-feira': [], 'Sexta-feira': [] };

    vendasSemana.forEach(v => {
        const [day, month, year] = v.data.split('/');
        const dayName = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'][new Date(year, month - 1, day).getDay()];
        if(agrupamentoDias[dayName]) agrupamentoDias[dayName].push(v);
    });

    Object.keys(agrupamentoDias).forEach(day => {
        const vendasDoDia = agrupamentoDias[day];
        if (vendasDoDia.length === 0) return;

        let htmlDia = `
            <div class="grid grid-cols-[1fr,40px] items-start mb-6 border border-gray-200 rounded-lg overflow-hidden bg-white shadow">
                <div class="p-0 overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead class="bg-gray-100 text-gray-700 text-xs uppercase border-b">
                            <tr>
                                <th class="p-3 w-1/4">Colaborador</th>
                                <th class="p-3 w-1/2">Itens Consumidos</th>
                                <th class="p-3">Total</th>
                                <th class="p-3">Observação</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100">
        `;

        vendasDoDia.forEach(v => {
            // Lógica para montar a string bonita de "Itens Consumidos"
            let badgesItens = v.itens.map(itemComprado => {
                const produtoInfo = mockEstoque.find(p => p.id === itemComprado.id_produto);
                const nomeProduto = produtoInfo ? produtoInfo.nome : 'Produto Deletado';
                return `<span class="inline-block bg-blue-50 border border-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-1 mb-1 font-medium">${itemComprado.qtd}x ${nomeProduto}</span>`;
            }).join('');

            htmlDia += `
                <tr class="hover:bg-gray-50 transition">
                    <td class="p-3 text-sm font-semibold text-gray-800">${v.colaborador}</td>
                    <td class="p-3">${badgesItens}</td>
                    <td class="p-3 text-sm font-bold text-gray-700">R$ ${v.total_devido.toFixed(2).replace('.',',')}</td>
                    <td class="p-3 text-xs text-gray-500">${v.obs || '-'}</td>
                </tr>
            `;
        });

        htmlDia += `
                        </tbody>
                    </table>
                </div>
                <div class="bg-blue-600 border-l border-blue-700 flex items-center justify-center h-full">
                    <span class="text-xs font-bold text-white uppercase tracking-widest vertical-text transform -rotate-180">${day}</span>
                </div>
            </div>
        `;
        container.innerHTML += htmlDia;
    });
}

/* ==================================================
   6. LÓGICA DE REGISTRO E BAIXA DE ESTOQUE
   ================================================== */
function abrirModalAddVenda() {
    document.getElementById('input-consumo-colaborador').value = '';
    document.getElementById('input-consumo-data').value = new Date().toISOString().split('T')[0];
    document.getElementById('input-consumo-obs').value = '';
    document.getElementById('total-consumo-modal').innerText = "R$ 0,00";
    
    // Gera os campos dinamicamente baseado no Estoque atual
    const containerInputs = document.getElementById('container-produtos-consumo');
    containerInputs.innerHTML = '';

    mockEstoque.forEach(p => {
        containerInputs.innerHTML += `
            <div class="flex justify-between items-center bg-white p-2 border rounded shadow-sm">
                <div class="flex flex-col">
                    <span class="text-xs font-bold text-gray-700 truncate w-32" title="${p.nome}">${p.nome}</span>
                    <span class="text-[10px] text-gray-500">R$ ${p.preco.toFixed(2).replace('.',',')} | Resta: ${p.qtd}</span>
                </div>
                <input type="number" id="qtd-prod-${p.id}" class="w-16 border border-gray-300 rounded p-1 text-center text-sm" min="0" max="${p.qtd}" value="0" onchange="calcularTotalDinamico()">
            </div>
        `;
    });

    abrirModal('modal-consumo');
}

function calcularTotalDinamico() {
    let total = 0;
    mockEstoque.forEach(p => {
        let inputQtd = document.getElementById(`qtd-prod-${p.id}`);
        if(inputQtd && parseInt(inputQtd.value) > 0) {
            total += parseInt(inputQtd.value) * p.preco;
        }
    });
    document.getElementById('total-consumo-modal').innerText = `R$ ${total.toFixed(2).replace('.', ',')}`;
}

function salvarConsumo() {
    const colaborador = document.getElementById('input-consumo-colaborador').value;
    const dataInput = document.getElementById('input-consumo-data').value;
    const obs = document.getElementById('input-consumo-obs').value;

    if(!colaborador || !dataInput) return alert("Preencha colaborador e data!");

    let itensComprados = [];
    let totalVenda = 0;

    // Varre todos os produtos no estoque para ver quais foram comprados
    mockEstoque.forEach(p => {
        let inputQtd = document.getElementById(`qtd-prod-${p.id}`);
        let qtd = parseInt(inputQtd.value);
        
        if (qtd > 0) {
            if (qtd > p.qtd) return alert(`Quantidade de ${p.nome} excede o estoque!`);
            
            // 1. Adiciona à lista da compra
            itensComprados.push({ id_produto: p.id, qtd: qtd });
            totalVenda += qtd * p.preco;
            
            // 2. DIMINUI O ESTOQUE (Regra de Negócio solicitada)
            p.qtd -= qtd; 
        }
    });

    if(itensComprados.length === 0) return alert("Selecione pelo menos um produto consumido.");

    // Formata data de YYYY-MM-DD para DD/MM/YYYY para o Mock
    const [ano, mes, dia] = dataInput.split('-');
    const dataFormatada = `${dia}/${mes}/${ano}`;

    // Cria o registro da Venda
    mockVendas_Weekly.push({
        id: Date.now(),
        data: dataFormatada,
        colaborador: colaborador,
        itens: itensComprados,
        obs: obs,
        total_devido: totalVenda
    });

    fecharModal('modal-consumo');
    renderizarVendasSemanais(); // Atualiza a tela de Vendas
    
    // Como a aba estoque não está visível, ela será atualizada quando clicada, 
    // mas os dados em memória já tiveram o estoque reduzido.
    alert("Consumo registrado! O estoque foi reduzido e a venda salva.");
}

// Inicializações básicas (simplificadas para o Mock)
function renderizarFinanceiro() {
    const tbody = document.getElementById('tabela-financeiro');
    tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-gray-500">Use os dados mockados no código para testes.</td></tr>`;
}

function calcularDashboard() {
    document.getElementById('dash-recebido').innerText = 'R$ 0,00';
    document.getElementById('dash-pendente').innerText = 'R$ 18,00';
    document.getElementById('dash-itens').innerText = '4';
    
    // Calcula valor total em estoque
    let valorEstoque = mockEstoque.reduce((acc, p) => acc + (p.qtd * p.preco), 0);
    document.getElementById('dash-lucro').innerText = `R$ ${valorEstoque.toFixed(2).replace('.', ',')}`;
}

window.onload = () => {
    popularWeekSelector();
    calcularDashboard();
};
