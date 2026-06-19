// Configuração do Supabase - SUBSTITUA PELAS SUAS CREDENCIAIS
const SUPABASE_URL = 'https://sua-url.supabase.co';
const SUPABASE_KEY = 'sua-chave-anon';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let itensVenda = [];
let chartInstance = null;

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
});

// Verificar autenticação
async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        currentUser = session.user;
        showDashboard();
    } else {
        document.getElementById('loginScreen').classList.remove('hidden');
        document.getElementById('dashboard').classList.add('hidden');
    }
}

// Login
async function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });
    
    if (error) {
        alert('Erro ao fazer login: ' + error.message);
    } else {
        currentUser = data.user;
        showDashboard();
    }
}

// Logout
async function logout() {
    await supabase.auth.signOut();
    currentUser = null;
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('dashboard').classList.add('hidden');
}

// Mostrar dashboard
function showDashboard() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    carregarProdutos();
    adicionarItem(); // Adiciona primeiro item automaticamente
}

// Mostrar seção
function showSection(sectionName) {
    // Esconde todas as seções
    document.querySelectorAll('.section').forEach(section => {
        section.classList.add('hidden');
    });
    
    // Mostra a seção selecionada
    const targetSection = document.getElementById(sectionName);
    if (targetSection) {
        targetSection.classList.remove('hidden');
        
        // Se for relatórios, carrega o gráfico
        if (sectionName === 'relatorios') {
            carregarRelatorios();
        }
        
        // Se for produtos, recarrega a lista
        if (sectionName === 'produtos') {
            carregarProdutos();
        }
    }
}

// Adicionar item à venda
function adicionarItem() {
    const div = document.createElement('div');
    div.className = 'flex gap-2 items-center item-venda';
    div.innerHTML = `
        <select class="produto-select flex-1 p-2 border rounded" onchange="calcularTotal()">
            <option value="">Selecione um produto</option>
        </select>
        <input type="number" class="quantidade-input w-20 p-2 border rounded" value="1" min="1" onchange="calcularTotal()">
        <button onclick="this.parentElement.remove(); calcularTotal()" class="bg-red-500 text-white px-2 py-1 rounded">×</button>
    `;
    document.getElementById('itensVenda').appendChild(div);
    carregarSelectProdutos(div.querySelector('.produto-select'));
}

// Carregar select de produtos
async function carregarSelectProdutos(selectElement) {
    const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .order('nome');
    
    if (data) {
        data.forEach(produto => {
            const option = document.createElement('option');
            option.value = produto.id;
            option.textContent = `${produto.nome} - R$ ${parseFloat(produto.preco_venda).toFixed(2)}`;
            option.dataset.preco = produto.preco_venda;
            selectElement.appendChild(option);
        });
        
        selectElement.addEventListener('change', () => calcularTotal());
    }
}

// Calcular total
function calcularTotal() {
    let total = 0;
    document.querySelectorAll('.item-venda').forEach(item => {
        const select = item.querySelector('.produto-select');
        const quantidade = parseInt(item.querySelector('.quantidade-input').value) || 0;
        const option = select.options[select.selectedIndex];
        const preco = parseFloat(option.dataset.preco) || 0;
        total += preco * quantidade;
    });
    document.getElementById('totalVenda').textContent = total.toFixed(2);
}

// Registrar venda
async function registrarVenda() {
    const clienteNome = document.getElementById('clienteNome').value;
    const formaPagamento = document.getElementById('formaPagamento').value;
    
    if (!clienteNome) {
        alert('Digite o nome do cliente');
        return;
    }
    
    const itens = [];
    let total = 0;
    
    document.querySelectorAll('.item-venda').forEach(item => {
        const select = item.querySelector('.produto-select');
        const quantidade = parseInt(item.querySelector('.quantidade-input').value) || 0;
        const option = select.options[select.selectedIndex];
        
        if (select.value) {
            const preco = parseFloat(option.dataset.preco) || 0;
            itens.push({
                produto_id: select.value,
                quantidade: quantidade,
                preco_unitario: preco,
                subtotal: preco * quantidade
            });
            total += preco * quantidade;
        }
    });
    
    if (itens.length === 0) {
        alert('Adicione pelo menos um item');
        return;
    }
    
    // Inserir venda
    const { data: venda, error: vendaError } = await supabase
        .from('vendas')
        .insert([{
            cliente_nome: clienteNome,
            forma_pagamento: formaPagamento,
            total: total,
            usuario_id: currentUser.id
        }])
        .select()
        .single();
    
    if (vendaError) {
        alert('Erro ao registrar venda: ' + vendaError.message);
        return;
    }
    
    // Inserir itens da venda
    const itensComVenda = itens.map(item => ({
        ...item,
        venda_id: venda.id
    }));
    
    const { error: itensError } = await supabase
        .from('itens_venda')
        .insert(itensComVenda);
    
    if (itensError) {
        alert('Erro ao registrar itens: ' + itensError.message);
        return;
    }
    
    // Atualizar estoque
    for (const item of itens) {
        await supabase.rpc('atualizar_estoque', {
            p_produto_id: item.produto_id,
            p_quantidade: item.quantidade
        });
    }
    
    alert('Venda registrada com sucesso!');
    
    // Limpar formulário
    document.getElementById('clienteNome').value = '';
    document.getElementById('itensVenda').innerHTML = '';
    document.getElementById('totalVenda').textContent = '0.00';
    adicionarItem();
}

// Carregar produtos
async function carregarProdutos() {
    const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .order('nome');
    
    if (error) {
        console.error('Erro ao carregar produtos:', error);
        return;
    }
    
    const container = document.getElementById('listaProdutos');
    container.innerHTML = '';
    
    data.forEach(produto => {
        const div = document.createElement('div');
        div.className = 'bg-white p-4 rounded-lg shadow';
        div.innerHTML = `
            <h3 class="font-bold">${produto.nome}</h3>
            <p>Preço: R$ ${parseFloat(produto.preco_venda).toFixed(2)}</p>
            <p>Estoque: ${produto.estoque_atual}</p>
        `;
        container.appendChild(div);
    });
}

// Mostrar formulário de produto
function showFormProduto() {
    const nome = prompt('Nome do produto:');
    if (!nome) return;
    
    const precoCusto = prompt('Preço de custo:');
    const precoVenda = prompt('Preço de venda:');
    const estoqueMinimo = prompt('Estoque mínimo:');
    
    cadastrarProduto(nome, parseFloat(precoCusto), parseFloat(precoVenda), parseInt(estoqueMinimo));
}

// Cadastrar produto
async function cadastrarProduto(nome, precoCusto, precoVenda, estoqueMinimo) {
    const { error } = await supabase
        .from('produtos')
        .insert([{
            nome: nome,
            preco_custo: precoCusto,
            preco_venda: precoVenda,
            estoque_minimo: estoqueMinimo,
            estoque_atual: 0
        }]);
    
    if (error) {
        alert('Erro ao cadastrar produto: ' + error.message);
    } else {
        alert('Produto cadastrado com sucesso!');
        carregarProdutos();
    }
}

// Carregar relatórios
async function carregarRelatorios() {
    const { data, error } = await supabase
        .from('vendas')
        .select('data_venda, total')
        .order('data_venda', { ascending: true });
    
    if (error) {
        console.error('Erro ao carregar relatórios:', error);
        return;
    }
    
    // Agrupar vendas por data
    const vendasPorData = {};
    data.forEach(venda => {
        const data = new Date(venda.data_venda).toLocaleDateString('pt-BR');
        if (!vendasPorData[data]) {
            vendasPorData[data] = 0;
        }
        vendasPorData[data] += parseFloat(venda.total);
    });
    
    // Criar gráfico
    const ctx = document.getElementById('graficoVendas').getContext('2d');
    
    if (chartInstance) {
        chartInstance.destroy();
    }
    
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Object.keys(vendasPorData),
            datasets: [{
                label: 'Vendas (R$)',
                data: Object.values(vendasPorData),
                borderColor: 'rgb(147, 51, 234)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}
