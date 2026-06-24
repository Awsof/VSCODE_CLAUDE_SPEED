/**
 * LoginScreenManager — Telas de Login e Primeiro Acesso
 * Renderiza UI e gerencia formulários de autenticação
 */

const LoginScreenManager = (() => {
  /**
   * Renderizar tela de login
   */
  const renderLoginScreen = () => {
    const container = document.getElementById('app') || document.body;
    if (container.id === 'app') container.classList.add('auth-mode');

    const html = `
      <div id="login-screen" style="display:flex;align-items:center;justify-content:center;height:100vh;background:#F8F9FA;">
        <div style="background:#FFFFFF;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.08);padding:40px;max-width:400px;width:100%;">
          
          <!-- Logo -->
          <div style="display:flex;flex-direction:column;align-items:center;text-align:center;margin-bottom:28px;gap:6px;">
            <img src="assets/logo.svg" alt="Grupo DB" class="login-logo-image" style="height:64px;margin-bottom:6px;" />
            <div style="font-size:0.95rem;font-weight:600;color:#1F2937;">Speed Teste DBSync</div>
            <div style="font-size:0.78rem;color:#6B7280;letter-spacing:0.1em;">Monitor de Performance</div>
          </div>

          <!-- Formulário -->
          <form id="login-form" style="display:flex;flex-direction:column;gap:16px;">
            
            <!-- Campo: Usuário -->
            <div>
              <label style="display:block;font-size:12px;font-weight:600;color:#1F2937;margin-bottom:6px;letter-spacing:0.05em;">
                Usuário
              </label>
              <input 
                id="login-username" 
                type="text" 
                placeholder="Seu nome de usuário"
                style="width:100%;padding:10px 12px;border:1px solid #E5E7EB;border-radius:6px;font-size:13px;font-family:'JetBrains Mono',monospace;outline:none;transition:border-color 160ms ease;"
                onkeypress="if(event.key==='Enter')document.getElementById('login-form').dispatchEvent(new Event('submit'))"
              />
            </div>

            <!-- Campo: Senha -->
            <div>
              <label style="display:block;font-size:12px;font-weight:600;color:#1F2937;margin-bottom:6px;letter-spacing:0.05em;">
                Senha
              </label>
              <input 
                id="login-password" 
                type="password" 
                placeholder="Sua senha"
                style="width:100%;padding:10px 12px;border:1px solid #E5E7EB;border-radius:6px;font-size:13px;font-family:'JetBrains Mono',monospace;outline:none;transition:border-color 160ms ease;"
                onkeypress="if(event.key==='Enter')document.getElementById('login-form').dispatchEvent(new Event('submit'))"
              />
            </div>

            <!-- Mensagem de erro -->
            <div id="login-error" style="display:none;padding:10px;background:#FEE2E2;border:1px solid #FCA5A5;border-radius:6px;color:#DC2626;font-size:12px;font-weight:500;"></div>

            <!-- Botão Entrar -->
            <button 
              type="submit" 
              style="padding:12px;background:#0F9B94;color:#FFFFFF;border:none;border-radius:6px;font-size:13px;font-weight:600;letter-spacing:0.05em;cursor:pointer;transition:background 160ms ease;font-family:'Inter',sans-serif;margin-top:8px;"
              onmouseover="this.style.background='#0D8A84'"
              onmouseout="this.style.background='#0F9B94'"
            >
              ENTRAR
            </button>

            <!-- Spinner de carregamento -->
            <div id="login-loading" style="display:none;text-align:center;font-size:12px;color:#6B7280;">
              Autenticando...
            </div>

          </form>

          <!-- Footer -->
          <div style="text-align:center;margin-top:20px;font-size:11px;color:#9CA3AF;letter-spacing:0.04em;">
            Speed Teste DBSync
          </div>

        </div>
      </div>
    `;

    container.innerHTML = html;
    _attachLoginFormListener();
  };

  /**
   * Renderizar tela de primeiro acesso (criar Admin)
   */
  const renderFirstAccessScreen = () => {
    const container = document.getElementById('app') || document.body;
    if (container.id === 'app') container.classList.add('auth-mode');

    const html = `
      <div id="first-access-screen" style="display:flex;align-items:center;justify-content:center;height:100vh;background:linear-gradient(135deg,#003761 0%,#0F9B94 100%);">
        <div style="background:#FFFFFF;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.12);padding:40px;max-width:450px;width:100%;">
          
          <!-- Logo -->
          <div style="display:flex;flex-direction:column;align-items:center;text-align:center;margin-bottom:24px;gap:6px;">
            <img src="assets/logo.svg" alt="Grupo DB" class="login-logo-image" style="height:64px;margin-bottom:6px;" />
            <div style="font-size:0.95rem;font-weight:600;color:#1F2937;">Speed Teste DBSync</div>
            <div style="font-size:0.78rem;color:#6B7280;letter-spacing:0.1em;">Configure a conta administradora</div>
          </div>

          <!-- Formulário -->
          <form id="first-access-form" style="display:flex;flex-direction:column;gap:16px;">
            
            <!-- Campo: Nome -->
            <div>
              <label style="display:block;font-size:12px;font-weight:600;color:#1F2937;margin-bottom:6px;letter-spacing:0.05em;">
                Nome Completo
              </label>
              <input 
                id="fa-name" 
                type="text" 
                placeholder="Ex: João Silva"
                style="width:100%;padding:10px 12px;border:1px solid #E5E7EB;border-radius:6px;font-size:13px;outline:none;transition:border-color 160ms ease;"
              />
            </div>

            <!-- Campo: Email -->
            <div>
              <label style="display:block;font-size:12px;font-weight:600;color:#1F2937;margin-bottom:6px;letter-spacing:0.05em;">
                Email
              </label>
              <input 
                id="fa-email" 
                type="email" 
                placeholder="Ex: joao@empresa.com"
                style="width:100%;padding:10px 12px;border:1px solid #E5E7EB;border-radius:6px;font-size:13px;outline:none;transition:border-color 160ms ease;"
              />
            </div>

            <!-- Campo: Usuário -->
            <div>
              <label style="display:block;font-size:12px;font-weight:600;color:#1F2937;margin-bottom:6px;letter-spacing:0.05em;">
                Nome de Usuário
              </label>
              <input 
                id="fa-username" 
                type="text" 
                placeholder="Ex: joao.silva"
                style="width:100%;padding:10px 12px;border:1px solid #E5E7EB;border-radius:6px;font-size:13px;font-family:'JetBrains Mono',monospace;outline:none;transition:border-color 160ms ease;"
              />
            </div>

            <!-- Campo: Senha -->
            <div>
              <label style="display:block;font-size:12px;font-weight:600;color:#1F2937;margin-bottom:6px;letter-spacing:0.05em;">
                Senha
              </label>
              <input 
                id="fa-password" 
                type="password" 
                placeholder="Mínimo 6 caracteres"
                style="width:100%;padding:10px 12px;border:1px solid #E5E7EB;border-radius:6px;font-size:13px;outline:none;transition:border-color 160ms ease;"
              />
            </div>

            <!-- Campo: Confirmar Senha -->
            <div>
              <label style="display:block;font-size:12px;font-weight:600;color:#1F2937;margin-bottom:6px;letter-spacing:0.05em;">
                Confirmar Senha
              </label>
              <input 
                id="fa-password-confirm" 
                type="password" 
                placeholder="Confirme sua senha"
                style="width:100%;padding:10px 12px;border:1px solid #E5E7EB;border-radius:6px;font-size:13px;outline:none;transition:border-color 160ms ease;"
              />
            </div>

            <!-- Mensagem de erro -->
            <div id="fa-error" style="display:none;padding:10px;background:#FEE2E2;border:1px solid #FCA5A5;border-radius:6px;color:#DC2626;font-size:12px;font-weight:500;"></div>

            <!-- Botão Criar Conta -->
            <button 
              type="submit" 
              style="padding:12px;background:#0F9B94;color:#FFFFFF;border:none;border-radius:6px;font-size:13px;font-weight:600;letter-spacing:0.05em;cursor:pointer;transition:background 160ms ease;font-family:'Inter',sans-serif;margin-top:8px;"
              onmouseover="this.style.background='#0D8A84'"
              onmouseout="this.style.background='#0F9B94'"
            >
              CRIAR CONTA ADMINISTRADORA
            </button>

            <!-- Spinner de carregamento -->
            <div id="fa-loading" style="display:none;text-align:center;font-size:12px;color:#6B7280;">
              Criando conta...
            </div>

          </form>

          <!-- Footer -->
          <div style="text-align:center;margin-top:20px;font-size:11px;color:#9CA3AF;letter-spacing:0.04em;">
            Essa conta receberá nível de administrador automaticamente
          </div>

        </div>
      </div>
    `;

    container.innerHTML = html;
    _attachFirstAccessFormListener();
  };

  /**
   * Listener para o formulário de login
   */
  const _tryServerLogin = async (usuario, senha) => {
    try {
      console.log('[LoginScreenManager] Tentando /api/login com usuário:', usuario);
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, senha })
      });

      console.log('[LoginScreenManager] /api/login status:', response.status);

      if (!response.ok) {
        console.warn('[LoginScreenManager] /api/login retornou status:', response.status);
        return null;
      }

      const result = await response.json();
      console.log('[LoginScreenManager] /api/login resultado:', { ok: result.ok, mode: result.mode });
      return result;
    } catch (error) {
      console.warn('[LoginScreenManager] Erro no /api/login:', error.message);
      return null;
    }
  };

  const _attachLoginFormListener = () => {
    const form = document.getElementById('login-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const username = document.getElementById('login-username').value.trim();
      const password = document.getElementById('login-password').value;
      const errorDiv = document.getElementById('login-error');
      const loadingDiv = document.getElementById('login-loading');
      const submitBtn = form.querySelector('button[type="submit"]');

      // Validações
      if (!username || !password) {
        errorDiv.textContent = 'Preencha todos os campos';
        errorDiv.style.display = 'block';
        return;
      }

      // Mostrar loading
      loadingDiv.style.display = 'block';
      submitBtn.disabled = true;
      errorDiv.style.display = 'none';

      try {
        const serverLogin = await _tryServerLogin(username, password);
        console.log('[LoginScreenManager] Server login response:', serverLogin);

        // Usar resultado da API somente se confirmou ok: true (env vars ou Turso)
        if (serverLogin?.ok === true) {
          console.log('[LoginScreenManager] Login via API bem-sucedido, mode:', serverLogin.mode);
          const apiUser = serverLogin.user || {
            id: 'api-user-' + username,
            nome: username,
            usuario: username.toLowerCase(),
            nivel: 'admin'
          };
          SessionManager.login(apiUser, serverLogin.token || null);
          setTimeout(() => {
            window.location.href = window.location.pathname;
          }, 500);
          return;
        }

        // Sempre tentar localStorage (usuarios criados no sistema)
        console.log('[LoginScreenManager] Tentando validar contra localStorage');
        const user = await UsersManager.validate(username, password);

        if (user) {
          // Login bem-sucedido
          console.log('[LoginScreenManager] Login localStorage bem-sucedido para:', username);
          SessionManager.login(user);

          // Redirecionar para app principal
          setTimeout(() => {
            window.location.href = window.location.pathname;
          }, 500);
        } else {
          // Credenciais inválidas
          console.log('[LoginScreenManager] Login falhou para:', username);
          errorDiv.textContent = 'Usuário ou senha incorretos';
          errorDiv.style.display = 'block';
          loadingDiv.style.display = 'none';
          submitBtn.disabled = false;
        }
      } catch (error) {
        console.error('Erro ao fazer login:', error);
        errorDiv.textContent = 'Erro ao conectar. Tente novamente.';
        errorDiv.style.display = 'block';
        loadingDiv.style.display = 'none';
        submitBtn.disabled = false;
      }
    });
  };

  /**
   * Listener para o formulário de primeiro acesso
   */
  const _attachFirstAccessFormListener = () => {
    const form = document.getElementById('first-access-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const name = document.getElementById('fa-name').value.trim();
      const email = document.getElementById('fa-email').value.trim();
      const username = document.getElementById('fa-username').value.trim();
      const password = document.getElementById('fa-password').value;
      const passwordConfirm = document.getElementById('fa-password-confirm').value;
      const errorDiv = document.getElementById('fa-error');
      const loadingDiv = document.getElementById('fa-loading');
      const submitBtn = form.querySelector('button[type="submit"]');

      // Validações
      if (!name || !email || !username || !password || !passwordConfirm) {
        errorDiv.textContent = 'Preencha todos os campos';
        errorDiv.style.display = 'block';
        return;
      }

      if (password.length < 6) {
        errorDiv.textContent = 'Senha deve ter no mínimo 6 caracteres';
        errorDiv.style.display = 'block';
        return;
      }

      if (password !== passwordConfirm) {
        errorDiv.textContent = 'As senhas não conferem';
        errorDiv.style.display = 'block';
        return;
      }

      // Validar email simples
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errorDiv.textContent = 'Email inválido';
        errorDiv.style.display = 'block';
        return;
      }

      // Mostrar loading
      loadingDiv.style.display = 'block';
      submitBtn.disabled = true;
      errorDiv.style.display = 'none';

      try {
        // Criar usuário admin
        const newUser = await UsersManager.create({
          nome: name,
          email: email,
          usuario: username,
          senha: password,
          nivel: 'admin'
        });

        if (newUser) {
          // Fazer login automaticamente
          SessionManager.login(newUser);
          
          // Redirecionar para app principal
          setTimeout(() => {
            window.location.href = window.location.pathname;
          }, 500);
        } else {
          errorDiv.textContent = 'Erro ao criar conta. Tente outro nome de usuário ou email.';
          errorDiv.style.display = 'block';
          loadingDiv.style.display = 'none';
          submitBtn.disabled = false;
        }
      } catch (error) {
        console.error('Erro ao criar conta:', error);
        errorDiv.textContent = 'Erro ao criar conta. Tente novamente.';
        errorDiv.style.display = 'block';
        loadingDiv.style.display = 'none';
        submitBtn.disabled = false;
      }
    });
  };

  const renderForcePasswordChange = (currentUser) => {
    const container = document.getElementById('app') || document.body;
    if (container.id === 'app') container.classList.add('auth-mode');

    container.innerHTML = `
      <div id="force-pw-screen" style="display:flex;align-items:center;justify-content:center;height:100vh;background:#F8F9FA;">
        <div style="background:#FFFFFF;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.08);padding:40px;max-width:400px;width:100%;">
          <div style="display:flex;flex-direction:column;align-items:center;text-align:center;margin-bottom:24px;gap:6px;">
            <img src="assets/logo.svg" alt="Grupo DB" style="height:52px;margin-bottom:6px;" />
            <div style="font-size:0.95rem;font-weight:600;color:#0F9B94;">Login realizado com sucesso!</div>
            <div style="font-size:0.9rem;font-weight:600;color:#1F2937;">Troca de Senha Obrigatória</div>
            <div style="font-size:0.78rem;color:#6B7280;max-width:320px;">
              Olá, <strong>${currentUser.usuario}</strong>! Seu acesso foi criado com uma senha temporária.
              Defina uma senha permanente para continuar.
            </div>
          </div>
          <form id="force-pw-form" style="display:flex;flex-direction:column;gap:16px;">
            <div>
              <label style="display:block;font-size:12px;font-weight:600;color:#1F2937;margin-bottom:6px;">Nova Senha</label>
              <input id="fpw-nova" type="password" placeholder="Mínimo 6 caracteres"
                style="width:100%;padding:10px 12px;border:1px solid #E5E7EB;border-radius:6px;font-size:13px;outline:none;" />
            </div>
            <div>
              <label style="display:block;font-size:12px;font-weight:600;color:#1F2937;margin-bottom:6px;">Confirmar Senha</label>
              <input id="fpw-confirma" type="password" placeholder="Repita a nova senha"
                style="width:100%;padding:10px 12px;border:1px solid #E5E7EB;border-radius:6px;font-size:13px;outline:none;" />
            </div>
            <div id="fpw-error" style="display:none;padding:10px;background:#FEE2E2;border:1px solid #FCA5A5;border-radius:6px;color:#DC2626;font-size:12px;font-weight:500;"></div>
            <button type="submit"
              style="padding:12px;background:#0F9B94;color:#FFFFFF;border:none;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;margin-top:4px;"
              onmouseover="this.style.background='#0D8A84'" onmouseout="this.style.background='#0F9B94'">
              SALVAR SENHA
            </button>
            <div id="fpw-loading" style="display:none;text-align:center;font-size:12px;color:#6B7280;">Salvando...</div>
          </form>
        </div>
      </div>
    `;

    const form = document.getElementById('force-pw-form');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nova     = document.getElementById('fpw-nova').value;
      const confirma = document.getElementById('fpw-confirma').value;
      const errDiv   = document.getElementById('fpw-error');
      const loadDiv  = document.getElementById('fpw-loading');
      const btn      = form.querySelector('button[type="submit"]');

      errDiv.style.display = 'none';
      if (nova.length < 6) {
        errDiv.textContent = 'A senha deve ter no mínimo 6 caracteres';
        errDiv.style.display = 'block'; return;
      }
      if (nova !== confirma) {
        errDiv.textContent = 'As senhas não conferem';
        errDiv.style.display = 'block'; return;
      }

      loadDiv.style.display = 'block';
      btn.disabled = true;

      try {
        const encoder = new TextEncoder();
        const hashBuf = await crypto.subtle.digest('SHA-256', encoder.encode(nova));
        const newHash = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2,'0')).join('');

        if (currentUser.id) {
          // Atualizar Turso PRIMEIRO — sem JWT, servidor valida via senhaTemporaria=1
          const apiRes = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ _selfChange: true, userId: currentUser.id, senhaHash: newHash })
          });

          if (!apiRes.ok) {
            const errBody = await apiRes.json().catch(() => ({}));
            errDiv.textContent = 'Erro ao salvar no servidor: ' + (errBody.error || 'status ' + apiRes.status) + '. Tente novamente.';
            errDiv.style.display = 'block';
            loadDiv.style.display = 'none';
            btn.disabled = false;
            return;
          }
          console.log('[ForceChange] Turso atualizado: senhaTemporaria=false e novo hash');
        }

        // Turso confirmado (ou sem token) — atualizar local e redirecionar
        await UsersManager.update(currentUser.id, { senha: nova, senhaTemporaria: false });
        SessionManager.clearSenhaTemporaria?.();
        window.location.href = window.location.pathname;
      } catch (err) {
        errDiv.textContent = 'Erro ao salvar senha: ' + err.message;
        errDiv.style.display = 'block';
        loadDiv.style.display = 'none';
        btn.disabled = false;
      }
    });
  };

  const _createDefaultAdmin = async () => {
    if (!UsersManager.isEmpty()) {
      return null;
    }

    console.log('[LoginScreenManager] Criando usuário admin padrão: admin/admin');
    return await UsersManager.create({
      nome: 'Administrador',
      email: 'admin@dbsync.local',
      usuario: 'Admin',
      senha: 'Admin',
      nivel: 'admin'
    });
  };

  /**
   * Mostrar tela apropriada (login ou primeiro acesso)
   */
  const show = () => {
    // Se há sessão ativa, não mostrar login
    if (SessionManager.isAuthenticated()) {
      console.log('[LoginScreenManager] Sessão ativa, não exibindo login');
      return false;
    }

    // Se não há usuários, criar conta admin padrão
    if (UsersManager.isEmpty()) {
      _createDefaultAdmin()
        .then((adminUser) => {
          if (adminUser) {
            console.log('[LoginScreenManager] Admin padrão criado com sucesso');
          }
          renderLoginScreen();
        })
        .catch((error) => {
          console.error('[LoginScreenManager] Falha ao criar Admin padrão:', error);
          renderFirstAccessScreen();
        });
    } else {
      console.log('[LoginScreenManager] Exibindo tela de login');
      renderLoginScreen();
    }

    return true;
  };

  return {
    show,
    renderLoginScreen,
    renderFirstAccessScreen,
    renderForcePasswordChange
  };
})();

