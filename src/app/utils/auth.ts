import jwt from 'jsonwebtoken';

const SECRET_KEY = process.env.JWT_SECRET || 'bd0a3f00b453f0a4e3f64afd92c12777997044d1d00d8832cbd92b57f7f4899c';

export function verifyToken(token: string) {
  try {
    const decoded = jwt.verify(token, SECRET_KEY) as {
      id?: string;
      userId?: string;
      email: string;
      iat: number;
      exp: number;
    };
    
    console.log("Token verificado com detalhes:", {
      id: decoded.id,
      userId: decoded.userId,
      email: decoded.email
    });
    
    return decoded;
  } catch (error) {
    console.error("Erro na verificação do token:", error);
    return null;
  }
}

export function authenticateToken(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.split(" ")[1];

    if (!token) return null;

    const decoded = jwt.verify(token, SECRET_KEY) as any;
    return decoded.userId || decoded.id;
  } catch (error) {
    console.error("Erro na autenticação:", error);
    return null;
  }
}

// No componente Header, antes do upload
console.log("Token armazenado:", localStorage.getItem("token"));
const token = localStorage.getItem("token");
let tokenDecoded: any = null;
if (token) {
  tokenDecoded = JSON.parse(atob(token.split('.')[1]));
  console.log("Token decodificado:", tokenDecoded);
} else {
  console.error("Token não encontrado no localStorage.");
}
console.log("Token decodificado:", tokenDecoded);