// ─── Metrics widget (SRP) ───────────────────────────────────────────────────
// Mesmo HTML do dashboard.js original. Os valores ainda não são preenchidos
// pela API (funcionalidade incompleta identificada na auditoria) — mantido
// assim para não alterar comportamento; quando o backend expuser esses
// dados, basta popular os elementos `.metric-value` aqui.
export function getMetricsHTML() {
    return `
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-label">OS Abertas</div>
                <div class="metric-value"></div>
                <div class="metric-delta"></div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Faturamento do Mês</div>
                <div class="metric-value"></div>
                <div class="metric-delta"></div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Clientes Ativos</div>
                <div class="metric-value"></div>
                <div class="metric-delta"></div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Serviços no Catálogo</div>
                <div class="metric-value" id="metricServicos"></div>
                <div class="metric-delta"></div>
            </div>
        </div>
    `;
}
