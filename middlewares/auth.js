import jwt from "jsonwebtoken";

// ========================================================
// 1. VERIFY TOKEN (PARA API - HEADERS)
// Usada em: rotas protegidas do sistema (Dashboard, etc)
// ========================================================
export const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    
    if (!authHeader) {
        return res.status(401).json({ error: "Token não fornecido. Acesso negado." });
    }

    // O token vem no formato "Bearer <token>"
    const token = authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: "Formato de Token inválido (Esperado: Bearer <token>)." });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; 
        next();
    } catch (error) {
        return res.status(403).json({ error: "Token inválido ou expirado." });
    }
};

// ========================================================
// 2. VERIFY TEMP TOKEN (PARA LINKS - URL PARAMS OU QUERY)
// Usada em: validação de links temporários
// ========================================================
export const verifyTempToken = (req, res, next) => {
    // CORREÇÃO: Verifica se o token veio na Rota (:token) ou na Query (?t=...)
    const token = req.params.token || req.query.token || req.query.t;

    if (!token) {
        return res.status(401).json({ error: "Token não fornecido na URL." });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: "Token de link inválido ou expirado." });
    }
};

export const verifyFormToken = (req, res, next) => {
    // 1. Tenta ler do HEADER (Padrão para requisições AJAX/Axios)
    const authHeader = req.headers['authorization'];
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    }

    // 2. Se não encontrou no Header, tenta ler da Query (?t=...)
    if (!token) {
        // Se a sua query é 't' (req.query.t), use apenas req.query.t
        // Se for 'token' (req.query.token), use ele.
        token = req.query.token || req.query.t; 
    }

    if (!token) {
        return res.status(401).json({ error: "Token de autorização não encontrado (Header ou URL)." });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; 
        next();
    } catch (error) {
        return res.status(401).json({ error: "Token de formulário inválido ou expirado." });
    }
};