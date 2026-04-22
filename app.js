const STORAGE_KEY = 'weight-records';

const form = document.getElementById('weight-form');
const dateInput = document.getElementById('date-input');
const weightInput = document.getElementById('weight-input');
const messageEl = document.getElementById('message');
const historyList = document.getElementById('history-list');
const statsEl = document.getElementById('stats');
const noDataEl = document.getElementById('no-data');
const chartWrapper = document.querySelector('.chart-wrapper');
const chartCanvas = document.getElementById('weight-chart');

let chart = null;

function loadRecords() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
}

function saveRecords(records) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function showMessage(text, type = 'success') {
    messageEl.textContent = text;
    messageEl.className = `message ${type}`;
    setTimeout(() => {
        messageEl.className = 'message';
    }, 2500);
}

function addRecord(date, weight) {
    const records = loadRecords();
    const existingIndex = records.findIndex(r => r.date === date);
    if (existingIndex >= 0) {
        records[existingIndex].weight = weight;
        showMessage(`${date} の記録を更新しました`);
    } else {
        records.push({ date, weight });
        showMessage(`${date} の記録を追加しました`);
    }
    records.sort((a, b) => a.date.localeCompare(b.date));
    saveRecords(records);
    render();
}

function deleteRecord(date) {
    if (!confirm(`${date} の記録を削除しますか?`)) return;
    const records = loadRecords().filter(r => r.date !== date);
    saveRecords(records);
    showMessage('記録を削除しました');
    render();
}

function renderStats(records) {
    if (records.length === 0) {
        statsEl.innerHTML = '';
        return;
    }
    const weights = records.map(r => r.weight);
    const latest = weights[weights.length - 1];
    const min = Math.min(...weights);
    const max = Math.max(...weights);
    const diff = records.length >= 2 ? (latest - weights[0]).toFixed(1) : '0.0';
    const diffSign = diff > 0 ? '+' : '';

    statsEl.innerHTML = `
        <div class="stat-card">
            <div class="stat-label">最新</div>
            <div class="stat-value">${latest.toFixed(1)} kg</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">最小</div>
            <div class="stat-value">${min.toFixed(1)} kg</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">最大</div>
            <div class="stat-value">${max.toFixed(1)} kg</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">増減</div>
            <div class="stat-value">${diffSign}${diff} kg</div>
        </div>
    `;
}

function renderHistory(records) {
    historyList.innerHTML = '';
    const reversed = [...records].reverse();
    reversed.forEach(record => {
        const li = document.createElement('li');
        li.className = 'history-item';
        li.innerHTML = `
            <span class="history-date">${record.date}</span>
            <span class="history-weight">${record.weight.toFixed(1)} kg</span>
            <button class="delete-btn" data-date="${record.date}">削除</button>
        `;
        historyList.appendChild(li);
    });
    historyList.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteRecord(btn.dataset.date));
    });
}

function renderChart(records) {
    if (records.length === 0) {
        noDataEl.classList.add('show');
        chartWrapper.classList.add('hide');
        if (chart) {
            chart.destroy();
            chart = null;
        }
        return;
    }

    noDataEl.classList.remove('show');
    chartWrapper.classList.remove('hide');

    const data = records.map(r => ({ x: r.date, y: r.weight }));

    if (chart) {
        chart.data.datasets[0].data = data;
        chart.update();
        return;
    }

    chart = new Chart(chartCanvas, {
        type: 'line',
        data: {
            datasets: [{
                label: '体重 (kg)',
                data: data,
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                borderWidth: 2,
                tension: 0.2,
                fill: true,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBackgroundColor: '#3498db'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day',
                        displayFormats: { day: 'M/d' },
                        tooltipFormat: 'yyyy-MM-dd'
                    },
                    title: { display: true, text: '日付' }
                },
                y: {
                    title: { display: true, text: '体重 (kg)' }
                }
            },
            plugins: {
                legend: { display: true, position: 'top' },
                tooltip: {
                    callbacks: {
                        label: (ctx) => `${ctx.parsed.y.toFixed(1)} kg`
                    }
                }
            }
        }
    });
}

function render() {
    const records = loadRecords();
    renderStats(records);
    renderHistory(records);
    renderChart(records);
}

form.addEventListener('submit', (e) => {
    e.preventDefault();
    const date = dateInput.value;
    const weight = parseFloat(weightInput.value);
    if (!date || isNaN(weight) || weight <= 0) {
        showMessage('有効な日付と体重を入力してください', 'error');
        return;
    }
    addRecord(date, weight);
    weightInput.value = '';
});

dateInput.value = new Date().toISOString().split('T')[0];
render();
