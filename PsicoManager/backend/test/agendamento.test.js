// backend/test/agendamento.test.js

// Mock do Supabase — evita tocar no banco de verdade
jest.mock('../services/supabaseClient', () => ({
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
    order: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
}));

const supabase = require('../services/supabaseClient');

// ─────────────────────────────────────────
// Helpers para simular req e res do Express
// ─────────────────────────────────────────
function mockReq(body = {}, params = {}, session = {}) {
    return {
        body,
        params,
        session: {
            usuario: { id: 'usuario-teste-123', perfil: 'administrador' },
            ...session
        }
    };
}

function mockRes() {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json   = jest.fn().mockReturnValue(res);
    return res;
}

// ─────────────────────────────────────────
// TESTES
// ─────────────────────────────────────────
const { listarAgendamentos } = require('../controllers/agendamentoController');

describe('agendamentoController', () => {

    beforeEach(() => {
        jest.clearAllMocks(); // limpa mocks entre cada teste
    });

    // ── TESTE 1 ──────────────────────────
    test('listarAgendamentos retorna lista com sucesso', async () => {
        // Simula o que o Supabase devolveria
        supabase.order.mockResolvedValueOnce({
            data: [
                {
                    id: '1',
                    data_hora_inicio: '2026-06-01T10:00:00',
                    clientes: { nome: 'João Silva' },
                    status_agendamento: { nome: 'Confirmado' }
                }
            ],
            error: null
        });

        const req = mockReq();
        const res = mockRes();

        await listarAgendamentos(req, res);

        // Verifica que respondeu com a lista
        expect(res.json).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({ id: '1' })
            ])
        );
    });

    // ── TESTE 2 ──────────────────────────
    test('listarAgendamentos retorna erro 500 quando Supabase falha', async () => {
        supabase.order.mockResolvedValueOnce({
            data: null,
            error: { message: 'Erro de conexão' }
        });

        const req = mockReq();
        const res = mockRes();

        await listarAgendamentos(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ erro: expect.any(String) })
        );
    });

});

// Rode o npm test
//comando usado para instalação npm install --save-dev jest supertest