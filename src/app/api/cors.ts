import Cors from "cors";
import { NextApiRequest, NextApiResponse } from "next";

// Define as origens permitidas para maior segurança
const allowedOrigins = [
  "https://seusite.com",
  "https://outrasite.com",
  "http://localhost:3000",
  "http://localhost:3000/home",
  "http://localhost:3000/controledepatrimonio",
  "http://localhost:3000/cadastrousuario",
  "http://localhost:3000/controleusuario",
  //  // Adicione o frontend local para desenvolvimento
];

// Configura o middleware CORS
export const corsMiddleware = Cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Origem não permitida pelo CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Métodos HTTP permitidos
  allowedHeaders: ["Content-Type", "Authorization"], // Cabeçalhos permitidos
});

// Função para executar middlewares no Next.js
export function runMiddleware(
  req: NextApiRequest,
  res: NextApiResponse,
  fn: Function
) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}