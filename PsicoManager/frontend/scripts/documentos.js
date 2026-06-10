/* ==========================================
   DOCUMENTOS - PsicoManager
   ========================================== */

function getLoginUrl(){
    if (window.location.pathname.includes('/pages/')) {
        return 'login.html';
    }
    return 'pages/login.html';
}

async function logout(){
    try{
        const res = await fetch('/logout', {
            method: 'POST'
        });

        if(!res.ok){
            throw new Error('Erro ao fazer logout');
        }

        window.location.href = getLoginUrl();

    }catch(error){
        console.error('Erro no logout:', error);
        alert('Erro ao sair do sistema');
    }
}

/* =========================
   VERIFICAR USUÁRIO LOGADO
========================= */
async function verificarUsuario(){
    try{
        const res = await fetch('/usuario-logado');

        if(!res.ok){
            throw new Error('Erro ao verificar sessão');
        }

        const data = await res.json();

        if(!data.logado){
            window.location.href = getLoginUrl();
            return;
        }

        const usuario = data.usuario;

        /* ===== NOME ===== */
        const nomeEl = document.getElementById('nomeUsuario');
        if(nomeEl){
            nomeEl.innerText = usuario.nome || "Usuário";
        }

        /* ===== FOTO ===== */
        const fotoEl = document.getElementById('fotoUsuario');
        if(fotoEl){
            fotoEl.src = usuario.foto
                ? usuario.foto
                : `https://ui-avatars.com/api/?name=${encodeURIComponent(usuario.nome || "User")}`;
        }

    }catch(error){
        console.error('Erro ao verificar usuário:', error);
        window.location.href = getLoginUrl();
    }
}

/* =========================
   CARREGAR PACIENTES
========================= */
async function carregarPacientes(){
    try{
        const res = await fetch('/api/pacientes');

        if(!res.ok){
            throw new Error('Erro ao buscar pacientes');
        }

        const pacientes = await res.json();

        const selects = [document.getElementById('pacienteDocumento')];

        selects.forEach(select => {
            if(!select) return;
            select.innerHTML = '<option disabled selected>Selecione o paciente...</option>';
            pacientes.forEach(paciente => {
                const option = document.createElement('option');
                option.value = paciente.id;
                option.textContent = paciente.nome;
                select.appendChild(option);
            });
        });

    }catch(error){
        console.error('Erro ao carregar pacientes:', error);
    }
}

/* =========================
   CARREGAR DOCUMENTOS
========================= */
async function carregarDocumentos(){
    try{
        const filtroTipo = document.getElementById('filtroTipo').value;
        let url = '/api/documentos';
        if (filtroTipo) {
            url += `?tipo=${filtroTipo}`;
        }

        const res = await fetch(url);

        if(!res.ok){
            throw new Error('Erro ao buscar documentos');
        }

        const documentos = await res.json();

        const lista = document.getElementById('listaDocumentos');
        if(!lista) return;

        if(documentos.length === 0){
            lista.innerHTML = '<p class="text-muted text-center my-4">Nenhum documento encontrado.</p>';
            atualizarContadoresDocumentos([]);
            return;
        }

        let html = '';
        documentos.forEach(documento => {
            const dataFormatada = new Date(documento.data_emissao).toLocaleDateString('pt-BR');
            const tipoBadge = getTipoBadge(documento.tipo);

            html += `
                <div class="card border-0 shadow-sm rounded-4 p-3 mb-3">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="flex-grow-1">
                            <h6 class="fw-bold mb-2">${documento.titulo}</h6>
                            <div class="d-flex gap-2 mb-2">
                                ${tipoBadge}
                                <span class="badge bg-light text-dark">${dataFormatada}</span>
                            </div>
                            <p class="text-muted small mb-2">
                                <i class="ph ph-user me-1"></i>
                                ${documento.paciente?.nome || 'Paciente não informado'}
                            </p>
                            <p class="text-muted small mb-0">${documento.conteudo.substring(0, 150)}${documento.conteudo.length > 150 ? '...' : ''}</p>
                        </div>
                        <div class="d-flex flex-column gap-2 ms-3">
                            <button class="btn btn-sm btn-outline-info" onclick="visualizarDocumento('${documento.id}')" title="Visualizar">
                                <i class="ph ph-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-success" onclick="gerarPDF('${documento.id}')" title="Gerar PDF">
                                <i class="ph ph-file-pdf"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="excluirDocumento('${documento.id}')" title="Excluir">
                                <i class="ph ph-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        lista.innerHTML = html;
        atualizarContadoresDocumentos(documentos);

    }catch(error){
        console.error('Erro ao carregar documentos:', error);
        const lista = document.getElementById('listaDocumentos');
        if(lista){
            lista.innerHTML = '<p class="text-muted text-center my-4">Erro ao carregar documentos.</p>';
        }
    }
}

function getTipoBadge(tipo) {
    const tipos = {
        'recibo': '<span class="badge bg-success">Recibo</span>',
        'contrato': '<span class="badge bg-warning text-dark">Contrato</span>',
        'laudo': '<span class="badge bg-info">Laudo</span>',
        'outros': '<span class="badge bg-secondary">Outro</span>'
    };
    return tipos[tipo] || '<span class="badge bg-secondary">Outro</span>';
}

function atualizarContadoresDocumentos(documentos) {
    document.getElementById('qtdTotalDocumentos').innerText = documentos.length;
    document.getElementById('qtdRecibos').innerText = documentos.filter(d => d.tipo === 'recibo').length;
    document.getElementById('qtdContratos').innerText = documentos.filter(d => d.tipo === 'contrato').length;
}

/* =========================
   CARREGAR TEMPLATES
========================= */
let templatesDisponiveis = {};
async function carregarTemplates(){
    try{
        const res = await fetch('/api/documentos/templates/listar');

        if(!res.ok){
            throw new Error('Erro ao buscar templates');
        }

        const templates = await res.json();
        templatesDisponiveis = {};

        templates.forEach(template => {
            templatesDisponiveis[template.tipo] = template;
        });

    }catch(error){
        console.error('Erro ao carregar templates:', error);
    }
}

/* =========================
   CRIAR DOCUMENTO
========================= */
async function criarDocumento() {
    const paciente_id = document.getElementById('pacienteDocumento').value;
    const tipo = document.getElementById('tipoDocumento').value;
    const titulo = document.getElementById('tituloDocumento').value;
    const data_emissao = document.getElementById('dataEmissaoDocumento').value;
    const usarTemplate = document.getElementById('usarTemplate').checked;
    const conteudo = document.getElementById('conteudoDocumento').value;

    if(!paciente_id || !tipo || !titulo){
        alert('Preencha todos os campos obrigatórios!');
        return;
    }

    let dadosFinais = {
        paciente_id,
        tipo,
        titulo,
        data_emissao,
        conteudo
    };

    // Se usar template, coletar dados dos campos
    if (usarTemplate && templatesDisponiveis[tipo]) {
        const templateData = {};
        const campos = templatesDisponiveis[tipo].campos_obrigatorios;

        campos.forEach(campo => {
            const elemento = document.getElementById(`campo_${campo}`);
            if (elemento) {
                templateData[campo] = elemento.value;
            }
        });

        dadosFinais.template_data = templateData;
    }

    try {
        const response = await fetch('/api/documentos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dadosFinais)
        });

        const data = await response.json();
        if(!response.ok) throw new Error(data.erro || 'Erro ao salvar');

        alert('Documento criado com sucesso!');
        bootstrap.Modal.getInstance(document.getElementById('modalNovoDocumento')).hide();
        document.getElementById('formDocumento').reset();
        document.getElementById('camposTemplate').style.display = 'none';
        carregarDocumentos();
    } catch (err) {
        alert(err.message);
    }
}

/* =========================
   EXCLUIR DOCUMENTO
========================= */
async function excluirDocumento(id) {
    if (!confirm('Tem certeza que deseja excluir este documento?')) return;

    try {
        const response = await fetch(`/api/documentos/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.erro || 'Erro ao excluir');
        }

        alert('Documento excluído com sucesso!');
        carregarDocumentos();
    } catch (err) {
        alert(err.message);
    }
}

/* =========================
   VISUALIZAR DOCUMENTO
========================= */
async function visualizarDocumento(id) {
    try {
        const res = await fetch(`/api/documentos/${id}`);
        const documento = await res.json();

        document.getElementById('tituloDocumentoModal').innerText = documento.titulo;
        document.getElementById('conteudoDocumentoModal').innerText = documento.conteudo;

        // Configurar botão de download
        const btnDownload = document.getElementById('btnBaixarPDF');
        btnDownload.onclick = () => gerarPDF(id);

        const modal = new bootstrap.Modal(document.getElementById('modalVisualizarDocumento'));
        modal.show();
    } catch (err) {
        alert('Erro ao visualizar documento: ' + err.message);
    }
}

/* =========================
   GERAR PDF
========================= */
async function gerarPDF(id) {
    try {
        const response = await fetch(`/api/documentos/${id}/pdf`);
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.erro || 'Erro ao gerar PDF');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `documento_${id}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
    } catch (err) {
        console.error(err);
        alert('Erro ao gerar PDF: ' + err.message);
    }
}

/* =========================
   CONTROLE DE TEMPLATE
========================= */
function configurarControleTemplate() {
    const usarTemplateCheckbox = document.getElementById('usarTemplate');
    const tipoDocumentoSelect = document.getElementById('tipoDocumento');
    const camposTemplateDiv = document.getElementById('camposTemplate');
    const templateFieldsDiv = document.getElementById('templateFields');

    function atualizarCamposTemplate() {
        const usarTemplate = usarTemplateCheckbox.checked;
        const tipo = tipoDocumentoSelect.value;

        if (usarTemplate && tipo && templatesDisponiveis[tipo]) {
            camposTemplateDiv.style.display = 'block';
            const campos = templatesDisponiveis[tipo].campos_obrigatorios;

            let html = '';
            campos.forEach(campo => {
                const label = campo.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                html += `
                    <div class="mb-3">
                        <label class="form-label small fw-semibold">${label}</label>
                        <input type="text" class="form-control" id="campo_${campo}" required>
                    </div>
                `;
            });

            templateFieldsDiv.innerHTML = html;
        } else {
            camposTemplateDiv.style.display = 'none';
            templateFieldsDiv.innerHTML = '';
        }
    }

    usarTemplateCheckbox.addEventListener('change', atualizarCamposTemplate);
    tipoDocumentoSelect.addEventListener('change', atualizarCamposTemplate);
}

/* =========================
   BUSCA E FILTROS
========================= */
function configurarBusca() {
    const buscaInput = document.getElementById('buscaDocumentos');
    const filtroTipo = document.getElementById('filtroTipo');

    if (buscaInput) {
        buscaInput.addEventListener('input', function() {
            const termo = this.value.toLowerCase();
            const cards = document.querySelectorAll('#listaDocumentos .card');

            cards.forEach(card => {
                const texto = card.textContent.toLowerCase();
                card.style.display = texto.includes(termo) ? '' : 'none';
            });
        });
    }

    if (filtroTipo) {
        filtroTipo.addEventListener('change', carregarDocumentos);
    }
}

/* =========================
   EVENTOS
========================= */
function iniciarEventos(){
    // Botão salvar documento
    const btnSalvar = document.getElementById('btnSalvarDocumento');
    if(btnSalvar){
        btnSalvar.addEventListener('click', criarDocumento);
    }

    // Botão gerar PDF
    const btnGerarPDF = document.getElementById('btnGerarPDF');
    if(btnGerarPDF){
        btnGerarPDF.addEventListener('click', () => {
            const id = document.getElementById('idDocumentoAtual')?.value; // Supondo que exista um campo com o ID atual
            if (id) {
                gerarPDF(id);
            } else {
                alert('Nenhum documento selecionado para gerar PDF.');
            }
        });
    }

    // Botões de logout
    const botoesLogout = document.querySelectorAll('.btn-logout');
    botoesLogout.forEach(btn => {
        btn.addEventListener('click', logout);
    });

    // Configurar controles
    configurarControleTemplate();
    configurarBusca();
}

/* =========================
   INICIALIZAÇÃO
========================= */
document.addEventListener('DOMContentLoaded', () => {
    verificarUsuario();
    carregarPacientes();
    carregarTemplates();
    carregarDocumentos();
    iniciarEventos();

    // Definir data padrão
    const hoje = new Date().toISOString().split('T')[0];
    document.getElementById('dataEmissaoDocumento').value = hoje;
});
