/* ==================================================
   1. CONFIGURAÇÃO SUPABASE
   ================================================== */
const SUPABASE_URL = 'https://jyjrzczpuyomatskebfk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5anJ6Y3pwdXlvbWF0c2tlYmZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4MDExMDcsImV4cCI6MjA5NzM3NzEwN30.texrp9Ayt6rzmQyCYDS1UgJiKm6yUm4-PFq4lIj47hE';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ==================================================
   2. VARIÁVEIS GLOBAIS E ESTADO
   ================================================== */
let semanaSelecionada = null; 
let estoqueGlobal = [];
let vendasGlobal = [];
let vendaEmEdicaoId = null;

function toggleLoading(show) {
    document.getElementById('loading').classList.toggle('hidden', !show);
}

// ALERTA DE SUCESSO (Canto superior direito, some sozinho)
function avisoSucesso(mensagem) {
    Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: mensagem,
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true
    });
}

// ALERTA DE ERRO (Central, exige clique)
function avisoErro(titulo, mensagem) {
    Swal.fire({
        icon: 'error',
        title: titulo,
        text: mensagem,
        confirmButtonColor: '#3b82f6'
    });
}

/* ==================================================
   3. INICIALIZAÇÃO DE DADOS (SUPABASE FETCH)
   ================================================== */
async function carregarDadosDoBanco() {
    try {
        toggleLoading(true);
        
        // Busca Estoque
        const { data: produtos, error: errProd } = await supabase.from('produtos').select('*').order('nome');
        if (errProd) throw errProd;
        estoqueGlobal = produtos || [];

        // Busca Vendas
        const { data: vendas, error: errVenda } = await supabase
            .from('vendas')
            .select(`
                id, colaborador, data_venda, observacao, total_devido, criado_em,
                itens_venda ( id, qtd, preco_unitario, produto_id, produtos ( nome ) )
            `)
            .order('data_venda', { ascending: false });
            
        if (errVenda) throw errVenda;
        vendasGlobal = vendas || [];

        popularWeekSelector();
        // Recarrega a aba atual para preencher com os dados do banco
        const abaAberta = document.querySelector('section:not(.hidden)').id.replace('aba-', '');
        mudarAba(abaAberta);

    } catch (error) {
        avisoErro('Falha na Conexão', 'Não foi possível carregar os dados do banco. Atualize a página.');
        console.error(error);
    } finally {
        toggleLoading(false);
    }
}

/* ==================================================
   4. NAVEGAÇÃO E LÓGICA DE SEMANA
   ================================================== */
function mudarAba(abaId) {
    try {
        document.getElementById('aba-dashboard').classList.add('hidden');
        document.getElementById('aba-vendas').classList.add('hidden');
        document.getElementById('aba-estoque').classList.add('hidden');
        document.getElementById('aba-financeiro').classList.add('hidden');
        
        document.getElementById(`aba-${abaId}`).classList.remove('hidden');

        const titulos = {
            'dashboard': 'Visão Geral',
            'vendas': 'Controle Semanal',
            'estoque': 'Gerenciamento de Estoque',
            'financeiro': 'Acertos Financeiros'
        };
        document.getElementById('titulo-aba').innerText = titulos[abaId];

        if(!semanaSelecionada) calcularSemanaAtual();

        if(abaId === 'estoque') renderizarEstoque();
        if(abaId === 'vendas') renderizarVendasSemanais();
        if(abaId === 'financeiro') renderizarFinanceiro();
        if(abaId === 'dashboard') calcularDashboard();
    } catch (e) {
        console.error('Erro ao mudar aba:', e);
    }
}

function abrirModal(id) { document.getElementById(id).classList.remove('hidden'); }
function fecharModal(id) { document.getElementById(id).classList.add('hidden'); }

function getStartAndEndOfWeek(date) {
    let day = date.getDay();
    let diff = date.getDate() - day + (day === 0 ? -6 : 1);
    let start = new Date(date.setHours(0,0,0,0));
    start.setDate(diff);
    
    let end = new Date(start);
    end.setDate(start.getDate() + 4);
    end.setHours(23,59,59,999);
    return { start, end };
}

function calcularSemanaAtual() {
    semanaSelecionada = getStartAndEndOfWeek(new Date());
}

function popularWeekSelector() {
    const selector = document.getElementById('semana-filtro');
    selector.innerHTML = '';
    
    let semanasSet = new Set();
    let { start: atualStart } = getStartAndEndOfWeek(new Date());
    semanasSet.add(atualStart.getTime());

    vendasGlobal.forEach(v => {
        if(!v.data_venda) return;
        let [a, m, d] = v.data_venda.split('-');
        let dataVenda = new Date(a, m - 1, d);
        let { start } = getStartAndEndOfWeek(dataVenda);
        semanasSet.add(start.getTime());
    });

    let semanasArray = Array.from(semanasSet).sort((a,b) => b - a);
    
    semanasArray.forEach(time => {
        let start = new Date(time);
        let end = new Date(start);
        end.setDate(start.getDate() + 4);
        
        let rangeText = `${start.toLocaleDateString('pt-BR')} a ${end.toLocaleDateString('pt-BR')}`;
        let option = document.createElement('option');
        option.value = time; 
        option.innerText = time === atualStart.getTime() ? `${rangeText} (Atual)` : rangeText;
        selector.appendChild(option);
    });

    if(!semanaSelecionada) alterarSemanaFiltro();
}

function alterarSemanaFiltro() {
    const selector = document.getElementById('semana-filtro');
    if(!selector.value) return;
    
    const startTimestamp = parseInt(selector.value);
    let start = new Date(startTimestamp);
    let end = new Date(start);
    end.setDate(start.getDate() + 4);
    end.setHours(23,59,59,999);

    semanaSelecionada = { start, end };
    mudarAba('vendas');
}

/* ==================================================
   5. ESTOQUE: Lendo e Salvando no Supabase
   ================================================== */
function renderizarEstoque() {
    const grid = document.getElementById('grid-estoque');
    grid.innerHTML = '';
    
    estoqueGlobal.forEach(p => {
        let corEstoque = p.qtd <= 3 ? 'text-red-500' : 'text-blue-600';
        grid.innerHTML += `
            <div class="bg-white p-4 rounded-lg shadow border border-gray-200 relative group">
                <button onclick="excluirProduto(${p.id})" class="absolute top-2 right-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition" title="Excluir">
                    <i class="fa-solid fa-trash text-sm"></i>
                </button>
                <h4 class="font-bold text-gray-800 text-sm truncate pr-6" title="${p.nome}">${p.nome}</h4>
                <p class="text-xs text-gray-500 mb-2">R$ ${Number(p.preco).toFixed(2).replace('.',',')}</p>
                <div class="flex items-end justify-between border-t pt-2">
                    <span class="text-xs text-gray-400 uppercase">Em estoque</span>
                    <span class="block text-xl font-bold ${corEstoque}">${p.qtd} <span class="text-xs font-normal text-gray-500">un</span></span>
                </div>
            </div>
        `;
    });
}

async function salvarEstoque() {
    const nome = document.getElementById('input-prod-nome').value.trim();
    const novaQtd = parseInt(document.getElementById('input-prod-qtd').value);
    const preco = parseFloat(document.getElementById('input-prod-preco').value);

    if(!nome || isNaN(novaQtd) || isNaN(preco)) {
        return avisoErro('Atenção', 'Preencha todos os campos do produto corretamente.');
    }

    try {
        toggleLoading(true);
        const existente = estoqueGlobal.find(p => p.nome.toLowerCase() === nome.toLowerCase());

        if (existente) {
            const qtdFinal = existente.qtd + novaQtd;
            await supabase.from('produtos').update({ qtd: qtdFinal, preco: preco }).eq('id', existente.id);
        } else {
            await supabase.from('produtos').insert([{ nome, qtd: novaQtd, preco }]);
        }

        fecharModal('modal-estoque');
        document.getElementById('input-prod-nome').value = '';
        document.getElementById('input-prod-qtd').value = '0';
        document.getElementById('input-prod-preco').value = '';
        
        await carregarDadosDoBanco();
        avisoSucesso('Estoque atualizado!');

    } catch (e) {
        avisoErro('Erro', 'Não foi possível salvar no banco.');
    } finally {
        toggleLoading(false);
    }
}

async function excluirProduto(id) {
    Swal.fire({
        title: 'Excluir Produto?',
        text: "Essa ação não pode ser desfeita e removerá o produto do estoque.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Sim, excluir!',
        cancelButtonText: 'Cancelar'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                toggleLoading(true);
                await supabase.from('produtos').delete().eq('id', id);
                await carregarDadosDoBanco();
                avisoSucesso('Produto excluído.');
            } catch (e) {
                avisoErro('Erro', 'O produto está vinculado a uma venda e não pode ser apagado.');
                toggleLoading(false);
            }
        }
    });
}

/* ==================================================
   6. VENDAS: Visualizando e Editando
   ================================================== */
function renderizarVendasSemanais() {
    if (!semanaSelecionada) calcularSemanaAtual();
    const container = document.getElementById('container-vendas-semanais');
    container.innerHTML = '';

    document.getElementById('vendas-semana-info').innerText = `Semana: ${semanaSelecionada.start.toLocaleDateString('pt-BR')} a ${semanaSelecionada.end.toLocaleDateString('pt-BR')}`;
    document.getElementById('vendas-gerado-info').innerText = `Atualizado: ${new Date().toLocaleString('pt-BR')}`;

    const vendasSemana = vendasGlobal.filter(v => {
        if(!v.data_venda) return false;
        const [a, m, d] = v.data_venda.split('-');
        const dataVenda = new Date(a, m - 1, d);
        return dataVenda >= semanaSelecionada.start && dataVenda <= semanaSelecionada.end;
    });

    const agrupamentoDias = { 'Segunda-feira': [], 'Terça-feira': [], 'Quarta-feira': [], 'Quinta-feira': [], 'Sexta-feira': [] };

    vendasSemana.forEach(v => {
        const [a, m, d] = v.data_venda.split('-');
        const diaNum = new Date(a, m - 1, d).getDay();
        const dayName = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'][diaNum];
        if(agrupamentoDias[dayName]) agrupamentoDias[dayName].push(v);
    });

    let temVenda = false;

    Object.keys(agrupamentoDias).forEach(day => {
        const vendasDoDia = agrupamentoDias[day];
        if (vendasDoDia.length === 0) return;
        
        temVenda = true;
        let htmlDia = `
            <div class="grid grid-cols-[1fr,40px] items-start mb-6 border border-gray-200 rounded-lg overflow-hidden bg-white shadow">
                <div class="p-0 overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead class="bg-gray-100 text-gray-700 text-xs uppercase border-b">
                            <tr>
                                <th class="p-3 w-1/4">Colaborador</th>
                                <th class="p-3 w-1/2">Itens Consumidos</th>
                                <th class="p-3">Total</th>
                                <th class="p-3">Obs</th>
                                <th class="p-3 text-center">Editar</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100">
        `;

        vendasDoDia.forEach(v => {
            let badgesItens = v.itens_venda.map(iv => {
                const nomeProduto = iv.produtos ? iv.produtos.nome : 'Excluído';
                return `<span class="inline-block bg-blue-50 border border-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-1 mb-1 font-medium">${iv.qtd}x ${nomeProduto}</span>`;
            }).join('');

            htmlDia += `
                <tr class="hover:bg-gray-50 transition">
                    <td class="p-3 text-sm font-semibold text-gray-800">${v.colaborador}</td>
                    <td class="p-3">${badgesItens}</td>
                    <td class="p-3 text-sm font-bold text-gray-700">R$ ${Number(v.total_devido).toFixed(2).replace('.',',')}</td>
                    <td class="p-3 text-xs text-gray-500">${v.observacao || '-'}</td>
                    <td class="p-3 text-center">
                        <button class="bg-blue-100 p-2 rounded text-blue-700 hover:bg-blue-200 transition" onclick="abrirModalAddVenda(${v.id})">
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
                <div class="bg-blue-600 border-l border-blue-700 flex items-center justify-center h-full">
                    <span class="text-xs font-bold text-white uppercase tracking-widest vertical-text transform -rotate-180">${day}</span>
                </div>
            </div>
        `;
        container.innerHTML += htmlDia;
    });

    if (!temVenda) {
        container.innerHTML = `<div class="text-center py-10 text-gray-500 bg-white rounded shadow border border-dashed"><i class="fa-solid fa-folder-open text-3xl mb-2 block"></i>Nenhuma venda registrada nesta semana.</div>`;
    }
}

/* ==================================================
   7. LÓGICA DE REGISTRO E EDIÇÃO
   ================================================== */
function abrirModalAddVenda(idVendaEdit = null) {
    vendaEmEdicaoId = idVendaEdit;
    const containerInputs = document.getElementById('container-produtos-consumo');
    containerInputs.innerHTML = '';

    if (vendaEmEdicaoId) {
        document.getElementById('titulo-modal-consumo').innerText = "Editar Consumo";
        const venda = vendasGlobal.find(v => v.id === vendaEmEdicaoId);
        
        document.getElementById('input-consumo-colaborador').value = venda.colaborador;
        document.getElementById('input-consumo-data').value = venda.data_venda;
        document.getElementById('input-consumo-obs').value = venda.observacao || '';

        estoqueGlobal.forEach(p => {
            let itemJaComprado = venda.itens_venda.find(iv => iv.produto_id === p.id);
            let qtdCompradaAntes = itemJaComprado ? itemJaComprado.qtd : 0;
            let limiteDisponivel = p.qtd + qtdCompradaAntes;

            containerInputs.innerHTML += `
                <div class="flex justify-between items-center bg-white p-2 border rounded shadow-sm">
                    <div class="flex flex-col">
                        <span class="text-xs font-bold text-gray-700 truncate w-32" title="${p.nome}">${p.nome}</span>
                        <span class="text-[10px] text-gray-500">R$ ${Number(p.preco).toFixed(2).replace('.',',')} | Disp: ${limiteDisponivel}</span>
                    </div>
                    <input type="number" id="qtd-prod-${p.id}" class="w-16 border border-gray-300 rounded p-1 text-center text-sm focus:outline-blue-500" min="0" max="${limiteDisponivel}" value="${qtdCompradaAntes}" data-preco="${p.preco}" onchange="calcularTotalDinamico()">
                </div>
            `;
        });
    } else {
        document.getElementById('titulo-modal-consumo').innerText = "Registrar Consumo";
        document.getElementById('input-consumo-colaborador').value = '';
        document.getElementById('input-consumo-data').value = new Date().toISOString().split('T')[0];
        document.getElementById('input-consumo-obs').value = '';

        estoqueGlobal.forEach(p => {
            containerInputs.innerHTML += `
                <div class="flex justify-between items-center bg-white p-2 border rounded shadow-sm">
                    <div class="flex flex-col">
                        <span class="text-xs font-bold text-gray-700 truncate w-32" title="${p.nome}">${p.nome}</span>
                        <span class="text-[10px] text-gray-500">R$ ${Number(p.preco).toFixed(2).replace('.',',')} | Disp: ${p.qtd}</span>
                    </div>
                    <input type="number" id="qtd-prod-${p.id}" class="w-16 border border-gray-300 rounded p-1 text-center text-sm focus:outline-blue-500" min="0" max="${p.qtd}" value="0" data-preco="${p.preco}" onchange="calcularTotalDinamico()">
                </div>
            `;
        });
    }

    calcularTotalDinamico();
    abrirModal('modal-consumo');
}

function calcularTotalDinamico() {
    let total = 0;
    estoqueGlobal.forEach(p => {
        let inputQtd = document.getElementById(`qtd-prod-${p.id}`);
        if(inputQtd && parseInt(inputQtd.value) > 0) {
            total += parseInt(inputQtd.value) * parseFloat(inputQtd.getAttribute('data-preco'));
        }
    });
    document.getElementById('total-consumo-modal').innerText = `R$ ${total.toFixed(2).replace('.', ',')}`;
    return total;
}

async function salvarConsumo() {
    const colaborador = document.getElementById('input-consumo-colaborador').value.trim();
    const dataInput = document.getElementById('input-consumo-data').value;
    const obs = document.getElementById('input-consumo-obs').value;
    const totalVenda = calcularTotalDinamico();

    if(!colaborador || !dataInput) {
        return avisoErro('Atenção', 'Preencha o nome do colaborador e a data!');
    }

    let itensParaSalvar = [];
    
    estoqueGlobal.forEach(p => {
        let inputQtd = document.getElementById(`qtd-prod-${p.id}`);
        let qtdDesejada = parseInt(inputQtd.value);
        if (qtdDesejada > 0) {
            itensParaSalvar.push({ id_produto: p.id, qtd: qtdDesejada, preco: parseFloat(inputQtd.getAttribute('data-preco')) });
        }
    });

    if(itensParaSalvar.length === 0) {
        return avisoErro('Atenção', 'Selecione pelo menos um produto para registrar.');
    }

    try {
        toggleLoading(true);

        if (vendaEmEdicaoId) {
            const vendaAntiga = vendasGlobal.find(v => v.id === vendaEmEdicaoId);
            for(let iv of vendaAntiga.itens_venda) {
                let p = estoqueGlobal.find(e => e.id === iv.produto_id);
                if(p) {
                    await supabase.from('produtos').update({ qtd: p.qtd + iv.qtd }).eq('id', p.id);
                }
            }
            await supabase.from('itens_venda').delete().eq('venda_id', vendaEmEdicaoId);
        }

        let idVendaProcessada = vendaEmEdicaoId;
        
        if (vendaEmEdicaoId) {
            await supabase.from('vendas').update({
                colaborador: colaborador, data_venda: dataInput, observacao: obs, total_devido: totalVenda
            }).eq('id', vendaEmEdicaoId);
        } else {
            const { data: novaVenda, error: errVenda } = await supabase.from('vendas').insert([{
                colaborador: colaborador, data_venda: dataInput, observacao: obs, total_devido: totalVenda
            }]).select();
            if(errVenda) throw errVenda;
            idVendaProcessada = novaVenda[0].id;
        }

        for(let item of itensParaSalvar) {
            await supabase.from('itens_venda').insert([{
                venda_id: idVendaProcessada, produto_id: item.id_produto, qtd: item.qtd, preco_unitario: item.preco
            }]);
            
            const { data: pAtual } = await supabase.from('produtos').select('qtd').eq('id', item.id_produto).single();
            await supabase.from('produtos').update({ qtd: pAtual.qtd - item.qtd }).eq('id', item.id_produto);
        }

        fecharModal('modal-consumo');
        vendaEmEdicaoId = null;
        
        await carregarDadosDoBanco();
        avisoSucesso('Consumo salvo com sucesso!');

    } catch (e) {
        avisoErro('Erro', 'Ocorreu um erro ao salvar o consumo.');
        console.error(e);
        toggleLoading(false);
    }
}

/* ==================================================
   8. DASHBOARD & FINANCEIRO
   ================================================== */
function renderizarFinanceiro() {
    const tbody = document.getElementById('tabela-financeiro');
    tbody.innerHTML = '';
    
    let resumo = {};
    vendasGlobal.forEach(v => {
        if(!resumo[v.colaborador]) resumo[v.colaborador] = 0;
        resumo[v.colaborador] += Number(v.total_devido);
    });

    Object.keys(resumo).forEach(colab => {
        tbody.innerHTML += `
            <tr>
                <td class="p-4 text-gray-800 font-medium">${colab}</td>
                <td class="p-4 text-blue-700 font-bold">R$ ${resumo[colab].toFixed(2).replace('.',',')}</td>
            </tr>
        `;
    });

    if (Object.keys(resumo).length === 0) {
        tbody.innerHTML = `<tr><td colspan="2" class="p-4 text-center text-gray-500">Nenhum acerto financeiro pendente.</td></tr>`;
    }
}

function calcularDashboard() {
    let totalGeral = vendasGlobal.reduce((acc, v) => acc + Number(v.total_devido), 0);
    document.getElementById('dash-recebido').innerText = `R$ ${totalGeral.toFixed(2).replace('.', ',')}`;
    
    let valorEstoque = estoqueGlobal.reduce((acc, p) => acc + (p.qtd * p.preco), 0);
    document.getElementById('dash-lucro').innerText = `R$ ${valorEstoque.toFixed(2).replace('.', ',')}`;

    let itensSemana = 0;
    let valorSemana = 0;

    vendasGlobal.forEach(v => {
        if(!v.data_venda) return;
        const [a, m, d] = v.data_venda.split('-');
        const dataVenda = new Date(a, m - 1, d);
        if(dataVenda >= semanaSelecionada.start && dataVenda <= semanaSelecionada.end) {
            valorSemana += Number(v.total_devido);
            v.itens_venda.forEach(iv => itensSemana += iv.qtd);
        }
    });

    document.getElementById('dash-itens').innerText = itensSemana;
    document.getElementById('dash-semana').innerText = `R$ ${valorSemana.toFixed(2).replace('.', ',')}`;
}

window.onload = () => {
    carregarDadosDoBanco();
};
