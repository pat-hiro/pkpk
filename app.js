const STORAGE_KEY = 'weight-records';

const form = document.getElementById('weight-form');
const datetimeInput = document.getElementById('datetime-input');
const weightInput = document.getElementById('weight-input');
const nowBtn = document.getElementById('now-btn');
const messageEl = document.getElementById('message');
const historyList = document.getElementById('history-list');
const statsEl = document.getElementById('stats');
const noDataEl = document.getElementById('no-data');
const chartWrapper = document.querySelector('.chart-wrapper');
const chartCanvas = document.getElementById('weight-chart');
const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const importFile = document.getElementById('import-file');

let chart = null;

function toLocalDatetimeInputValue(date) {
    const pad = n => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDisplay(isoString) {
    const d = new Date(isoString);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function loadRecords() {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return parsed.map(r => {
        if (r.datetime) return r;
        // 旧形式 (date のみ) を datetime へ移行
        return { datetime: new Date(`${r.date}T12:00:00`).toISOString(), weight: r.weight };
    }).sort((a, b) => a.datetime.localeCompare(b.datetime));
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

function addRecord(datetimeISO, weight) {
    const records = loadRecords();
    const existing = records.findIndex(r => r.datetime === datetimeISO);
    if (existing >= 0) {
        records[existing].weight = weight;
        showMessage('同じ日時の記録を更新しました');
    } else {
        records.push({ datetime: datetimeISO, weight });
        showMessage('記録を追加しました');
    }
    records.sort((a, b) => a.datetime.localeCompare(b.datetime));
    saveRecords(records);
    render();
}

function deleteRecord(datetimeISO) {
    if (!confirm(`${formatDisplay(datetimeISO)} の記録を削除しますか?`)) return;
    const records = loadRecords().filter(r => r.datetime !== datetimeISO);
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
    const diff = records.length >= 2 ? (latest - weights[0]) : 0;
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
            <div class="stat-value">${diffSign}${diff.toFixed(1)} kg</div>
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
            <span class="history-date">${formatDisplay(record.datetime)}</span>
            <span class="history-weight">${record.weight.toFixed(1)} kg</span>
            <button class="delete-btn" data-datetime="${record.datetime}">削除</button>
        `;
        historyList.appendChild(li);
    });
    historyList.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteRecord(btn.dataset.datetime));
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

    const data = records.map(r => ({ x: new Date(r.datetime).getTime(), y: r.weight }));

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
                        displayFormats: {
                            hour: 'M/d HH:mm',
                            day: 'M/d',
                            week: 'M/d',
                            month: 'yyyy/M'
                        },
                        tooltipFormat: 'yyyy/MM/dd HH:mm'
                    },
                    title: { display: true, text: '日時' }
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

function exportRecords() {
    const records = loadRecords();
    if (records.length === 0) {
        showMessage('記録がありません', 'error');
        return;
    }
    const payload = {
        app: 'weight-tracker',
        version: 1,
        exportedAt: new Date().toISOString(),
        records
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    a.href = url;
    a.download = `weight-records-${stamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showMessage(`${records.length}件をエクスポートしました`);
}

function importRecords(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const parsed = JSON.parse(e.target.result);
            const incoming = Array.isArray(parsed) ? parsed : parsed.records;
            if (!Array.isArray(incoming)) throw new Error('records 配列が見つかりません');

            const normalized = incoming.map(r => {
                const datetime = r.datetime || (r.date ? new Date(`${r.date}T12:00:00`).toISOString() : null);
                const weight = Number(r.weight);
                if (!datetime || isNaN(weight)) throw new Error('不正なレコードが含まれています');
                return { datetime, weight };
            });

            const existing = loadRecords();
            const map = new Map(existing.map(r => [r.datetime, r]));
            let added = 0;
            let updated = 0;
            normalized.forEach(r => {
                if (map.has(r.datetime)) {
                    if (map.get(r.datetime).weight !== r.weight) updated++;
                } else {
                    added++;
                }
                map.set(r.datetime, r);
            });
            const merged = [...map.values()].sort((a, b) => a.datetime.localeCompare(b.datetime));
            saveRecords(merged);
            showMessage(`インポート完了 (追加: ${added} / 更新: ${updated})`);
            render();
        } catch (err) {
            showMessage(`インポート失敗: ${err.message}`, 'error');
        }
    };
    reader.readAsText(file);
}

form.addEventListener('submit', (e) => {
    e.preventDefault();
    const datetimeValue = datetimeInput.value;
    const weight = parseFloat(weightInput.value);
    if (!datetimeValue || isNaN(weight) || weight <= 0) {
        showMessage('有効な日時と体重を入力してください', 'error');
        return;
    }
    const iso = new Date(datetimeValue).toISOString();
    addRecord(iso, weight);
    weightInput.value = '';
    datetimeInput.value = toLocalDatetimeInputValue(new Date());
});

nowBtn.addEventListener('click', () => {
    datetimeInput.value = toLocalDatetimeInputValue(new Date());
});

exportBtn.addEventListener('click', exportRecords);
importBtn.addEventListener('click', () => importFile.click());
importFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) importRecords(file);
    importFile.value = '';
});

datetimeInput.value = toLocalDatetimeInputValue(new Date());
render();
