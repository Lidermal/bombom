/* ==================================================
   1. CONFIGURAÇÃO SUPABASE (AGUARDANDO PASSO 3)
   ================================================== */
const SUPABASE_URL = 'SUA_URL_AQUI_NO_FUTURO';
const SUPABASE_KEY = 'SUA_CHAVE_AQUI_NO_FUTURO';
// const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ==================================================
   2. DADOS FAKE (MOCK) PARA TESTE NO GITHUB PAGES
   ================================================== */
let mockEstoque = [
    { id: 1, nome: 'Bombom Chocolate', qtd: 15, preco: 2.50 },
    { id: 2, nome: 'Cone Trufado', qtd: 8, preco: 12.00 },
    { id: 3, nome: 'Brownie', qtd: 5, preco: 6.00 }
];

let mockVendas = [
    { id: 1, data: '02/06/2026', colaborador: 'Janaelson', produto: 'Cone Trufado', qtd: 1, total: 12.00, status: 'PAGO - PIX' },
    { id: 2, data: '02/06/2026', colaborador: 'Douglas', produto: 'Bombom Chocolate', qtd: 2, total: 5.00, status: 'PENDENTE' },
];

/* ==================================================
   3. FUNÇÕES DE INTERFACE (UI)
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
        'vendas': 'Controle de Consumo',
        'estoque': 'Gerenciamento de Estoque',
        'financeiro': 'Acertos Financeiros'
    };
    document.getElementById('titulo-aba').innerText = titulos[abaId];

    // Carrega os dados dependendo da aba
    if(abaId === 'estoque') renderizarEstoque();
    if(abaId === 'vendas') renderizarVendas();
    if(abaId === 'financeiro') renderizarFinanceiro();
    if(abaId === 'dashboard') calcularDashboard();
}

function abrirModal(id) {
    document.getElementById(id).classList.remove('hidden');
}

function fecharModal(id) {
    document.getElementById(id).classList.add('hidden');
}

/* ==================================================
   4. FUNÇÕES DE DADOS (SIMULANDO O BANCO)
   ================================================== */

// ESTOQUE
function renderizarEstoque() {
    const grid = document.getElementById('grid-estoque');
    grid.innerHTML = '';
    
    // FUTURO: let { data: produtos } = await supabase.from('produtos').select('*');
    let produtos = mockEstoque;

    produtos.forEach(p => {
        grid.innerHTML += `
            <div class="bg-white p-4 rounded-lg shadow border border-gray-200 flex justify-between items-center">
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
    const nome = document.getElementById('input-prod-nome').value;
    const qtd = parseInt(document.getElementById('input-prod-qtd').value);
    const preco = parseFloat(document.getElementById('input-prod-preco').value);

    // FUTURO: await supabase.from('produtos').insert([{ nome, estoque_atual: qtd, preco_venda: preco }]);
    
    // Mock logic
    mockEstoque.push({ id: Date.now(), nome, qtd, preco });
    fecharModal('modal-estoque');
    renderizarEstoque();
    alert("Produto salvo no banco (simulação)!");
}

// VENDAS E FINANCEIRO
function renderizarVendas() {
    const tbody = document.getElementById('tabela-vendas');
    tbody.innerHTML = '';
    
    // FUTURO: select de 'vendas_consumo' com join
    mockVendas.forEach(v => {
        tbody.innerHTML += `
            <tr>
                <td class="p-4 text-gray-600">${v.data}</td>
                <td class="p-4 text-gray-800 font-medium">${v.colaborador}</td>
                <td class="p-4 text-gray-600">${v.produto}</td>
                <td class="p-4 text-gray-600">${v.qtd}</td>
                <td class="p-4 text-gray-800">R$ ${v.total.toFixed(2)}</td>
            </tr>
        `;
    });
}

function renderizarFinanceiro() {
    const tbody = document.getElementById('tabela-financeiro');
    tbody.innerHTML = '';
    
    // Simulação agrupando dívidas (No Supabase faremos por SQL View ou reduce)
    let devedores = [
        { nome: 'Douglas', devido: 5.00, status: 'PENDENTE' },
        { nome: 'Janaelson', devido: 12.00, status: 'PAGO - PIX' }
    ];

    devedores.forEach(d => {
        let badgeColor = d.status.includes('PAGO') ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';
        tbody.innerHTML += `
            <tr>
                <td class="p-4 text-gray-800 font-medium">${d.nome}</td>
                <td class="p-4 text-gray-800">R$ ${d.devido.toFixed(2)}</td>
                <td class="p-4"><span class="px-2 py-1 rounded text-xs font-bold ${badgeColor}">${d.status}</span></td>
                <td class="p-4">
                    ${d.status === 'PENDENTE' ? '<button class="text-blue-600 hover:underline" onclick="alert(\'Abrir modal de baixa de pagamento\')">Dar Baixa</button>' : '-'}
                </td>
            </tr>
        `;
    });
}

function calcularDashboard() {
    // FUTURO: Buscas agregadas (sum) no Supabase
    document.getElementById('dash-recebido').innerText = 'R$ 12,00';
    document.getElementById('dash-pendente').innerText = 'R$ 5,00';
    document.getElementById('dash-lucro').innerText = 'R$ 6,80'; // Simulação
    document.getElementById('dash-itens').innerText = '3';
}

// Inicializa o Dashboard na primeira carga
window.onload = () => {
    calcularDashboard();
};
