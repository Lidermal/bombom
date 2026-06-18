/* ==================================================
   1. CONFIGURAÇÃO SUPABASE (AGUARDANDO PASSO 3)
   ================================================== */
const SUPABASE_URL = 'SUA_URL_AQUI_NO_FUTURO';
const SUPABASE_KEY = 'SUA_CHAVE_AQUI_NO_FUTURO';
// const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ==================================================
   2. VARIÁVEIS GLOBAIS DE ESTADO
   ================================================== */
let dataGeracao = new Date(); // Para simular o 'Gerado' da imagem
let semanaSelecionada = null; // Guardará o range da semana { start: Date, end: Date }

/* ==================================================
   3. DADOS FAKE (MOCK) ATUALIZADOS PARA O NOVO VISUAL
   ================================================== */
let mockEstoque = [
    { id: 1, nome: 'Bombom Chocolate', qtd: 15, preco: 2.50 },
    { id: 2, nome: 'Cone Trufado', qtd: 8, preco: 12.00 },
    { id: 3, nome: 'Brownie', qtd: 5, preco: 6.00 }
];

// Mock de vendas reformulado para estrutura semanal agrupada por dia
// Data no formato DD/MM/YYYY para simulação
let mockVendas_Weekly = [
    // Segunda-feira (01/06)
    { id: 1, data: '01/06/2026', colaborador: 'Adriel', products: { Chocolate: 2, Ninho: 1, Coco: 0, Cone: 1, Brownie: 0 }, obs: '', note: 10, total_devido: 20.00 },
    // Terça-feira (02/06)
    { id: 2, data: '02/06/2026', colaborador: 'Gilvan', products: { Chocolate: 1, Ninho: 0, Coco: 0, Cone: 0, Brownie: 0 }, obs: '', note: 7, total_devido: 2.50 },
    { id: 3, data: '02/06/2026', colaborador: 'Jonatas', products: { Chocolate: 0, Ninho: 0, Coco: 2, Cone: 0, Brownie: 1 }, obs: '', note: 9, total_devido: 11.00 },
    { id: 4, data: '02/06/2026', colaborador: 'David', products: { Chocolate: 0, Ninho: 0, Coco: 0, Cone: 1, Brownie: 0 }, obs: 'Pagou uma parte', note: 9, total_devido: 12.00 },
    { id: 5, data: '02/06/2026', colaborador: 'Janaelson', products: { Chocolate: 4, Ninho: 2, Coco: 0, Cone: 0, Brownie: 0 }, obs: 'Debitou o restante', note: 7, total_devido: 15.00 },
    { id: 6, data: '02/06/2026', colaborador: 'Rodrigo', products: { Chocolate: 0, Ninho: 0, Coco: 0, Cone: 0, Brownie: 2 }, obs: 'Pagou o total', note: 7, total_devido: 12.00 },
    // Quarta-feira (03/06)
    { id: 7, data: '03/06/2026', colaborador: 'Janaelson', products: { Chocolate: 1, Ninho: 1, Coco: 1, Cone: 1, Brownie: 1 }, obs: '', note: 9, total_devido: 29.50 },
];

/* ==================================================
   4. FUNÇÕES DE INTERFACE (UI) & LÓGICA DE SEMANA
   ================================================== */
function mudarAba(abaId) {
    // Esconde todas as seções
    document.getElementById('aba-dashboard').classList.add('hidden');
    document.getElementById('aba-vendas').classList.add('hidden');
    document.getElementById('aba-estoque').classList.add('hidden');
    document.getElementById('aba-financeiro').classList.add('hidden');
    
    // Mostra a selecionada
    document.getElementById(`aba-${abaId}`).classList.remove('hidden');

    // Atualiza Titulo
    const titulos = {
        'dashboard': 'Visão Geral',
        'vendas': 'Controle de Consumo Semanal',
        'estoque': 'Gerenciamento de Estoque',
        'financeiro': 'Acertos Financeiros'
    };
    document.getElementById('titulo-aba').innerText = titulos[abaId];

    // Carrega os dados dependendo da aba, garantindo que o filtro esteja definido
    if(!semanaSelecionada) calcularSemanaAtual();

    if(abaId === 'estoque') renderizarEstoque();
    if(abaId === 'vendas') renderizarVendasSemanais();
    if(abaId === 'financeiro') renderizarFinanceiro();
    if(abaId === 'dashboard') calcularDashboard();
}

function abrirModal(id) {
    document.getElementById(id).classList.remove('hidden');
}

function fecharModal(id) {
    document.getElementById(id).classList.add('hidden');
}

// LÓGICA DE SEMANA DE REFERÊNCIA
function formatarData(date) {
    return date.toLocaleDateString('pt-BR');
}

function getStartAndEndOfWeek(date) {
    let day = date.getDay(); // 0-Dom, 1-Seg, ...
    let diff = date.getDate() - day + (day === 0 ? -6 : 1); // Ajuste para segunda-feira
    let startOfWeek = new Date(date.setDate(diff));
    
    // Copiar a data de início para calcular o fim (sexta-feira, +4 dias)
    let endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 4);
    
    return { start: startOfWeek, end: endOfWeek };
}

function calcularSemanaAtual() {
    let hoje = new Date();
    semanaSelecionada = getStartAndEndOfWeek(new Date(hoje)); // Clonar date para não alterar hoje
}

function popularWeekSelector() {
    const selector = document.getElementById('semana-filtro');
    selector.innerHTML = '';

    let hoje = new Date();
    let { start: semanaAtualStart } = getStartAndEndOfWeek(new Date(hoje));

    // Adicionar as últimas 4 semanas e a atual
    for (let i = 0; i < 5; i++) {
        let diff = semanaAtualStart.getDate() - (i * 7);
        let start = new Date(semanaAtualStart);
        start.setDate(diff);

        let end = new Date(start);
        end.setDate(start.getDate() + 4);

        let rangeText = `${formatarData(start)} a ${formatarData(end)}`;
        let option = document.createElement('option');
        option.value = rangeText;
        option.innerText = i === 0 ? `${rangeText} (Atual)` : rangeText;
        selector.appendChild(option);
    }
}

function alterarSemanaFiltro() {
    const selector = document.getElementById('semana-filtro');
    const rangeText = selector.value;
    
    // Parsear o range para objetos Date
    const parts = rangeText.replace(' (Atual)', '').split(' a ');
    const [dayStart, monthStart, yearStart] = parts[0].split('/');
    const [dayEnd, monthEnd, yearEnd] = parts[1].split('/');

    semanaSelecionada = {
        start: new Date(yearStart, monthStart - 1, dayStart),
        end: new Date(yearEnd, monthEnd - 1, dayEnd)
    };

    // Recarregar a aba atual com os dados da nova semana
    const abaAtualId = document.querySelector('header h2').id === 'titulo-aba' ? 'vendas' : 'dashboard'; // Simplificação
    mudarAba('vendas'); // Recarrega sempre para a aba de vendas
}

/* ==================================================
   5. FUNÇÕES DE DADOS (SIMULANDO O BANCO)
   ================================================== */

// ESTOQUE (Inalterado)
function renderizarEstoque() {
    const grid = document.getElementById('grid-estoque');
    grid.innerHTML = '';
    
    let produtos = mockEstoque;

    produtos.forEach(p => {
        grid.innerHTML += `
            <div class="bg-white p-4 rounded-lg shadow border border-gray-200 flex justify-between items-center hover:shadow-md transition">
                <div>
                    <h4 class="font-bold text-gray-800">${p.nome}</h4>
                    <p class="text-sm text-gray-500">R$ ${p.preco.toFixed(2)}</p>
                </div>
                <div class="text-center">
                    <span class="block text-2xl font-bold text-blue-600">${p.qtd}</span>
                    <span class="text-xs text-gray-400">unidades</span>
                </div>
            </div>
        `;
    });
}

function salvarEstoque() {
    // ... (Inalterado) ...
}

// VENDAS SEMANAIS (O GRANDE NOVO MOTOR VISUAL)
function formatarPreco(valor) {
    return valor.toFixed(2).replace('.', ',');
}

function renderizarVendasSemanais() {
    if (!semanaSelecionada) calcularSemanaAtual();
    const container = document.getElementById('container-vendas-semanais');
    container.innerHTML = '';

    // Atualizar Info Header (Semana e Gerado)
    document.getElementById('vendas-semana-info').innerText = `Semana: ${formatarData(semanaSelecionada.start)} a ${formatarData(semanaSelecionada.end)}`;
    document.getElementById('vendas-gerado-info').innerText = `Gerado: ${dataGeracao.toLocaleDateString('pt-BR')}, ${dataGeracao.toLocaleTimeString('pt-BR')}`;

    // Filtrar as vendas para a semana selecionada
    // Mock data está em formato DD/MM/YYYY
    const vendasSemana = mockVendas_Weekly.filter(v => {
        const [day, month, year] = v.data.split('/');
        const dataVenda = new Date(year, month - 1, day);
        return dataVenda >= semanaSelecionada.start && dataVenda <= semanaSelecionada.end;
    });

    // Agrupar as vendas por dia da semana (Segunda a Sexta)
    const agrupamentoDias = {
        'Domingo': [],
        'Segunda-feira': [],
        'Terça-feira': [],
        'Quarta-feira': [],
        'Quinta-feira': [],
        'Sexta-feira': [],
        'Sábado': []
    };

    vendasSemana.forEach(v => {
        AgruparVendaPorDia(v, agrupamentoDias);
    });

    // Mapeamento de cor da nota (igual a imagem)
    const mapCorNota = (nota) => {
        if (nota >= 8) return 'bg-green-100 text-green-900';
        if (nota >= 6) return 'bg-yellow-100 text-yellow-900';
        return 'bg-red-100 text-red-900';
    };

    const daysOfWeek = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'];
    let countRow = 0; // Para alternar cor de linha

    daysOfWeek.forEach(day => {
        const vendasDoDia = agrupamentoDias[day];
        if (vendasDoDia.length === 0) return; // Pula dia sem venda

        let htmlDia = `
            <div class="grid grid-cols-[1fr,50px] items-start mb-10 border border-gray-200 rounded-lg overflow-hidden bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
                <!-- Parte da Tabela -->
                <div class="p-4">
                    <table class="w-full text-left border-collapse border border-gray-200">
                        <thead class="bg-blue-600 text-white text-xs">
                            <tr>
                                <th class="p-3 border">Colaborador</th>
                                <th class="p-3 border">Chocolate</th>
                                <th class="p-3 border">Ninho</th>
                                <th class="p-3 border">Coco</th>
                                <th class="p-3 border">Cone</th>
                                <th class="p-3 border">Brownie</th>
                                <th class="p-3 border">Observações</th>
                                <th class="p-3 border">Ações</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200">
        `;

        vendasDoDia.forEach(v => {
            const corNota = mapCorNota(v.note);
            countRow++;
            const rowClass = countRow % 2 === 0 ? 'bg-gray-50' : 'bg-white';

            // Simulação de 'Sim' ou Quantidade para preencher a planilha
            const formatQtd = (qtd) => qtd > 0 ? `<span class="text-xs font-bold text-gray-800">${qtd} un</span>` : '<span class="text-xs text-gray-400">-</span>';

            htmlDia += `
                <tr class="hover:bg-blue-50 ${rowClass}">
                    <td class="p-3 border text-sm font-medium text-gray-800">${v.colaborador}</td>
                    <td class="p-3 border text-center text-xs text-green-600 font-medium">${v.products.Chocolate > 0 ? 'Sim' : '-'}</td>
                    <td class="p-3 border text-center text-xs text-green-600 font-medium">${v.products.Ninho > 0 ? 'Sim' : '-'}</td>
                    <td class="p-3 border text-center text-xs text-green-600 font-medium">${v.products.Coco > 0 ? 'Sim' : '-'}</td>
                    <td class="p-3 border text-center text-xs text-green-600 font-medium">${v.products.Cone > 0 ? 'Sim' : '-'}</td>
                    <td class="p-3 border text-center text-xs text-green-600 font-medium">${v.products.Brownie > 0 ? 'Sim' : '-'}</td>
                    <td class="p-3 border text-sm text-gray-700">${v.obs || '-'}</td>
                    <td class="p-3 border text-center">
                        <button class="bg-blue-100 p-2 rounded text-blue-700 hover:bg-blue-200 transition" onclick="abrirModalEditVenda(${v.id})">
                            <i class="fa-solid fa-pen text-xs"></i>
                        </button>
                    </td>
                </tr>
            `;
        });

        htmlDia += `
                        </tbody>
                    </table>
                </div>
                
                <!-- Parte da Legenda Vertical Vertical-lr -->
                <div class="w-[50px] bg-gray-100 border-l flex items-center justify-center h-full">
                    <span class="text-xs font-bold text-gray-600 uppercase tracking-widest vertical-text transform -rotate-180">${day}</span>
                </div>
            </div>
        `;
        container.innerHTML += htmlDia;
    });
}

function AgruparVendaPorDia(v, agrupamento) {
    const [day, month, year] = v.data.split('/');
    const dataVenda = new Date(year, month - 1, day);
    const dayName = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'][dataVenda.getDay()];
    agrupamento[dayName].push(v);
}

// MODAIS DE VENDA (ADD & EDIT)
function abrirModalAddVenda() {
    document.getElementById('titulo-modal-consumo').innerText = "Registrar Novo Consumo";
    // Resetar formulário
    document.getElementById('input-consumo-data').value = new Date().toISOString().split('T')[0];
    document.getElementById('input-consumo-obs').value = '';
    // Resetar quantidades
    document.getElementById('input-qtd-chocolate').value = 0;
    document.getElementById('input-qtd-ninho').value = 0;
    document.getElementById('input-qtd-coco').value = 0;
    document.getElementById('input-qtd-cone').value = 0;
    document.getElementById('input-qtd-brownie').value = 0;
    document.getElementById('total-consumo-modal').innerText = "R$ 0,00";
    
    abrirModal('modal-consumo');
}

function abrirModalEditVenda(vendaId) {
    document.getElementById('titulo-modal-consumo').innerText = `Editar Consumo (ID: ${vendaId})`;
    
    const venda = mockVendas_Weekly.find(v => v.id === vendaId);
    if(!venda) return;

    // Preencher formulário
    document.getElementById('input-consumo-colaborador').value = venda.colaborador;
    
    // Data (converter DD/MM/YYYY para YYYY-MM-DD)
    const [day, month, year] = venda.data.split('/');
    document.getElementById('input-consumo-data').value = `${year}-${month}-${day}`;
    
    document.getElementById('input-consumo-obs').value = venda.obs;
    
    // Preencher quantidades
    document.getElementById('input-qtd-chocolate').value = venda.products.Chocolate;
    document.getElementById('input-qtd-ninho').value = venda.products.Ninho;
    document.getElementById('input-qtd-coco').value = venda.products.Coco;
    document.getElementById('input-qtd-cone').value = venda.products.Cone;
    document.getElementById('input-qtd-brownie').value = venda.products.Brownie;
    
    // Calcular Total
    let total = calcularTotalVenda(venda.products);
    document.getElementById('total-consumo-modal').innerText = `R$ ${total.toFixed(2).replace('.', ',')}`;

    abrirModal('modal-consumo');
}

function calcularTotalVenda(products) {
    let total = 0;
    // Map de preços fixos para simulação (no DB puxaremos das tabelas)
    const precos = { Chocolate: 2.50, Ninho: 2.50, Coco: 2.50, Cone: 12.00, Brownie: 6.00 };
    total += products.Chocolate * precos.Chocolate;
    total += products.Ninho * precos.Ninho;
    total += products.Coco * precos.Coco;
    total += products.Cone * precos.Cone;
    total += products.Brownie * precos.Brownie;
    return total;
}

function salvarConsumo() {
    // FUTURO: await supabase.from('vendas').insert([...]);
    alert("Venda salva no banco (simulação)!");
    fecharModal('modal-consumo');
    // MOCK update local para ver no visual
    // ...
    renderizarVendasSemanais();
}

// FINANCEIRO (Inalterado)
function renderizarFinanceiro() {
    const tbody = document.getElementById('tabela-financeiro');
    tbody.innerHTML = '';
    
    let devedores = [
        { nome: 'Douglas', devido: 5.00, status: 'PENDENTE' },
        { nome: 'Janaelson', devido: 44.50, status: 'PAGO - PIX' },
        { nome: 'Adriel', devido: 20.00, status: 'PENDENTE' },
        { nome: 'David', devido: 12.00, status: 'PARCIAL' },
    ];

    devedores.forEach(d => {
        let badgeColor = 'bg-yellow-100 text-yellow-800';
        if (d.status === 'PAGO - PIX') badgeColor = 'bg-green-100 text-green-800';
        if (d.status === 'PARCIAL') badgeColor = 'bg-blue-100 text-blue-800';

        tbody.innerHTML += `
            <tr>
                <td class="p-4 text-gray-800 font-medium">${d.nome}</td>
                <td class="p-4 text-gray-800">R$ ${d.devido.toFixed(2)}</td>
                <td class="p-4"><span class="px-2 py-1 rounded text-xs font-bold ${badgeColor}">${d.status}</span></td>
                <td class="p-4">
                    ${d.status !== 'PAGO - PIX' ? '<button class="text-blue-600 hover:underline text-sm" onclick="alert(\'Abrir modal de baixa de pagamento\')">Dar Baixa</button>' : '-'}
                </td>
            </tr>
        `;
    });
}

// DASHBOARD (Inalterado)
function calcularDashboard() {
    document.getElementById('dash-recebido').innerText = 'R$ 44,50';
    document.getElementById('dash-pendente').innerText = 'R$ 37,00';
    document.getElementById('dash-lucro').innerText = 'R$ 28,80'; // Simulação
    document.getElementById('dash-itens').innerText = '14';
}

// Inicializa na primeira carga
window.onload = () => {
    popularWeekSelector();
    calcularDashboard();
};
