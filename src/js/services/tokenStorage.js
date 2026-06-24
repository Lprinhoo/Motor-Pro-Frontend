// ─── TokenStorage (DIP) ─────────────────────────────────────────────────────
// Abstrai a origem física do dado (localStorage vs sessionStorage) atrás de
// um contrato simples. Módulos de alto nível (AuthService, AuthApi) dependem
// desta abstração, não da Web Storage API diretamente — isso permite, no
// futuro, trocar a implementação (ex.: cookies httpOnly via backend) sem
// tocar em nenhuma regra de negócio.
//
// Mantém EXATAMENTE o mesmo contrato de chaves e o mesmo comportamento de
// fallback/"remember me" já usado pela aplicação — nenhuma chamada de API
// foi alterada por esta refatoração.

const AUTH_KEYS = Object.freeze([
    'jwtToken',
    'refreshToken',
    'rememberMe',
    'oficinaId',
    'oficinaNome',
]);

export class TokenStorage {
    /**
     * @param {Storage} persistent - storage usado quando "lembrar-me" está ativo (localStorage)
     * @param {Storage} ephemeral  - storage usado na sessão atual (sessionStorage)
     */
    constructor(persistent = window.localStorage, ephemeral = window.sessionStorage) {
        this.persistent = persistent;
        this.ephemeral = ephemeral;
    }

    isRemembered() {
        return this.persistent.getItem('rememberMe') === 'true';
    }

    getActiveStorage() {
        return this.isRemembered() ? this.persistent : this.ephemeral;
    }

    /** Busca em ambos os storages, sem confundir string vazia com "não encontrado" */
    get(key) {
        const value = this.persistent.getItem(key);
        return value !== null ? value : this.ephemeral.getItem(key);
    }

    /** Salva no storage correto e limpa o outro, evitando tokens "fantasma" */
    setAuthTokens({ accessToken, refreshToken } = {}, remember = this.isRemembered()) {
        const active = remember ? this.persistent : this.ephemeral;
        const other  = remember ? this.ephemeral : this.persistent;

        this.persistent.setItem('rememberMe', remember ? 'true' : 'false');

        if (accessToken !== undefined)  active.setItem('jwtToken', accessToken);
        if (refreshToken !== undefined) active.setItem('refreshToken', refreshToken || '');

        other.removeItem('jwtToken');
        other.removeItem('refreshToken');
    }

    setItem(key, value) {
        this.getActiveStorage().setItem(key, value);
    }

    /** Remove somente as chaves de autenticação/sessão conhecidas pela app */
    clearAuth() {
        AUTH_KEYS.forEach(key => {
            this.persistent.removeItem(key);
            this.ephemeral.removeItem(key);
        });
    }
}

// Instância única para manter compatibilidade simples de uso na aplicação,
// mas qualquer consumidor pode instanciar a sua própria (ex.: em testes,
// com storages em memória/mocks) — isso é o que viabiliza testabilidade (DIP).
export const tokenStorage = new TokenStorage();
