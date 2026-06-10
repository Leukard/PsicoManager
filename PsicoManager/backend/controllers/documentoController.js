const supabase = require("../services/supabaseClient");
const PDFdocument = require("pdfkit");
const { PDFDocument: PDFLibDocument } = require("pdf-lib");
const signpdf = require("node-signpdf").default;

// Templates de documentos
const templates = {
    recibo: {
        titulo: "Recibo de Pagamento",
        template: `
RECIBO DE PAGAMENTO

Recebi de: {{paciente_nome}}
CPF/CNPJ: {{paciente_cpf}}

A quantia de R$ {{valor}}, referente a {{servico}}

Data: {{data}}
Local: {{local}}

______________________________
Assinatura
        `
    },
    contrato: {
        titulo: "Contrato de Prestação de Serviços",
        template: `
CONTRATO DE PRESTAÇÃO DE SERVIÇOS PSICOLÓGICOS

Entre as partes:

CONTRATANTE: {{paciente_nome}}, {{paciente_documento}}
ENDEREÇO: {{paciente_endereco}}

CONTRATADA: PsicoManager - Serviços Psicológicos
CNPJ: XX.XXX.XXX/0001-XX

OBJETO DO CONTRATO:
Prestação de serviços psicológicos conforme plano contratado.

VALOR: R$ {{valor_plano}} ({{parcelas}} parcelas de R$ {{valor_parcela}})

PRAZO: {{duracao_meses}} meses

Data: {{data}}
Local: {{local}}

______________________________              ______________________________
Contratante                                    Contratada
        `
    },
    laudo: {
        titulo: "Laudo Psicológico",
        template: `
LAUDO PSICOLÓGICO

PACIENTE: {{paciente_nome}}
DATA DE NASCIMENTO: {{paciente_nascimento}}
DATA DA AVALIAÇÃO: {{data_avaliacao}}

OBJETIVO: {{objetivo}}

RESULTADOS:
{{conteudo}}

CONCLUSÃO:
{{conclusao}}

Data: {{data}}

______________________________
Psicólogo(a) Responsável
CRP: XX/XXXXX
        `
    }
};

async function criarDocumento(req, res) {
    try {
        const { paciente_id, tipo, titulo, conteudo, data_emissao, template_data } = req.body;

        if (!paciente_id || !tipo || !titulo) {
            return res.status(400).json({ erro: "Paciente, tipo e título são obrigatórios." });
        }

        let conteudoFinal = conteudo;

        // Se usar template, processar com dados
        if (template_data && templates[tipo]) {
            conteudoFinal = processarTemplate(tipo, template_data);
        }

        const { data, error } = await supabase
            .from("documentos")
            .insert([{
                paciente_id,
                tipo,
                titulo,
                conteudo: conteudoFinal,
                data_emissao: data_emissao || new Date().toISOString(),
                criado_por: req.session.usuario.id
            }])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (error) {
        console.error("Erro ao criar documento:", error);
        res.status(500).json({ erro: "Erro ao criar documento." });
    }
}

async function listarDocumentos(req, res) {
    try {
        const { paciente_id, tipo } = req.query;
        let query = supabase.from("documentos").select(`*, paciente:pacientes(nome), autor:usuarios(nome)`);

        if (paciente_id) query = query.eq("paciente_id", paciente_id);
        if (tipo) query = query.eq("tipo", tipo);

        const { data, error } = await query.order("data_emissao", { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error("Erro ao listar documentos:", error);
        res.status(500).json({ erro: "Erro ao buscar documentos." });
    }
}

async function obterDocumento(req, res) {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from("documentos")
            .select(`*, paciente:pacientes(*), autor:usuarios(nome)`)
            .eq("id", id)
            .single();

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error("Erro ao obter documento:", error);
        res.status(500).json({ erro: "Erro ao buscar documento." });
    }
}

// Modificar o atualizarDocumento para criar versão automaticamente
async function atualizarDocumento(req, res) {
    try {
        const { id } = req.params;
        const dadosNovos = req.body;

        // 1. Buscar estado atual para backup
        const { data: atual, error: fetchError } = await supabase
            .from("documentos")
            .select("*")
            .eq("id", id)
            .single();

        if (fetchError) throw fetchError;

        // 2. Salvar na tabela de versões
        const { error: versionError } = await supabase
            .from("documentos_versoes")
            .insert([{
                documento_id: id,
                titulo: atual.titulo,
                conteudo: atual.conteudo,
                tipo: atual.tipo,
                criado_por: req.session.usuario.id
            }]);

        if (versionError) console.error("Aviso: Falha ao criar backup de versão.");

        // 3. Atualizar com novos dados
        const { data, error } = await supabase
            .from("documentos")
            .update(dadosNovos)
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error("Erro ao atualizar documento:", error);
        res.status(500).json({ erro: "Erro ao atualizar documento." });
    }
}

async function deletarDocumento(req, res) {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from("documentos")
            .delete()
            .eq("id", id);

        if (error) throw error;
        res.json({ mensagem: "Documento excluído com sucesso." });
    } catch (error) {
        console.error("Erro ao excluir documento:", error);
        res.status(500).json({ erro: "Erro ao excluir documento." });
    }
}

/**
 * Helper para gerar o Buffer do PDF
 */
async function gerarBufferPDF(documento) {
    return new Promise((resolve, reject) => {
        const doc = new PDFdocument({ margin: 50 });
        const buffers = [];
        doc.on("data", buffers.push.bind(buffers));
        doc.on("end", () => resolve(Buffer.concat(buffers)));
        doc.on("error", reject);

        doc.fontSize(25).text(documento.titulo || "Sem título", { align: "center" });
        doc.moveDown();

        doc.fontSize(12);
        doc.text(`Paciente: ${documento.paciente?.nome || 'N/A'}`);
        doc.text(`Autor: ${documento.autor?.nome || 'N/A'}`);
        doc.text(`Data de Emissão: ${new Date(documento.data_emissao).toLocaleDateString('pt-BR')}`);
        doc.moveDown(2);

        doc.fontSize(14).text("Conteúdo:", { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(12).text(documento.conteudo || "Nenhum conteúdo registrado.");

        doc.end();
    });
}

async function gerarDocumentoPDF(req, res) {
    try {
        const { id } = req.params;

        // Buscar documento
        const { data: documento, error: docError } = await supabase
            .from("documentos")
            .select(`*, paciente:pacientes(*), autor:usuarios(*)`)
            .eq("id", id)
            .single();

        if (docError || !documento) {
            return res.status(404).json({ erro: "Documento não encontrado." });
        }

        const buffer = await gerarBufferPDF(documento);
        
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader('Content-Disposition', `attachment; filename="documento_${id}.pdf"`);
        res.send(buffer);

    } catch (error) {
        console.error("Erro ao gerar PDF:", error);
        res.status(500).json({ erro: "Erro ao gerar PDF." });
    }
}

/**
 * 2. SALVAR NO STORAGE
 * Gera o PDF e salva no Supabase Storage
 */
async function salvarNoStorage(req, res) {
    try {
        const { id } = req.params;

        // 1. Buscar dados do documento
        const { data: documento, error: docError } = await supabase
            .from("documentos")
            .select(`*, paciente:pacientes(nome)`)
            .eq("id", id)
            .single();

        if (docError || !documento) return res.status(404).json({ erro: "Documento não encontrado." });

        // 2. Gerar o Buffer do PDF
        const buffer = await gerarBufferPDF(documento);

        // 3. Upload para o Supabase Storage (Bucket 'documentos')
        const fileName = `doc_${id}_${Date.now()}.pdf`;
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('documentos')
            .upload(fileName, buffer, {
                contentType: 'application/pdf',
                upsert: true
            });

        if (uploadError) throw uploadError;

        // 4. Obter URL pública
        const { data: urlData } = supabase.storage
            .from('documentos')
            .getPublicUrl(fileName);

        const arquivo_url = urlData.publicUrl;

        // 5. Atualizar tabela de documentos com a URL
        const { error: updateError } = await supabase
            .from("documentos")
            .update({ arquivo_url })
            .eq("id", id);

        if (updateError) throw updateError;

        res.json({ mensagem: "Arquivo salvo com sucesso!", url: arquivo_url });
    } catch (error) {
        console.error("Erro ao salvar no storage:", error);
        res.status(500).json({ erro: "Erro ao salvar arquivo no armazenamento." });
    }
}

/**
 * 3. ASSINATURA DIGITAL
 * Aplica uma assinatura digital ao PDF (Placeholder lógico)
 */
async function assinarDocumento(req, res) {
    try {
        const { id } = req.params;
        // Em um cenário real, o certificado viria de um local seguro ou do corpo da requisição
        // const { certificadoP12, senha } = req.body; 

        const { data: documento, error: docError } = await supabase
            .from("documentos")
            .select(`*`)
            .eq("id", id)
            .single();

        if (docError || !documento) return res.status(404).json({ erro: "Documento não encontrado." });

        const pdfBuffer = await gerarBufferPDF(documento);

        // Lógica simplificada de assinatura com node-signpdf
        // Nota: Requer um certificado digital válido para funcionar na prática
        /*
        const signedPdfBuffer = signpdf.sign(
            pdfBuffer,
            certificadoP12Buffer,
            { password: senha }
        );
        */

        // Por enquanto, simulamos a marcação de assinado
        const { error: updateError } = await supabase
            .from("documentos")
            .update({ 
                assinado: true, 
                data_assinatura: new Date().toISOString() 
            })
            .eq("id", id);

        if (updateError) throw updateError;

        res.json({ mensagem: "Documento assinado digitalmente (Simulação)." });
    } catch (error) {
        console.error("Erro ao assinar documento:", error);
        res.status(500).json({ erro: "Erro ao processar assinatura digital." });
    }
}

/**
 * 4. VERSIONAMENTO
 */

// Listar versões de um documento
async function listarVersoes(req, res) {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from("documentos_versoes")
            .select("*")
            .eq("documento_id", id)
            .order("criado_em", { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error("Erro ao listar versões:", error);
        res.status(500).json({ erro: "Erro ao buscar histórico de versões." });
    }
}

// Restaurar uma versão anterior
async function restaurarVersao(req, res) {
    try {
        const { id, versaoId } = req.params;

        // 1. Buscar a versão desejada
        const { data: versao, error: vError } = await supabase
            .from("documentos_versoes")
            .select("*")
            .eq("id", versaoId)
            .single();

        if (vError || !versao) return res.status(404).json({ erro: "Versão não encontrada." });

        // 2. Backup da versão atual antes de restaurar
        const { data: atual } = await supabase.from("documentos").select("*").eq("id", id).single();
        await supabase.from("documentos_versoes").insert([{
            documento_id: id,
            titulo: atual.titulo,
            conteudo: atual.conteudo,
            tipo: atual.tipo,
            criado_por: req.session.usuario.id
        }]);

        // 3. Restaurar dados
        const { error: updateError } = await supabase
            .from("documentos")
            .update({
                titulo: versao.titulo,
                conteudo: versao.conteudo,
                tipo: versao.tipo
            })
            .eq("id", id);

        if (updateError) throw updateError;

        res.json({ mensagem: "Versão restaurada com sucesso." });
    } catch (error) {
        console.error("Erro ao restaurar versão:", error);
        res.status(500).json({ erro: "Erro ao restaurar versão." });
    }
}

async function listarTemplates(req, res) {
    try {
        const templatesList = Object.keys(templates).map(key => ({
            tipo: key,
            titulo: templates[key].titulo,
            campos_obrigatorios: extrairCamposTemplate(templates[key].template)
        }));

        res.json(templatesList);
    } catch (error) {
        console.error("Erro ao listar templates:", error);
        res.status(500).json({ erro: "Erro ao buscar templates." });
    }
}

function processarTemplate(tipo, dados) {
    if (!templates[tipo]) return '';

    let template = templates[tipo].template;

    // Substituir placeholders
    Object.keys(dados).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        template = template.replace(regex, dados[key] || '');
    });

    return template;
}

function extrairCamposTemplate(template) {
    const regex = /{{(\w+)}}/g;
    const campos = [];
    let match;

    while ((match = regex.exec(template)) !== null) {
        if (!campos.includes(match[1])) {
            campos.push(match[1]);
        }
    }

    return campos;
}

module.exports = {
    criarDocumento,
    listarDocumentos,
    obterDocumento,
    atualizarDocumento,
    deletarDocumento,
    gerarDocumentoPDF,
    salvarNoStorage,
    assinarDocumento,
    listarVersoes,
    restaurarVersao,
    listarTemplates
};
