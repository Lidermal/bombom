import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

// Configuração do Supabase
const SUPABASE_URL = 'https://jyjrzczpuyomatskebfk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5anJ6Y3pwdXlvbWF0c2tlYmZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4MDExMDcsImV4cCI6MjA5NzM3NzEwN30.texrp9Ayt6rzmQyCYDS1UgJiKm6yUm4-PFq4lIj47hE';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Componente de Alerta Personalizado
const CustomAlert = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';

  return (
    <div className={`fixed top-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in`}>
      {message}
    </div>
  );
};

// Função para obter semana atual
const getWeekRange = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  return {
    start: monday.toISOString().split('T')[0],
    end: sunday.toISOString().split('T')[0],
    label: `${monday.getDate().toString().padStart(2, '0')}/${(monday.getMonth()+1).toString().padStart(2, '0')} à ${sunday.getDate().toString().padStart(2, '0')}/${(sunday.getMonth()+1).toString().padStart(2, '0')}`
  };
};

const App = () => {
  // Estados
  const [activeTab, setActiveTab] = useState('vendas');
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [stock, setStock] = useState([]);
  const [alert, setAlert] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [currentWeek, setCurrentWeek] = useState(getWeekRange(new Date()));
  
  // Form states
  const [saleForm, setSaleForm] = useState({
    client: '',
    date: new Date().toISOString().split('T')[0],
    products: [],
    total: 0,
    status: 'PAGO',
    observation: ''
  });

  const [productForm, setProductForm] = useState({
    name: '',
    price: 2.50,
    stock: 0
  });

  const [stockForm, setStockForm] = useState({
    product_id: '',
    quantity: 0,
    type: 'entry' // entry ou exit
  });

  // Carregar dados
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await loadSales();
    await loadProducts();
    await loadStock();
  };

  const loadSales = async () => {
    const { data, error } = await supabase
      .from('sales')
      .select(`
        *,
        sale_items (
          product_id,
          quantity,
          price,
          products (name)
        )
      `)
      .order('date', { ascending: false });
    
    if (error) {
      setAlert({ message: 'Erro ao carregar vendas', type: 'error' });
    } else {
      setSales(data || []);
    }
  };

  const loadProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name');
    
    if (error) {
      setAlert({ message: 'Erro ao carregar produtos', type: 'error' });
    } else {
      setProducts(data || []);
    }
  };

  const loadStock = async () => {
    const { data, error } = await supabase
      .from('stock')
      .select(`
        *,
        products (name)
      `);
    
    if (error) {
      setAlert({ message: 'Erro ao carregar estoque', type: 'error' });
    } else {
      setStock(data || []);
    }
  };

  // Criar tabelas se não existirem
  const createTables = async () => {
    // Tabela de produtos
    await supabase.rpc('create_products_table');
    
    // Tabela de vendas
    await supabase.rpc('create_sales_table');
    
    // Tabela de itens de venda
    await supabase.rpc('create_sale_items_table');
    
    // Tabela de estoque
    await supabase.rpc('create_stock_table');
  };

  // Salvar venda
  const saveSale = async () => {
    if (!saleForm.client || saleForm.products.length === 0) {
      setAlert({ message: 'Preencha o cliente e adicione produtos', type: 'error' });
      return;
    }

    const { data, error } = await supabase
      .from('sales')
      .insert({
        client: saleForm.client,
        date: saleForm.date,
        total: saleForm.total,
        status: saleForm.status,
        observation: saleForm.observation,
        week_label: currentWeek.label
      })
      .select()
      .single();

    if (error) {
      setAlert({ message: 'Erro ao salvar venda', type: 'error' });
      return;
    }

    // Salvar itens
    for (const item of saleForm.products) {
      await supabase.from('sale_items').insert({
        sale_id: data.id,
        product_id: item.id,
        quantity: item.quantity,
        price: item.price
      });

      // Atualizar estoque
      if (item.stock_id) {
        await supabase.rpc('update_stock', {
          p_stock_id: item.stock_id,
          p_quantity: -item.quantity
        });
      }
    }

    setAlert({ message: 'Venda salva com sucesso!', type: 'success' });
    setShowModal(false);
    resetSaleForm();
    loadData();
  };

  const resetSaleForm = () => {
    setSaleForm({
      client: '',
      date: new Date().toISOString().split('T')[0],
      products: [],
      total: 0,
      status: 'PAGO',
      observation: ''
    });
  };

  // Adicionar produto à venda
  const addProductToSale = (product) => {
    const existing = saleForm.products.find(p => p.id === product.id);
    if (existing) {
      setAlert({ message: 'Produto já adicionado', type: 'error' });
      return;
    }

    setSaleForm({
      ...saleForm,
      products: [...saleForm.products, { ...product, quantity: 1 }]
    });
  };

  const updateProductQuantity = (productId, quantity) => {
    setSaleForm({
      ...saleForm,
      products: saleForm.products.map(p => 
        p.id === productId ? { ...p, quantity: parseInt(quantity) || 1 } : p
      )
    });
  };

  const removeProductFromSale = (productId) => {
    setSaleForm({
      ...saleForm,
      products: saleForm.products.filter(p => p.id !== productId)
    });
  };

  // Calcular total
  useEffect(() => {
    const total = saleForm.products.reduce((acc, p) => acc + (p.price * p.quantity), 0);
    setSaleForm({ ...saleForm, total });
  }, [saleForm.products]);

  // Salvar produto
  const saveProduct = async () => {
    if (!productForm.name) {
      setAlert({ message: 'Nome do produto é obrigatório', type: 'error' });
      return;
    }

    const { error } = await supabase
      .from('products')
      .insert(productForm);

    if (error) {
      setAlert({ message: 'Erro ao salvar produto', type: 'error' });
    } else {
      setAlert({ message: 'Produto salvo com sucesso!', type: 'success' });
      setShowModal(false);
      setProductForm({ name: '', price: 2.50, stock: 0 });
      loadProducts();
    }
  };

  // Atualizar estoque
  const updateStock = async () => {
    if (!stockForm.product_id || stockForm.quantity <= 0) {
      setAlert({ message: 'Selecione o produto e quantidade', type: 'error' });
      return;
    }

    const { error } = await supabase.rpc('update_stock', {
      p_stock_id: stockForm.product_id,
      p_quantity: stockForm.type === 'entry' ? stockForm.quantity : -stockForm.quantity
    });

    if (error) {
      setAlert({ message: 'Erro ao atualizar estoque', type: 'error' });
    } else {
      setAlert({ message: 'Estoque atualizado!', type: 'success' });
      setShowModal(false);
      setStockForm({ product_id: '', quantity: 0, type: 'entry' });
      loadStock();
    }
  };

  // Filtrar vendas da semana
  const getWeekSales = () => {
    return sales.filter(sale => {
      const saleDate = new Date(sale.date);
      const weekStart = new Date(currentWeek.start);
      const weekEnd = new Date(currentWeek.end);
      return saleDate >= weekStart && saleDate <= weekEnd;
    });
  };

  // Dashboard data
  const getDashboardData = () => {
    const weekSales = getWeekSales();
    const totalSales = weekSales.reduce((acc, s) => acc + s.total, 0);
    const paid = weekSales.filter(s => s.status === 'PAGO').reduce((acc, s) => acc + s.total, 0);
    const pending = weekSales.filter(s => s.status === 'À PAGAR').reduce((acc, s) => acc + s.total, 0);
    const toReceive = weekSales.filter(s => s.status === 'A RECEBER').reduce((acc, s) => acc + s.total, 0);
    
    // Agrupar por dia da semana
    const byDay = {};
    weekSales.forEach(sale => {
      const day = new Date(sale.date).toLocaleDateString('pt-BR', { weekday: 'short' });
      byDay[day] = (byDay[day] || 0) + sale.total;
    });

    return {
      totalSales,
      paid,
      pending,
      toReceive,
      profit: paid - (totalSales * 0.4), // Margem de 60%
      byDay: Object.entries(byDay).map(([name, value]) => ({ name, value }))
    };
  };

  const dashboardData = getDashboardData();

  // Cores para gráficos
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      {alert && (
        <CustomAlert 
          message={alert.message} 
          type={alert.type} 
          onClose={() => setAlert(null)} 
        />
      )}

      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-4">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Controle de Trufas</h1>
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex gap-2">
            <button 
              onClick={() => setActiveTab('vendas')}
              className={`px-4 py-2 rounded ${activeTab === 'vendas' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              Vendas
            </button>
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-2 rounded ${activeTab === 'dashboard' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              Dashboard
            </button>
            <button 
              onClick={() => setActiveTab('estoque')}
              className={`px-4 py-2 rounded ${activeTab === 'estoque' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              Estoque
            </button>
            <button 
              onClick={() => setActiveTab('financeiro')}
              className={`px-4 py-2 rounded ${activeTab === 'financeiro' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              Financeiro
            </button>
          </div>
          
          <div className="ml-auto flex items-center gap-2">
            <span className="text-gray-600">Semana:</span>
            <input 
              type="date" 
              value={currentWeek.start}
              onChange={(e) => setCurrentWeek(getWeekRange(e.target.value))}
              className="border rounded px-2 py-1"
            />
            <span className="text-gray-600">{currentWeek.label}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow-md p-6">
        {activeTab === 'vendas' && (
          <div>
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-bold">Vendas da Semana</h2>
              <button 
                onClick={() => { setModalType('sale'); setShowModal(true); }}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              >
                Nova Venda
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-2">Dia</th>
                    <th className="border p-2">Cliente</th>
                    <th className="border p-2">Produtos</th>
                    <th className="border p-2">Total</th>
                    <th className="border p-2">Status</th>
                    <th className="border p-2">Obs</th>
                  </tr>
                </thead>
                <tbody>
                  {getWeekSales().map((sale, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border p-2">
                        {new Date(sale.date).toLocaleDateString('pt-BR', { weekday: 'short' })}
                      </td>
                      <td className="border p-2">{sale.client}</td>
                      <td className="border p-2">
                        {sale.sale_items?.map((item, i) => (
                          <div key={i}>{item.products?.name} x{item.quantity}</div>
                        ))}
                      </td>
                      <td className="border p-2">R$ {sale.total.toFixed(2)}</td>
                      <td className="border p-2">
                        <span className={`px-2 py-1 rounded text-white ${
                          sale.status === 'PAGO' ? 'bg-green-500' : 
                          sale.status === 'À PAGAR' ? 'bg-red-500' : 'bg-yellow-500'
                        }`}>
                          {sale.status}
                        </span>
                      </td>
                      <td className="border p-2">{sale.observation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div>
            <h2 className="text-xl font-bold mb-4">Dashboard - Semana {currentWeek.label}</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-100 p-4 rounded-lg">
                <h3 className="text-sm text-gray-600">Total em Vendas</h3>
                <p className="text-2xl font-bold">R$ {dashboardData.totalSales.toFixed(2)}</p>
              </div>
              <div className="bg-green-100 p-4 rounded-lg">
                <h3 className="text-sm text-gray-600">Pago</h3>
                <p className="text-2xl font-bold text-green-600">R$ {dashboardData.paid.toFixed(2)}</p>
              </div>
              <div className="bg-red-100 p-4 rounded-lg">
                <h3 className="text-sm text-gray-600">Pendentes</h3>
                <p className="text-2xl font-bold text-red-600">R$ {dashboardData.pending.toFixed(2)}</p>
              </div>
              <div className="bg-purple-100 p-4 rounded-lg">
                <h3 className="text-sm text-gray-600">Lucro Estimado</h3>
                <p className="text-2xl font-bold text-purple-600">R$ {dashboardData.profit.toFixed(2)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-bold mb-2">Vendas por Dia</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={dashboardData.byDay}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-bold mb-2">Distribuição de Pagamentos</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Pago', value: dashboardData.paid },
                        { name: 'Pendente', value: dashboardData.pending },
                        { name: 'A Receber', value: dashboardData.toReceive }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: R$ ${value.toFixed(2)}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {[0, 1, 2].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'estoque' && (
          <div>
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-bold">Controle de Estoque</h2>
              <div className="flex gap-2">
                <button 
                  onClick={() => { setModalType('product'); setShowModal(true); }}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  Novo Produto
                </button>
                <button 
                  onClick={() => { setModalType('stock'); setShowModal(true); }}
                  className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
                >
                  Movimentar Estoque
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-2">Produto</th>
                    <th className="border p-2">Preço</th>
                    <th className="border p-2">Estoque Atual</th>
                    <th className="border p-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stock.map((item, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border p-2">{item.products?.name}</td>
                      <td className="border p-2">R$ {item.products?.price?.toFixed(2)}</td>
                      <td className="border p-2 font-bold">{item.quantity}</td>
                      <td className="border p-2">
                        {item.quantity <= 5 ? (
                          <span className="text-red-500 font-bold">Baixo</span>
                        ) : item.quantity <= 10 ? (
                          <span className="text-yellow-500">Médio</span>
                        ) : (
                          <span className="text-green-500">Bom</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'financeiro' && (
          <div>
            <h2 className="text-xl font-bold mb-4">Controle Financeiro</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-green-100 p-4 rounded-lg">
                <h3 className="text-sm">Total Recebido</h3>
                <p className="text-2xl font-bold text-green-600">R$ {dashboardData.paid.toFixed(2)}</p>
              </div>
              <div className="bg-red-100 p-4 rounded-lg">
                <h3 className="text-sm">Total Pendente</h3>
                <p className="text-2xl font-bold text-red-600">R$ {dashboardData.pending.toFixed(2)}</p>
              </div>
              <div className="bg-yellow-100 p-4 rounded-lg">
                <h3 className="text-sm">A Receber</h3>
                <p className="text-2xl font-bold text-yellow-600">R$ {dashboardData.toReceive.toFixed(2)}</p>
              </div>
            </div>

            <h3 className="font-bold mb-2">Clientes com Pendências</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-2">Cliente</th>
                    <th className="border p-2">Total</th>
                    <th className="border p-2">Status</th>
                    <th className="border p-2">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {getWeekSales()
                    .filter(s => s.status !== 'PAGO')
                    .map((sale, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="border p-2">{sale.client}</td>
                        <td className="border p-2">R$ {sale.total.toFixed(2)}</td>
                        <td className="border p-2">
                          <span className={`px-2 py-1 rounded text-white ${
                            sale.status === 'À PAGAR' ? 'bg-red-500' : 'bg-yellow-500'
                          }`}>
                            {sale.status}
                          </span>
                        </td>
                        <td className="border p-2">{new Date(sale.date).toLocaleDateString('pt-BR')}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {modalType === 'sale' && 'Nova Venda'}
              {modalType === 'product' && 'Novo Produto'}
              {modalType === 'stock' && 'Movimentar Estoque'}
            </h2>

            {modalType === 'sale' && (
              <div className="space-y-4">
                <div>
                  <label className="block font-bold mb-1">Cliente</label>
                  <input
                    type="text"
                    value={saleForm.client}
                    onChange={(e) => setSaleForm({...saleForm, client: e.target.value})}
                    className="w-full border rounded px-3 py-2"
                    placeholder="Nome do cliente"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">Data</label>
                  <input
                    type="date"
                    value={saleForm.date}
                    onChange={(e) => setSaleForm({...saleForm, date: e.target.value})}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-2">Produtos</label>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    {products.map(product => (
                      <button
                        key={product.id}
                        onClick={() => addProductToSale(product)}
                        disabled={saleForm.products.find(p => p.id === product.id)}
                        className={`p-2 rounded border ${
                          saleForm.products.find(p => p.id === product.id)
                            ? 'bg-gray-200 cursor-not-allowed'
                            : 'bg-blue-50 hover:bg-blue-100'
                        }`}
                      >
                        {product.name} - R$ {product.price.toFixed(2)}
                      </button>
                    ))}
                  </div>
                  
                  {saleForm.products.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {saleForm.products.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                          <span className="flex-1">{item.name}</span>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateProductQuantity(item.id, e.target.value)}
                            className="w-20 border rounded px-2 py-1"
                          />
                          <span>R$ {(item.price * item.quantity).toFixed(2)}</span>
                          <button
                            onClick={() => removeProductFromSale(item.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block font-bold mb-1">Status</label>
                  <select
                    value={saleForm.status}
                    onChange={(e) => setSaleForm({...saleForm, status: e.target.value})}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="PAGO">PAGO</option>
                    <option value="À PAGAR">À PAGAR</option>
                    <option value="A RECEBER">A RECEBER</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1">Observação</label>
                  <textarea
                    value={saleForm.observation}
                    onChange={(e) => setSaleForm({...saleForm, observation: e.target.value})}
                    className="w-full border rounded px-3 py-2"
                    rows="2"
                  />
                </div>

                <div className="bg-gray-100 p-3 rounded">
                  <span className="font-bold">Total: R$ {saleForm.total.toFixed(2)}</span>
                </div>

                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border rounded hover:bg-gray-100"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={saveSale}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    Salvar
                  </button>
                </div>
              </div>
            )}

            {modalType === 'product' && (
              <div className="space-y-4">
                <div>
                  <label className="block font-bold mb-1">Nome do Produto</label>
                  <input
                    type="text"
                    value={productForm.name}
                    onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                    className="w-full border rounded px-3 py-2"
                    placeholder="Ex: Chocolate, Ninho, etc."
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">Preço (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={productForm.price}
                    onChange={(e) => setProductForm({...productForm, price: parseFloat(e.target.value)})}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">Estoque Inicial</label>
                  <input
                    type="number"
                    value={productForm.stock}
                    onChange={(e) => setProductForm({...productForm, stock: parseInt(e.target.value)})}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border rounded hover:bg-gray-100"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={saveProduct}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Salvar
                  </button>
                </div>
              </div>
            )}

            {modalType === 'stock' && (
              <div className="space-y-4">
                <div>
                  <label className="block font-bold mb-1">Produto</label>
                  <select
                    value={stockForm.product_id}
                    onChange={(e) => setStockForm({...stockForm, product_id: e.target.value})}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="">Selecione...</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1">Tipo de Movimentação</label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="entry"
                        checked={stockForm.type === 'entry'}
                        onChange={(e) => setStockForm({...stockForm, type: e.target.value})}
                        className="mr-2"
                      />
                      Entrada (Adicionar)
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="exit"
                        checked={stockForm.type === 'exit'}
                        onChange={(e) => setStockForm({...stockForm, type: e.target.value})}
                        className="mr-2"
                      />
                      Saída (Remover)
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block font-bold mb-1">Quantidade</label>
                  <input
                    type="number"
                    min="1"
                    value={stockForm.quantity}
                    onChange={(e) => setStockForm({...stockForm, quantity: parseInt(e.target.value)})}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border rounded hover:bg-gray-100"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={updateStock}
                    className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
                  >
                    Atualizar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
