import { authFetch, API_BASE_URL, clearAuthData, getStoredValue } from './script.js';
import { showPopup, hidePopup } from './utils.js';
import { bootDone } from './boot.js';

// Converte minutos para string legível (ex: 90 → "1h 30min", 1440 → "1 dia")
function formatarTempo(minutos) {
    if (!minutos || isNaN(minutos) || minutos <= 0) return null;
    const dias  = Math.floor(minutos / 1440);
    const horas = Math.floor((minutos % 1440) / 60);
    const mins  = minutos % 60;
    const partes = [];
    if (dias)  partes.push(`${dias}d`);
    if (horas) partes.push(`${horas}h`);
    if (mins)  partes.push(`${mins}min`);
    return partes.join(' ');
}

// Escapa caracteres HTML para prevenir XSS
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Retorna o ícone Tabler apropriado para cada tipo de contato
function getContactIcon(tipo) {
    switch (tipo) {
        case 'WHATSAPP': return '<i class="ti ti-brand-whatsapp"></i>';
        case 'TELEFONE': return '<i class="ti ti-phone"></i>';
        case 'EMAIL':    return '<i class="ti ti-mail"></i>';
        case 'INSTAGRAM':return '<i class="ti ti-brand-instagram"></i>';
        case 'FACEBOOK': return '<i class="ti ti-brand-facebook"></i>';
        default:         return '<i class="ti ti-address-book"></i>'; // Ícone padrão
    }
}

// ─── Máscara de telefone: (99) 99999-9999 / (99) 9999-9999 ────────────────
function applyPhoneMask(value) {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) {
        return digits.replace(/^(\d{0,2})/, digits.length ? '($1' : '');
    }
    if (digits.length <= 6) {
        return digits.replace(/^(\d{2})(\d{0,4})/, '($1) $2');
    }
    if (digits.length <= 10) {
        return digits.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    }
    return digits.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
}

// ─── Formatação de usuário: garante @ no início, sem espaços ───────────────
function applyUsernameMask(value) {
    let v = value.replace(/\s/g, '');
    if (v && !v.startsWith('@')) v = '@' + v;
    return v;
}

// ─── Ajusta placeholder/máscara do campo "Valor" conforme o tipo escolhido ──
function configureContactValueField(tipo, inputEl) {
    if (!inputEl) return;

    // Remove handler de máscara anterior, se houver
    if (inputEl._maskHandler) {
        inputEl.removeEventListener('input', inputEl._maskHandler);
        inputEl._maskHandler = null;
    }

    switch (tipo) {
        case 'WHATSAPP':
        case 'TELEFONE':
            inputEl.placeholder = 'Ex: (99) 99999-9999';
            inputEl.setAttribute('inputmode', 'numeric');
            inputEl.maxLength = 15;
            inputEl._maskHandler = (e) => { e.target.value = applyPhoneMask(e.target.value); };
            inputEl.addEventListener('input', inputEl._maskHandler);
            inputEl.value = applyPhoneMask(inputEl.value);
            break;
        case 'EMAIL':
            inputEl.placeholder = 'Ex: contato@suaoficina.com';
            inputEl.removeAttribute('inputmode');
            inputEl.removeAttribute('maxlength');
            break;
        case 'INSTAGRAM':
        case 'FACEBOOK':
            inputEl.placeholder = 'Ex: @suaoficina';
            inputEl.removeAttribute('inputmode');
            inputEl.removeAttribute('maxlength');
            inputEl._maskHandler = (e) => { e.target.value = applyUsernameMask(e.target.value); };
            inputEl.addEventListener('input', inputEl._maskHandler);
            inputEl.value = applyUsernameMask(inputEl.value);
            break;
        default:
            inputEl.placeholder = 'Ex: (99) 99999-9999 ou @usuario';
            inputEl.removeAttribute('inputmode');
            inputEl.removeAttribute('maxlength');
    }
}

// ─── Valida o valor do contato de acordo com o tipo selecionado ────────────
function validateContactValue(tipo, valor) {
    switch (tipo) {
        case 'WHATSAPP':
        case 'TELEFONE': {
            const digits = valor.replace(/\D/g, '');
            if (digits.length < 10 || digits.length > 11) {
                return { valid: false, message: 'Informe um telefone válido com DDD, ex: (99) 99999-9999.' };
            }
            return { valid: true };
        }
        case 'EMAIL': {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
            if (!emailRegex.test(valor)) {
                return { valid: false, message: 'Informe um e-mail válido, ex: contato@suaoficina.com.' };
            }
            return { valid: true };
        }
        case 'INSTAGRAM':
        case 'FACEBOOK': {
            if (!/^@[A-Za-z0-9_.]{2,30}$/.test(valor)) {
                return { valid: false, message: 'Informe um usuário válido, ex: @suaoficina.' };
            }
            return { valid: true };
        }
        default:
            return { valid: true };
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn      = document.getElementById('logoutBtn');
    const addServiceBtn  = document.getElementById('addServiceBtn');
    const editServicesBtn = document.getElementById('editServicesBtn');
    const metricServicosEl = document.getElementById('metricServicos');
    const dbContent = document.querySelector('.db-content'); // Adicionado para acesso ao conteúdo principal

    const token     = getStoredValue('jwtToken');
    const oficinaId = localStorage.getItem('oficinaId');

    if (!token) {
        // Sem token → redireciona; boot fica até a nova página carregar
        window.location.href = 'index.html';
        return;
    }
    if (!oficinaId) {
        // Sem oficina → redireciona; boot fica até a nova página carregar
        window.location.href = 'register-oficina.html';
        return;
    }

    // Auth OK → aguarda um pouco antes de liberar o boot screen
    setTimeout(bootDone, 1800);

    const oficinaNome = localStorage.getItem('oficinaNome') || `Oficina #${escapeHtml(oficinaId)}`;
    document.getElementById('sbOficinaName').innerText = oficinaNome;
    const avatarEl = document.getElementById('sbOficinaAvatar');
    if (avatarEl) avatarEl.innerText = (oficinaNome.trim()[0] || 'O').toUpperCase();

    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            const page = item.dataset.page;

            // Limpa o conteúdo principal antes de renderizar a nova seção
            if (dbContent) dbContent.innerHTML = '';

            switch (page) {
                case 'dashboard':
                    // Recarrega o conteúdo original do dashboard (métricas e serviços)
                    renderDashboardContent();
                    carregarDados(); // Recarrega os serviços
                    break;
                case 'contatos':
                    renderContatosSection();
                    break;
                default:
                    const label = item.querySelector('span')?.innerText || item.innerText.trim();
                    showPopup('Em breve', `A seção "${escapeHtml(label)}" estará disponível em breve.`);
                    break;
            }
        });
    });

    logoutBtn.addEventListener('click', () => {
        clearAuthData();
        window.location.href = 'index.html';
    });

    // Função para renderizar o conteúdo padrão do dashboard
    function renderDashboardContent() {
        if (!dbContent) return;
        dbContent.innerHTML = `
            <header class="top-bar">
                <div>
                    <div class="page-eyebrow">VISÃO GERAL</div>
                    <h2 class="page-title">Dashboard</h2>
                    <div class="page-subtitle">Resumo de atividades e serviços da oficina.</div>
                </div>
                <div class="top-bar-actions">
                    <div class="search-box">
                        <i class="ti ti-search"></i>
                        <input type="text" placeholder="Buscar serviço...">
                    </div>
                </div>
            </header>

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

            <section class="panel">
                <div class="panel-title-group">
                    <div>
                        <div class="panel-title">SERVIÇOS DISPONÍVEIS</div>
                        <div class="panel-hint">Catálogo de serviços que sua oficina oferece.</div>
                    </div>
                    <div class="panel-actions">
                        <button class="btn-action ghost" id="editServicesBtn">
                            <i class="ti ti-edit"></i> Editar
                        </button>
                        <button class="btn-action primary" id="addServiceBtn">
                            <i class="ti ti-plus"></i> Novo Serviço
                        </button>
                    </div>
                </div>
                <div id="servicePanelsContainer" class="service-panels-grid">
                    <!-- Renderizado pelo dashboard.js -->
                </div>
            </section>
        `;
        // Re-obter referências aos botões e elementos após re-renderizar o HTML
        const newAddServiceBtn = document.getElementById('addServiceBtn');
        if (newAddServiceBtn) newAddServiceBtn.addEventListener('click', handleAddService);
        const newEditServicesBtn = document.getElementById('editServicesBtn');
        if (newEditServicesBtn) {
            newEditServicesBtn.addEventListener('click', () => {
                showPopup('Funcionalidade em Desenvolvimento', 'A tela de edição de serviços está em construção.');
            });
        }
    }

    // ─── Seção de Contatos ────────────────────────────────────────────────────
    function renderContatosSection() {
        if (!dbContent) return;
        dbContent.innerHTML = `
            <header class="top-bar">
                <div>
                    <div class="page-eyebrow">GERENCIAMENTO</div>
                    <h2 class="page-title">Contatos da Oficina</h2>
                    <div class="page-subtitle">Gerencie as formas de contato da sua oficina.</div>
                </div>
                <div class="top-bar-actions">
                    <button class="btn-action primary" id="addContatoBtn">
                        <i class="ti ti-plus"></i> Adicionar Contato
                    </button>
                </div>
            </header>

            <section class="panel">
                <div class="panel-title-group">
                    <div>
                        <div class="panel-title">LISTA DE CONTATOS</div>
                        <div class="panel-hint">Adicione e edite os contatos que aparecerão para seus clientes.</div>
                    </div>
                </div>
                <div id="contatosListContainer" class="service-panels-grid">
                    <!-- Contatos serão renderizados aqui -->
                    <div class="empty-state">Nenhum contato cadastrado.</div>
                </div>
            </section>
        `;
        document.getElementById('addContatoBtn')?.addEventListener('click', handleAddContato);
        carregarContatos(); // Chama a função para carregar os contatos
    }

    // ─── Adicionar Contato ────────────────────────────────────────────────────
    async function handleAddContato() {
        const formHtml = `
            <p class="popup-subtitle">Adicione uma nova forma de contato para sua oficina.</p>
            <form id="add-contact-form" class="popup-form">
                <div class="field">
                    <label class="field-label">Tipo de Contato</label>
                    <div class="icon-selection-wrapper" id="contact-type-icons-wrapper">
                        <div class="icon-option" data-value="WHATSAPP" title="WhatsApp"><i class="ti ti-brand-whatsapp"></i></div>
                        <div class="icon-option" data-value="TELEFONE" title="Telefone"><i class="ti ti-phone"></i></div>
                        <div class="icon-option" data-value="EMAIL" title="E-mail"><i class="ti ti-mail"></i></div>
                        <div class="icon-option" data-value="INSTAGRAM" title="Instagram"><i class="ti ti-brand-instagram"></i></div>
                        <div class="icon-option" data-value="FACEBOOK" title="Facebook"><i class="ti ti-brand-facebook"></i></div>
                    </div>
                    <input type="hidden" id="contact-type-hidden" name="tipo" value="" required>
                </div>
                <div class="field">
                    <label class="field-label" for="contact-value">Valor</label>
                    <div class="input-wrap">
                        <input type="text" id="contact-value" class="input" placeholder="Ex: (99) 99999-9999 ou @usuario" required>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-secondary" id="cancel-add-contact">Cancelar</button>
                    <button type="submit" class="btn-primary">Adicionar</button>
                </div>
            </form>
        `;

        showPopup('Adicionar Contato', formHtml, false, true);

        const addContactForm = document.getElementById('add-contact-form');
        const cancelBtn = document.getElementById('cancel-add-contact');

        // --- Lógica para Seleção de Ícones ---
        const contactTypeIconsWrapper = document.getElementById('contact-type-icons-wrapper');
        const hiddenInput = document.getElementById('contact-type-hidden');
        const contactValueField = document.getElementById('contact-value');
        const iconOptions = contactTypeIconsWrapper.querySelectorAll('.icon-option');

        iconOptions.forEach(option => {
            option.addEventListener('click', () => {
                iconOptions.forEach(opt => opt.classList.remove('selected')); // Remove seleção de todos
                option.classList.add('selected'); // Adiciona seleção ao clicado
                hiddenInput.value = option.dataset.value; // Atualiza o valor do input hidden
                contactValueField.value = ''; // Limpa o valor ao trocar o tipo
                configureContactValueField(option.dataset.value, contactValueField); // Aplica máscara/placeholder do tipo
            });
        });
        // --- Fim da Lógica para Seleção de Ícones ---

        if (addContactForm) {
            addContactForm.addEventListener('submit', async (e) => {
                e.preventDefault();

                const tipo = hiddenInput.value; // Pega o valor do hidden input
                const valor = document.getElementById('contact-value').value.trim();

                if (!tipo) { // A validação do valor já está no HTML com 'required'
                    showPopup('Erro de Validação', 'Por favor, selecione o tipo de contato.', true);
                    return;
                }
                if (!valor) {
                    showPopup('Erro de Validação', 'Por favor, preencha o valor do contato.', true);
                    return;
                }

                const validacao = validateContactValue(tipo, valor);
                if (!validacao.valid) {
                    showPopup('Erro de Validação', validacao.message, true);
                    return;
                }

                try {
                    const response = await authFetch(`${API_BASE_URL}/oficinas/${oficinaId}/contatos`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ tipo, valor })
                    });

                    if (response.ok) {
                        hidePopup();
                        showPopup('Sucesso', 'Contato adicionado com sucesso!');
                        carregarContatos(); // Recarrega a lista de contatos
                    } else {
                        const errorText = await response.text();
                        let errorMessage = 'Erro ao adicionar contato.';
                        try {
                            const errorData = JSON.parse(errorText);
                            errorMessage = errorData.message || errorMessage;
                        } catch {
                            errorMessage = errorText || errorMessage;
                        }
                        showPopup('Erro', escapeHtml(errorMessage), true);
                    }
                } catch (error) {
                    showPopup('Erro de Conexão', 'Não foi possível conectar ao servidor ou erro inesperado.', true);
                }
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', hidePopup);
        }
    }

    // ─── Carregar Contatos ────────────────────────────────────────────────────
    async function carregarContatos() {
        const contatosListContainer = document.getElementById('contatosListContainer');
        if (!contatosListContainer) return;

        try {
            const response = await authFetch(`${API_BASE_URL}/oficinas/${oficinaId}/contatos`);
            if (response.ok) {
                const contatos = await response.json();
                renderizarContatos(Array.isArray(contatos) ? contatos : []); // Garante que seja sempre um array
            } else if (response.status === 204) {
                contatosListContainer.innerHTML = '<div class="empty-state">Nenhum contato cadastrado.</div>';
            } else {
                const errorText = await response.text();
                let errorMessage = 'Erro ao carregar contatos.';
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.message || errorMessage;
                } catch {
                    errorMessage = errorText || errorMessage;
                }
                showPopup('Erro', escapeHtml(errorMessage), true);
                contatosListContainer.innerHTML = '<div class="empty-state">Erro ao carregar contatos.</div>';
            }
        } catch (error) {
            showPopup('Erro de Conexão', 'Não foi possível conectar ao servidor para carregar contatos.', true);
            contatosListContainer.innerHTML = '<div class="empty-state">Erro de conexão.</div>';
        }
    }

    // ─── Renderizar Contatos ──────────────────────────────────────────────────
    function renderizarContatos(contatos) {
        const contatosListContainer = document.getElementById('contatosListContainer');
        if (!contatosListContainer) return;

        if (!contatos.length) {
            contatosListContainer.innerHTML = '<div class="empty-state">Nenhum contato cadastrado.</div>';
            return;
        }

        contatosListContainer.innerHTML = '';
        contatos.forEach(contato => {
            const contatoElement = document.createElement('div');
            contatoElement.className = 'service-panel contact-card'; // Adiciona uma nova classe para estilização específica
            contatoElement.innerHTML = `
                <div class="contact-card-header">
                    <div class="contact-icon">${getContactIcon(contato.tipo)}</div>
                    <h3 class="contact-type">${escapeHtml(contato.tipo)}</h3>
                </div>
                <p class="contact-value">${escapeHtml(contato.valor)}</p>
                <div class="service-actions">
                    <button class="btn-action ghost edit-contato-btn" data-id="${contato.id}">
                        <i class="ti ti-edit"></i> Editar
                    </button>
                    <button class="btn-action ghost delete-contato-btn" data-id="${contato.id}">
                        <i class="ti ti-trash"></i> Excluir
                    </button>
                </div>
            `;
            contatosListContainer.appendChild(contatoElement);

            contatoElement.querySelector('.edit-contato-btn')?.addEventListener('click', () => handleEditContato(contato.id, contato));
            contatoElement.querySelector('.delete-contato-btn')?.addEventListener('click', () => handleDeleteContato(contato.id, contato.valor));
        });
    }

    // ─── Editar Contato ───────────────────────────────────────────────────────
    async function handleEditContato(id, currentContato) {
        const formHtml = `
            <p class="popup-subtitle">Edite as informações do contato.</p>
            <form id="edit-contact-form" class="popup-form">
                <div class="field">
                    <label class="field-label">Tipo de Contato</label>
                    <div class="icon-selection-wrapper" id="edit-contact-type-icons-wrapper">
                        <div class="icon-option" data-value="WHATSAPP" title="WhatsApp"><i class="ti ti-brand-whatsapp"></i></div>
                        <div class="icon-option" data-value="TELEFONE" title="Telefone"><i class="ti ti-phone"></i></div>
                        <div class="icon-option" data-value="EMAIL" title="E-mail"><i class="ti ti-mail"></i></div>
                        <div class="icon-option" data-value="INSTAGRAM" title="Instagram"><i class="ti ti-brand-instagram"></i></div>
                        <div class="icon-option" data-value="FACEBOOK" title="Facebook"><i class="ti ti-brand-facebook"></i></div>
                    </div>
                    <input type="hidden" id="edit-contact-type-hidden" name="tipo" value="" required>
                </div>
                <div class="field">
                    <label class="field-label" for="edit-contact-value">Valor</label>
                    <div class="input-wrap">
                        <input type="text" id="edit-contact-value" class="input" placeholder="Ex: (99) 99999-9999 ou @usuario" required>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-secondary" id="cancel-edit-contact">Cancelar</button>
                    <button type="submit" class="btn-primary">Salvar</button>
                </div>
            </form>
        `;

        showPopup('Editar Contato', formHtml, false, true);

        const editContactForm = document.getElementById('edit-contact-form');
        const cancelBtn = document.getElementById('cancel-edit-contact');
        const contactValueField = document.getElementById('edit-contact-value');

        // --- Lógica para Seleção de Ícones ---
        const contactTypeIconsWrapper = document.getElementById('edit-contact-type-icons-wrapper');
        const hiddenInput = document.getElementById('edit-contact-type-hidden');
        const iconOptions = contactTypeIconsWrapper.querySelectorAll('.icon-option');

        // Inicializa o valor do hidden input e a seleção do ícone com base no currentContato
        if (currentContato && hiddenInput) {
            hiddenInput.value = currentContato.tipo;
            const selectedOption = Array.from(iconOptions).find(opt => opt.dataset.value === currentContato.tipo);
            if (selectedOption) {
                selectedOption.classList.add('selected');
            }
        }

        iconOptions.forEach(option => {
            option.addEventListener('click', () => {
                iconOptions.forEach(opt => opt.classList.remove('selected')); // Remove seleção de todos
                option.classList.add('selected'); // Adiciona seleção ao clicado
                hiddenInput.value = option.dataset.value; // Atualiza o valor do input hidden
                contactValueField.value = ''; // Limpa o valor ao trocar o tipo
                configureContactValueField(option.dataset.value, contactValueField); // Aplica máscara/placeholder do tipo
            });
        });
        // --- Fim da Lógica para Seleção de Ícones ---

        if (contactValueField) {
            contactValueField.value = currentContato.valor;
            configureContactValueField(hiddenInput.value, contactValueField); // Aplica máscara já no valor existente
        }

        if (editContactForm) {
            editContactForm.addEventListener('submit', async (e) => {
                e.preventDefault();

                const tipo = hiddenInput.value; // Pega o valor do hidden input
                const valor = document.getElementById('edit-contact-value').value.trim();

                if (!tipo) {
                    showPopup('Erro de Validação', 'Por favor, selecione o tipo de contato.', true);
                    return;
                }
                if (!valor) {
                    showPopup('Erro de Validação', 'Por favor, preencha o valor do contato.', true);
                    return;
                }

                const validacao = validateContactValue(tipo, valor);
                if (!validacao.valid) {
                    showPopup('Erro de Validação', validacao.message, true);
                    return;
                }

                try {
                    const response = await authFetch(`${API_BASE_URL}/oficinas/${oficinaId}/contatos/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ tipo, valor })
                    });

                    if (response.ok) {
                        hidePopup();
                        showPopup('Sucesso', 'Contato atualizado com sucesso!');
                        carregarContatos(); // Recarrega a lista de contatos
                    } else {
                        const errorText = await response.text();
                        let errorMessage = 'Erro ao atualizar contato.';
                        try {
                            const errorData = JSON.parse(errorText);
                            errorMessage = errorData.message || errorMessage;
                        } catch {
                            errorMessage = errorText || errorMessage;
                        }
                        showPopup('Erro', escapeHtml(errorMessage), true);
                    }
                } catch (error) {
                    showPopup('Erro de Conexão', 'Não foi possível conectar ao servidor ou erro inesperado.', true);
                }
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', hidePopup);
        }
    }

    // ─── Deletar Contato ──────────────────────────────────────────────────────
    async function handleDeleteContato(id, valor) {
        const confirmHtml = `
            <p class="confirm-text">
                Tem certeza que deseja excluir o contato<br>
                <strong>"${escapeHtml(valor)}"</strong>?<br>
                <span class="confirm-warning">Essa ação não pode ser desfeita.</span>
            </p>
            <div class="confirm-actions">
                <button id="cancel-delete-btn" class="btn-secondary">Cancelar</button>
                <button id="confirm-delete-btn" class="btn-danger">Excluir</button>
            </div>
        `;

        showPopup('Excluir Contato', confirmHtml, false, true); // Alterado para não fechar automaticamente

        document.getElementById('confirm-delete-btn')?.addEventListener('click', async () => {
            try {
                const response = await authFetch(`${API_BASE_URL}/oficinas/${oficinaId}/contatos/${id}`, {
                    method: 'DELETE'
                });

                if (response.ok || response.status === 204) {
                    hidePopup();
                    showPopup('Sucesso', 'Contato excluído com sucesso!');
                    carregarContatos(); // Recarrega a lista de contatos
                } else {
                    const errorText = await response.text();
                    let errorMessage = 'Erro ao excluir contato.';
                    try {
                        const errorData = JSON.parse(errorText);
                        errorMessage = errorData.message || errorMessage;
                    } catch {
                        errorMessage = errorText || errorMessage;
                    }
                    showPopup('Erro', escapeHtml(errorMessage), true);
                }
            } catch (error) {
                showPopup('Erro de Conexão', 'Não foi possível conectar ao servidor.', true);
            }
        });
        document.getElementById('cancel-delete-btn')?.addEventListener('click', hidePopup);
    }


    // ─── Adicionar serviço ────────────────────────────────────────────────────
    async function handleAddService() {
        const formHtml = `
            <p class="popup-subtitle">Preencha os dados para incluir um novo serviço no catálogo da sua oficina.</p>
            <form id="add-service-form" class="popup-form">
                <div class="field">
                    <label class="field-label" for="service-name">Nome do Serviço</label>
                    <div class="input-wrap">
                        <input type="text" id="service-name" class="input" placeholder="Ex: Troca de Óleo" required>
                    </div>
                </div>
                <div class="field">
                    <label class="field-label" for="service-description">Descrição</label>
                    <div class="input-wrap">
                        <textarea id="service-description" class="input" placeholder="Descreva o que esse serviço inclui..." minlength="10" maxlength="500" required></textarea>
                    </div>
                    <small id="service-description-counter" class="field-hint">0 / 500 (mínimo 10 caracteres)</small>
                </div>
                <div class="field-row">
                    <div class="field">
                        <label class="field-label" for="service-value">Valor</label>
                        <div class="input-wrap prefix-input">
                            <span>R$</span>
                            <input type="text" id="service-value" inputmode="numeric" placeholder="0,00" required>
                        </div>
                    </div>
                    <div class="field">
                        <label class="field-label" for="service-time">Tempo Médio</label>
                        <div class="input-wrap time-input-wrap">
                            <input type="text" id="service-time" inputmode="numeric" placeholder="60" required>
                            <select id="service-time-unit" class="time-unit-select">
                                <option value="min">min</option>
                                <option value="h">horas</option>
                                <option value="d">dias</option>
                            </select>
                        </div>
                        <small id="service-time-preview" class="field-hint time-preview"></small>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-secondary" id="cancel-add-service">Cancelar</button>
                    <button type="submit" class="btn-primary">Adicionar Serviço</button>
                </div>
            </form>
        `;

        showPopup('Adicionar Novo Serviço', formHtml, false, true);

        const addServiceForm = document.getElementById('add-service-form');
        const cancelBtn = document.getElementById('cancel-add-service');
        const descricaoField = document.getElementById('service-description');
        const descricaoCounter = document.getElementById('service-description-counter');
        const valorField = document.getElementById('service-value');

        if (descricaoField && descricaoCounter) {
            descricaoField.addEventListener('input', () => {
                const len = descricaoField.value.trim().length;
                descricaoCounter.innerText = `${len} / 500 (mínimo 10 caracteres)`;
                descricaoCounter.style.color = (len < 10 || len > 500) ? '#FF5252' : '';
            });
        }

        // Preview de tempo em tempo real
        const timeField    = document.getElementById('service-time');
        const timeUnit     = document.getElementById('service-time-unit');
        const timePreview  = document.getElementById('service-time-preview');

        function atualizarPreviewTempo() {
            const val  = parseInt(timeField?.value);
            const unit = timeUnit?.value;
            if (!val || isNaN(val) || val <= 0) { if (timePreview) timePreview.textContent = ''; return; }
            let minutos = val;
            if (unit === 'h') minutos = val * 60;
            if (unit === 'd') minutos = val * 1440;
            const fmt = formatarTempo(minutos);
            if (timePreview) timePreview.textContent = fmt ? `≈ ${fmt}` : '';
        }

        if (timeField)  {
            timeField.addEventListener('input', () => {
                // Remove qualquer caractere que não seja dígito (number input ainda permite e/+/-/.)
                const cleaned = timeField.value.replace(/\D/g, '');
                if (timeField.value !== cleaned) timeField.value = cleaned;
                atualizarPreviewTempo();
            });
            timeField.addEventListener('keydown', (e) => {
                if (['e', 'E', '+', '-', '.', ','].includes(e.key)) e.preventDefault();
            });
        }
        if (timeUnit)   timeUnit.addEventListener('change',  atualizarPreviewTempo);

        if (valorField) {
            valorField.addEventListener('input', () => {
                let digits = valorField.value.replace(/\D/g, '');
                digits = digits.replace(/^0+(?=\d)/, '');
                if (!digits) digits = '0';
                const cents = parseInt(digits, 10);
                const reais = Math.floor(cents / 100);
                const centavos = (cents % 100).toString().padStart(2, '0');
                const reaisFormatado = reais.toLocaleString('pt-BR');
                valorField.value = `${reaisFormatado},${centavos}`;
            });
            valorField.addEventListener('focus', () => {
                requestAnimationFrame(() => {
                    valorField.setSelectionRange(valorField.value.length, valorField.value.length);
                });
            });
        }

        if (addServiceForm) {
            addServiceForm.addEventListener('submit', async (e) => {
                e.preventDefault();

                const nome = document.getElementById('service-name').value.trim();
                const descricao = document.getElementById('service-description').value.trim();
                const valorStr = document.getElementById('service-value').value;
                const tempoVal  = parseInt(document.getElementById('service-time').value);
                const tempoUnit = document.getElementById('service-time-unit').value;

                // Converte tudo para minutos antes de enviar
                let tempoMedioEmMinutos = tempoVal;
                if (tempoUnit === 'h') tempoMedioEmMinutos = tempoVal * 60;
                if (tempoUnit === 'd') tempoMedioEmMinutos = tempoVal * 1440;

                const valor = parseFloat(valorStr.replace(/\./g, '').replace(',', '.'));

                if (!nome || isNaN(valor) || valor <= 0 || isNaN(tempoMedioEmMinutos) || tempoMedioEmMinutos <= 0) {
                    showPopup('Erro de Validação', 'Por favor, preencha todos os campos corretamente. Valor e Tempo Médio devem ser números positivos.', true);
                    return;
                }

                const DESCRICAO_MIN = 10;
                const DESCRICAO_MAX = 500;
                if (descricao.length < DESCRICAO_MIN || descricao.length > DESCRICAO_MAX) {
                    showPopup(
                        'Erro de Validação',
                        `A descrição deve ter entre ${DESCRICAO_MIN} e ${DESCRICAO_MAX} caracteres. Atualmente tem ${descricao.length}.`,
                        true
                    );
                    return;
                }

                const serviceData = { nome, descricao, valor, tempoMedioEmMinutos };

                try {
                    const response = await authFetch(`${API_BASE_URL}/servicos`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(serviceData)
                    });

                    if (response.ok) {
                        hidePopup();
                        showPopup('Sucesso', 'Serviço adicionado com sucesso!');
                        carregarDados();
                    } else {
                        const errorText = await response.text();
                        let errorMessage = 'Erro ao adicionar serviço.';
                        try {
                            const errorData = JSON.parse(errorText);
                            if (errorData.errors && typeof errorData.errors === 'object') {
                                errorMessage = Object.values(errorData.errors).join(' ');
                            } else if (errorData.message) {
                                errorMessage = errorData.message;
                            }
                        } catch {
                            errorMessage = errorText || errorMessage;
                        }
                        showPopup('Erro de Validação', escapeHtml(errorMessage), true);
                    }
                } catch (error) {
                    showPopup('Erro de Conexão', 'Não foi possível conectar ao servidor ou erro inesperado.', true);
                }
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', hidePopup);
        }
    }

    if (addServiceBtn) addServiceBtn.addEventListener('click', handleAddService);
    if (editServicesBtn) {
        editServicesBtn.addEventListener('click', () => {
            showPopup('Funcionalidade em Desenvolvimento', 'A tela de edição de serviços está em construção.');
        });
    }

    // Inicializa o dashboard com o conteúdo padrão
    renderDashboardContent();
    carregarDados();

    async function carregarDados() {
        try {
            const resServicos = await authFetch(`${API_BASE_URL}/servicos`);

            if (resServicos.ok) {
                const servicos = await resServicos.json();
                renderizarPaineisServicos(Array.isArray(servicos) ? servicos : []);
                if (metricServicosEl) metricServicosEl.innerText = (Array.isArray(servicos) ? servicos.length : 0).toString();
            } else if (resServicos.status === 204) {
                renderizarPaineisServicos([]);
                if (metricServicosEl) metricServicosEl.innerText = '0';
            } else {
                const errorText = await resServicos.text();
                let errorMessage = 'Erro ao carregar serviços. Tente novamente.';
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.message || errorMessage;
                } catch {
                    errorMessage = errorText || errorMessage;
                }
                showPopup('Erro', escapeHtml(errorMessage), true);
                renderizarPaineisServicos([]);
                if (metricServicosEl) metricServicosEl.innerText = '0';
            }
        } catch (error) {
            if (error.message !== 'Refresh Token inválido ou expirado') {
                showPopup('Erro de Conexão', 'Não foi possível conectar ao servidor ou erro inesperado.', true);
            }
            renderizarPaineisServicos([]);
            if (metricServicosEl) metricServicosEl.innerText = '0';
        }
    }

    function renderizarPaineisServicos(servicos) {
        const el = document.getElementById('servicePanelsContainer');
        if (!el) return;

        if (!Array.isArray(servicos)) {
            el.innerHTML = '<div class="empty-state">Erro ao carregar serviços. Formato de dados inesperado.</div>';
            if (metricServicosEl) metricServicosEl.innerText = '0';
            return;
        }

        if (!servicos.length) {
            el.innerHTML = '<div class="empty-state">Nenhum serviço cadastrado para exibir.</div>';
            return;
        }

        // Usa textContent / createElement para evitar XSS — dados da API não são confiáveis
        el.innerHTML = '';
        servicos.forEach(s => {
            const nome = s.nome ?? 'Serviço sem nome';
            const descricao = s.descricao ?? 'Sem descrição.';
            const valorBruto = s.valor ?? s.preco ?? s.valorServico ?? s.valorUnitario ?? s.price;
            const valor = parseFloat(valorBruto);
            const valorFinal = isNaN(valor) ? 0 : valor;
            const status = s.status ?? 'Disponível';
            const statusClass = status.toLowerCase().replace(/\s+/g, '-');

            const tempoBruto = s.tempoMedioEmMinutos ?? s.tempoMedioMinutos ?? s.tempoMedio ?? s.tempoEmMinutos ?? s.tempo ?? s.duration ?? s.estimatedTime ?? s.estimatedMinutes;

            const tempoFormatado = formatarTempo(tempoBruto);

            const article = document.createElement('article');
            article.className = 'service-panel';
            article.dataset.id = s.id;

            // Cabeçalho
            const head = document.createElement('div');
            head.className = 'service-panel-head';
            head.innerHTML = `
                <div class="service-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                    </svg>
                </div>
                <div class="service-actions">
                    <button class="btn-delete-service" type="button" title="Excluir serviço">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14H6L5 6"/>
                            <path d="M10 11v6M14 11v6"/>
                            <path d="M9 6V4h6v2"/>
                        </svg>
                    </button>
                </div>
            `;
            article.appendChild(head);

            // Título e descrição via textContent (seguro contra XSS)
            const h3 = document.createElement('h3');
            h3.textContent = nome;
            article.appendChild(h3);

            const p = document.createElement('p');
            p.textContent = descricao;
            article.appendChild(p);

            // Detalhes (agora sem o timeChip)
            const details = document.createElement('div');
            details.className = 'service-details';
            const priceSpan = document.createElement('span');
            priceSpan.className = 'price';
            priceSpan.innerHTML = `<small>R$</small>${valorFinal.toFixed(2).replace('.', ',')}`;
            details.appendChild(priceSpan);

            const statusSpan = document.createElement('span');
            statusSpan.className = `status ${statusClass}`;
            statusSpan.textContent = status;
            details.appendChild(statusSpan);
            article.appendChild(details); // Adiciona o div de detalhes ao article

            // Chip de tempo médio (agora um elemento separado, após os detalhes)
            const timeChip = document.createElement('span');
            timeChip.className = 'time-chip';
            const displayTempo = tempoFormatado ? tempoFormatado : 'Não informado';
            timeChip.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${displayTempo}`;
            article.appendChild(timeChip); // Adiciona o timeChip diretamente ao article

            // Botão OS
            const btnOs = document.createElement('button');
            btnOs.className = 'btn-add-service';
            btnOs.type = 'button';
            btnOs.innerHTML = '<i class="ti ti-plus"></i> Adicionar à OS';
            article.appendChild(btnOs);

            el.appendChild(article);

            // Evento de deletar
            head.querySelector('.btn-delete-service').addEventListener('click', () => {
                confirmarDelecao(s.id, nome);
            });
        });
    }

    // ─── Confirmação e deleção ────────────────────────────────────────────────
    function confirmarDelecao(id, nome) {
        const confirmHtml = `
            <p class="confirm-text">
                Tem certeza que deseja excluir o serviço<br>
                <strong></strong>?<br>
                <span class="confirm-warning">Essa ação não pode ser desfeita.</span>
            </p>
            <div class="confirm-actions">
                <button id="cancel-delete-btn" class="btn-secondary">Cancelar</button>
                <button id="confirm-delete-btn" class="btn-danger">Excluir</button>
            </div>
        `;

        showPopup('Excluir Serviço', confirmHtml, true, true);

        // Preenche o nome via textContent (seguro)
        document.querySelector('.confirm-text strong').textContent = `"${nome}"`;

        document.getElementById('confirm-delete-btn')?.addEventListener('click', async () => {
            try {
                const response = await authFetch(`${API_BASE_URL}/servicos/${id}`, {
                    method: 'DELETE'
                });

                if (response.ok || response.status === 204) {
                    hidePopup();
                    showPopup('Sucesso', 'Serviço excluído com sucesso!');
                    carregarDados();
                } else {
                    const errorText = await response.text();
                    let errorMessage = 'Erro ao excluir serviço.';
                    try {
                        const errorData = JSON.parse(errorText);
                        errorMessage = errorData.message || errorMessage;
                    } catch {
                        errorMessage = errorText || errorMessage;
                    }
                    showPopup('Erro', escapeHtml(errorMessage), true);
                }
            } catch (error) {
                showPopup('Erro de Conexão', 'Não foi possível conectar ao servidor.', true);
            }
        });
        document.getElementById('cancel-delete-btn')?.addEventListener('click', hidePopup);
    }

    async function deletarServico(id) {
        try {
            const response = await authFetch(`${API_BASE_URL}/servicos/${id}`, {
                method: 'DELETE'
            });

            if (response.ok || response.status === 204) {
                hidePopup();
                showPopup('Sucesso', 'Serviço excluído com sucesso!');
                carregarDados();
            } else {
                const errorText = await response.text();
                let errorMessage = 'Erro ao excluir serviço.';
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.message || errorMessage;
                } catch {
                    errorMessage = errorText || errorMessage;
                }
                showPopup('Erro', escapeHtml(errorMessage), true);
            }
        } catch (error) {
            showPopup('Erro de Conexão', 'Não foi possível conectar ao servidor.', true);
        }
    }
});