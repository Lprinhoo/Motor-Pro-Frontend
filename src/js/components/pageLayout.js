// ─── Layout padrão de página do dashboard (DRY) ────────────────────────────
// Todas as seções (Serviços, Contatos, e futuramente Clientes, Veículos,
// Relatórios, Ordens de Serviço, Configurações...) devem montar sua tela
// com estes dois blocos, NESTA ORDEM, dentro de `dbContent.innerHTML`:
//
//   1) renderPageHeader({...})   -> <header class="top-bar">
//   2) renderPanelShell({...})   -> <section class="panel">
//
// Padrão fixado (não varie entre seções):
//   - A ação principal ("Novo X") e a busca (se houver) SEMPRE ficam no
//     cabeçalho da página (top-bar-actions), nunca dentro do painel.
//   - O painel (`.panel`) só contém título + hint (panel-title-group) e o
//     container do conteúdo dinâmico. Sem botões ali.
//
// Isso evita o problema de cada seção posicionar botões num lugar diferente.
// Para criar uma nova aba, basta importar as duas funções abaixo e seguir
// o mesmo esqueleto usado em servicosSection.js / contatosSection.js.

/**
 * Cabeçalho padrão de página (eyebrow + título + subtítulo + ações).
 * @param {Object} opts
 * @param {string} opts.eyebrow - Rótulo pequeno acima do título (ex: "VISÃO GERAL").
 * @param {string} opts.title - Título da página (ex: "Serviços").
 * @param {string} opts.subtitle - Linha de descrição abaixo do título.
 * @param {string} [opts.searchInputId] - Se definido, renderiza uma busca com este id.
 * @param {string} [opts.searchPlaceholder] - Placeholder da busca.
 * @param {string} [opts.primaryActionId] - Se definido, renderiza o botão de ação principal com este id.
 * @param {string} [opts.primaryActionLabel] - Texto do botão de ação principal.
 * @param {string} [opts.primaryActionIcon] - Classe do ícone tabler (sem o prefixo "ti"), ex: "ti-plus".
 */
export function renderPageHeader({
    eyebrow,
    title,
    subtitle,
    searchInputId = null,
    searchPlaceholder = 'Buscar...',
    primaryActionId = null,
    primaryActionLabel = '',
    primaryActionIcon = 'ti-plus',
}) {
    return `
        <header class="top-bar">
            <div>
                <div class="page-eyebrow">${eyebrow}</div>
                <h2 class="page-title">${title}</h2>
                <div class="page-subtitle">${subtitle}</div>
            </div>
            <div class="top-bar-actions">
                ${searchInputId ? `
                <div class="search-box">
                    <i class="ti ti-search"></i>
                    <input type="text" id="${searchInputId}" placeholder="${searchPlaceholder}">
                </div>` : ''}
                ${primaryActionId ? `
                <button class="btn-action primary" id="${primaryActionId}">
                    <i class="ti ${primaryActionIcon}"></i> ${primaryActionLabel}
                </button>` : ''}
            </div>
        </header>
    `;
}

/**
 * Esqueleto padrão de painel de conteúdo (título + hint + container dinâmico).
 * @param {Object} opts
 * @param {string} opts.title - Título do painel (ex: "SERVIÇOS DISPONÍVEIS").
 * @param {string} opts.hint - Linha de descrição do painel.
 * @param {string} opts.bodyId - Id do container onde o conteúdo dinâmico será renderizado.
 * @param {string} [opts.bodyClass] - Classe do container dinâmico (grid padrão de cards).
 */
export function renderPanelShell({
    title,
    hint,
    bodyId,
    bodyClass = 'service-panels-grid',
}) {
    return `
        <section class="panel">
            <div class="panel-title-group">
                <div>
                    <div class="panel-title">${title}</div>
                    <div class="panel-hint">${hint}</div>
                </div>
            </div>
            <div id="${bodyId}" class="${bodyClass}">
                <!-- Renderizado dinamicamente pela seção -->
            </div>
        </section>
    `;
}
