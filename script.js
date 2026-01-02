// DOM Elements
const form = document.getElementById('expense-form');
const expenseList = document.getElementById('expenses-list');
const ctx = document.getElementById('expenses-chart').getContext('2d');
const categorySelect = document.getElementById('expense-category');
const typeInputs = document.querySelectorAll('input[name="type"]');

// Chart Controls
// Chart Controls
const btnViewPie = document.getElementById('view-pie');
const btnViewLine = document.getElementById('view-line');
// btnExport moved to setupEventListeners to ensure existence
const timeFilters = document.getElementById('time-filters');
const filterBtns = document.querySelectorAll('.filter-btn');

// State
let expenses = [];
let chartInstance = null;
let currentChartType = 'pie'; // 'pie' or 'line'
let currentChartMode = 'percent'; // 'percent' or 'value' for Pie chart labels
let currentTimeFilter = '7d'; // Default 1 week

// Categories
const CATEGORIES = {
    expense: [
        { id: 'Fuel', name: 'דלק', icon: '⛽' },
        { id: 'Supermarket', name: 'קניות בסופר', icon: '🛒' },
        { id: 'Leisure', name: 'פנאי', icon: '🍿' },
        { id: 'Electricity', name: 'חשמל', icon: '⚡' },
        { id: 'Water', name: 'מים', icon: '💧' },
        { id: 'MayaStudies', name: 'לימודים מאיה', icon: '👩‍🎓' },
        { id: 'OmerStudies', name: 'לימודים עומר', icon: '👨‍🎓' },
        { id: 'Bills', name: 'חשבונות', icon: '🧾' },
        { id: 'Gifts', name: 'מתנות', icon: '🎁' },
        { id: 'Other', name: 'אחר', icon: '🛠️' }
    ],
    income: [
        { id: 'Salary', name: 'משכורת', icon: '💰' },
        { id: 'Gift', name: 'מתנה', icon: '🎁' },
        { id: 'Investment', name: 'השקעות', icon: '📈' },
        { id: 'OtherIncome', name: 'אחר', icon: '💵' }
    ]
};

// Colors
const COLORS = [
    '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#6366f1', '#14b8a6', '#f97316', '#84cc16'
];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Register Plugin Safety Check
    if (typeof ChartDataLabels !== 'undefined') {
        Chart.register(ChartDataLabels);
    }

    // Set default date
    const dateInput = document.getElementById('expense-date');
    if (dateInput) {
        dateInput.valueAsDate = new Date();
    }

    // Load Data
    loadExpenses();

    // Setup UI
    updateCategoryOptions();
    renderExpenses();
    renderChart();

    // Listeners
    setupEventListeners();
});

function setupEventListeners() {
    if (form) form.addEventListener('submit', addExpense);

    // Event Delegation for Delete
    if (expenseList) {
        expenseList.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-delete');
            if (btn) {
                const id = btn.dataset.id;
                deleteExpense(id);
            }
        });
    }

    // Toggle Type
    typeInputs.forEach(input => {
        input.addEventListener('change', updateCategoryOptions);
    });

    // Chart Mode Switching
    if (btnViewPie) btnViewPie.addEventListener('click', () => switchChartType('pie'));
    if (btnViewLine) btnViewLine.addEventListener('click', () => switchChartType('line'));

    const btnExport = document.getElementById('btn-export');
    if (btnExport) {
        btnExport.addEventListener('click', exportToCSV);
    } else {
        console.error('Export button not found in DOM');
    }

    // Time Filters
    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentTimeFilter = e.target.dataset.period;
            renderChart();
        });
    });
}

function switchChartType(type) {
    currentChartType = type;

    if (type === 'pie') {
        btnViewPie.classList.add('active');
        btnViewLine.classList.remove('active');
        timeFilters.classList.add('hidden');
    } else {
        btnViewLine.classList.add('active');
        btnViewPie.classList.remove('active');
        timeFilters.classList.remove('hidden');
    }
    renderChart();
}

function updateCategoryOptions() {
    const checkedInput = document.querySelector('input[name="type"]:checked');
    if (!checkedInput) return;

    const type = checkedInput.value;
    const options = CATEGORIES[type] || [];

    categorySelect.innerHTML = '';
    options.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = `${cat.icon} ${cat.name}`;
        categorySelect.appendChild(option);
    });
}

function getCategoryName(id) {
    const all = [...CATEGORIES.expense, ...CATEGORIES.income];
    const found = all.find(c => c.id === id);
    return found ? `${found.icon} ${found.name}` : id;
}

// Data Logic
function loadExpenses() {
    try {
        const stored = localStorage.getItem('expenses');
        if (stored) {
            expenses = JSON.parse(stored);
            if (!Array.isArray(expenses)) expenses = [];
            // Migration support
            expenses = expenses.map(e => ({
                ...e,
                id: String(e.id), // Ensure ID is string
                type: e.type || 'expense'
            }));
        }
    } catch (e) {
        console.error('Failed to load expenses', e);
        expenses = [];
    }
}

function saveExpenses() {
    localStorage.setItem('expenses', JSON.stringify(expenses));
}

function addExpense(e) {
    e.preventDefault();

    const nameInput = document.getElementById('expense-name');
    const amountInput = document.getElementById('expense-amount');
    const categoryInput = document.getElementById('expense-category');
    const dateInput = document.getElementById('expense-date');
    const typeInput = document.querySelector('input[name="type"]:checked');

    const name = nameInput.value;
    const amount = parseFloat(amountInput.value);
    const category = categoryInput.value;
    const date = dateInput.value;
    const type = typeInput ? typeInput.value : 'expense';

    if (!name || isNaN(amount) || amount <= 0 || !date) {
        alert('נא למלא את כל השדות בצורה תקינה');
        return;
    }

    const item = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name,
        amount,
        category,
        date,
        type
    };

    expenses.unshift(item);
    saveExpenses();
    renderExpenses();
    renderChart();

    form.reset();
    dateInput.valueAsDate = new Date();

    // Retain type selection functionality visually
    setTimeout(() => {
        const checked = document.querySelector('input[name="type"]:checked');
        if (checked) checked.dispatchEvent(new Event('change'));
    }, 0);
}

function deleteExpense(id) {
    console.log('Attempting to delete ID:', id);
    if (confirm('האם אתה בטוח שברצונך למחוק תנועה זו?')) {
        const initialLength = expenses.length;
        expenses = expenses.filter(exp => String(exp.id) !== String(id));

        if (expenses.length === initialLength) {
            console.warn('No item found with ID:', id);
        } else {
            console.log('Item deleted successfully');
        }

        saveExpenses();
        renderExpenses();
        renderChart();
    }
}

function exportToCSV() {
    if (!expenses || expenses.length === 0) {
        alert('אין נתונים לייצוא');
        return;
    }

    // Hebew Headers
    const headers = ['תאריך', 'סוג', 'קטגוריה', 'תיאור', 'סכום'];

    // Convert data to CSV
    const csvRows = [];
    csvRows.push(headers.join(','));

    expenses.forEach(exp => {
        const dateStr = exp.date;
        const typeStr = exp.type === 'income' ? 'הכנסה' : 'הוצאה';
        const categoryStr = getCategoryName(exp.category).replace(/"/g, '""');
        const nameStr = exp.name.replace(/"/g, '""');

        const row = [
            dateStr,
            typeStr,
            `"${categoryStr}"`,
            `"${nameStr}"`,
            exp.amount
        ];
        csvRows.push(row.join(','));
    });

    const csvString = csvRows.join('\n');
    const bom = '\uFEFF';
    const blob = new Blob([bom + csvString], { type: 'text/csv;charset=utf-8;' });

    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'budget_backup.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function renderExpenses() {
    expenseList.innerHTML = '';

    if (!expenses || expenses.length === 0) {
        expenseList.innerHTML = '<tr><td colspan="5" style="text-align:center; color: #6b7280;">אין תנועות להצגה</td></tr>';
        return;
    }

    expenses.forEach(exp => {
        const tr = document.createElement('tr');
        const dateObj = new Date(exp.date);
        const dateStr = !isNaN(dateObj) ? dateObj.toLocaleDateString('he-IL') : exp.date;

        const isIncome = exp.type === 'income';
        const sign = isIncome ? '+' : '-';
        const amountClass = isIncome ? 'amount-income' : 'amount-expense';

        tr.innerHTML = `
            <td>${exp.name}</td>
            <td class="${amountClass}">${sign}${exp.amount.toFixed(2)}</td>
            <td>${getCategoryName(exp.category)}</td>
            <td>${dateStr}</td>
            <td>
                <button class="btn-delete" data-id="${exp.id}">מחק</button>
            </td>
        `;
        expenseList.appendChild(tr);
    });
}

function renderChart() {
    const canvas = document.getElementById('expenses-chart');
    if (!canvas) return;

    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }

    if (!expenses || expenses.length === 0) {
        return;
    }

    if (currentChartType === 'pie') {
        renderPieChart();
    } else {
        renderLineChart();
    }
}

function renderPieChart() {
    const expenseItems = expenses.filter(e => e.type === 'expense');

    if (expenseItems.length === 0) return;

    const totals = {};
    expenseItems.forEach(e => {
        if (!totals[e.category]) totals[e.category] = 0;
        totals[e.category] += e.amount;
    });

    const labels = Object.keys(totals).map(id => getCategoryName(id));
    const data = Object.values(totals);

    chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: COLORS,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: 20 },
            onClick: (e) => {
                currentChartMode = currentChartMode === 'percent' ? 'value' : 'percent';
                if (chartInstance) chartInstance.update();
            },
            plugins: {
                legend: { position: 'right', rtl: true },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            let label = context.label || '';
                            if (label) label += ': ';
                            label += '₪' + context.raw.toFixed(2);
                            return label;
                        }
                    }
                },
                datalabels: {
                    color: '#000000',
                    font: { weight: 'bold', size: 12 },
                    anchor: 'center',
                    align: 'center',
                    offset: 0,
                    formatter: (value, ctx) => {
                        if (currentChartMode === 'percent') {
                            let sum = 0;
                            let dataArr = ctx.chart.data.datasets[0].data;
                            dataArr.map(data => { sum += data; });
                            if (sum === 0) return '0%';
                            let percentage = (value * 100 / sum).toFixed(1) + "%";
                            return percentage;
                        } else {
                            return '₪' + Math.round(value);
                        }
                    }
                }
            }
        }
    });
}

function renderLineChart() {
    const cutoff = new Date();

    let daysToSubtract = 7;
    if (currentTimeFilter === '7d') daysToSubtract = 7;
    if (currentTimeFilter === '30d') daysToSubtract = 30;
    if (currentTimeFilter === '90d') daysToSubtract = 90;
    if (currentTimeFilter === '180d') daysToSubtract = 180;
    if (currentTimeFilter === '365d') daysToSubtract = 365;

    cutoff.setDate(cutoff.getDate() - daysToSubtract);

    const validExpenses = expenses.filter(e => {
        if (e.type !== 'expense') return false;
        const d = new Date(e.date);
        return d >= cutoff;
    });

    const aggregated = {};
    validExpenses.forEach(e => {
        const dStr = e.date;
        if (!aggregated[dStr]) aggregated[dStr] = 0;
        aggregated[dStr] += e.amount;
    });

    const sortedDates = Object.keys(aggregated).sort();
    const dataPoints = sortedDates.map(date => ({
        x: date,
        y: aggregated[date]
    }));

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: 'הוצאות',
                data: dataPoints,
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: daysToSubtract > 60 ? 'month' : 'day',
                        displayFormats: {
                            day: 'd/M',
                            month: 'M/yy'
                        }
                    },
                    adapters: {
                        date: { locale: 'he-IL' }
                    }
                },
                y: { beginAtZero: true }
            },
            plugins: {
                datalabels: { display: false }
            }
        }
    });
}
