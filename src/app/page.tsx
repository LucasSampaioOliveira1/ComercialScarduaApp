"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff, User, Lock, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });

      const data = await res.json();
      console.log("Resposta da API:", data);

      setLoading(false);

      if (res.ok) {
        // Limpar qualquer dado antigo de autenticação
        localStorage.clear();

        // Definir novo token e dados do usuário
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        // Pequeno atraso para garantir que o armazenamento foi atualizado
        setTimeout(() => {
          router.push("/home");
        }, 300);
      } else {
        setError(data.error || "Erro ao realizar login.");
      }
    } catch (err) {
      setLoading(false);
      console.error("Erro no servidor:", err);
      setError("Erro no servidor. Tente novamente mais tarde.");
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Lado esquerdo - Banner/Imagem decorativa */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#344893] relative overflow-hidden">
        <div className="absolute inset-0 bg-[#344893] opacity-90"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-[#344893] via-[#4a60aa] to-[#2c3c7c] opacity-90"></div>
        
        <div className="relative z-10 flex flex-col items-center justify-center h-full px-12 text-white">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="text-center"
          >
            {/* Logo com fundo branco circular para contraste */}
            <div className="w-44 h-44 bg-white rounded-full flex items-center justify-center shadow-lg mb-8 mx-auto">
              <Image 
                src="/logo.png" 
                alt="Logo da Empresa" 
                width={150} 
                height={150}
                className="object-contain"
              />
            </div>
            
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Controle de Patrimônio
            </h1>
            
            <p className="text-lg text-gray-100 mb-8 max-w-md">
              Gerencie seus ativos de forma eficiente e segura com nosso sistema completo
            </p>
            
            <div className="space-y-6 mt-12">
              <div className="flex items-center">
                <div className="p-2 bg-white rounded-full mr-4 shadow-md">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#344893" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 7h-9"></path>
                    <path d="M14 17H5"></path>
                    <circle cx="17" cy="17" r="3"></circle>
                    <circle cx="7" cy="7" r="3"></circle>
                  </svg>
                </div>
                <div className="text-left">
                  <h3 className="font-medium">Controle Total</h3>
                  <p className="text-sm text-gray-200">Gerenciamento completo de todos os patrimônios</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <div className="p-2 bg-white rounded-full mr-4 shadow-md">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#344893" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M12 6v6l4 2"></path>
                  </svg>
                </div>
                <div className="text-left">
                  <h3 className="font-medium">Eficiência</h3>
                  <p className="text-sm text-gray-200">Otimize seu tempo com processos automatizados</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <div className="p-2 bg-white rounded-full mr-4 shadow-md">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#344893" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                  </svg>
                </div>
                <div className="text-left">
                  <h3 className="font-medium">Monitoramento</h3>
                  <p className="text-sm text-gray-200">Acompanhe em tempo real o status dos seus ativos</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
        
        {/* Padrão decorativo */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#253577] to-transparent"></div>
        <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-[#5a71bd] rounded-full opacity-20"></div>
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-[#5a71bd] rounded-full opacity-20"></div>
      </div>
      
      {/* Lado direito - Formulário de login */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden flex justify-center mb-8">
            <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-md">
              <Image 
                src="/logo.png" 
                alt="Logo da Empresa" 
                width={110} 
                height={110}
                className="object-contain"
              />
            </div>
          </div>
          
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.6 }}
          >
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Bem-vindo</h2>
            <p className="text-gray-600 mb-8">Faça login para acessar o sistema</p>
            
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 text-red-700 p-3 rounded-lg flex items-center mb-6"
              >
                <AlertCircle size={18} className="mr-2 flex-shrink-0" />
                <p className="text-sm">{error}</p>
              </motion.div>
            )}
            
            <form className="space-y-6" onSubmit={handleLogin}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Nome de usuário
                </label>
                <div className="relative rounded-md">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User size={18} className="text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="text"
                    autoComplete="email"
                    required
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#344893] focus:border-[#344893] bg-white transition-all duration-200"
                    placeholder="Digite seu nome de usuário"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Senha
                  </label>
                  <Link href="/forgot-password" className="text-sm font-medium text-[#344893] hover:text-[#5a71bd] transition-colors">
                    Alterar senha
                  </Link>
                </div>
                <div className="relative rounded-md">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock size={18} className="text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#344893] focus:border-[#344893] bg-white transition-all duration-200"
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-gray-400 hover:text-gray-600 focus:outline-none"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>
              
              <motion.button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-white bg-[#344893] hover:bg-[#2c3c7c] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#344893] font-medium transition-colors duration-200 disabled:bg-gray-400"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Entrando...
                  </>
                ) : (
                  "Entrar no sistema"
                )}
              </motion.button>
              
              <div className="text-center mt-6">
                <span className="text-sm text-gray-600">Novo por aqui? </span>
                <Link href="/cadastrousuario" className="text-sm font-medium text-[#344893] hover:text-[#5a71bd] transition-colors">
                  Crie sua conta
                </Link>
              </div>
            </form>
          </motion.div>
          
          <div className="mt-12 text-center">
            <p className="text-xs text-gray-500">
              © {new Date().getFullYear()} Sistema de Controle de Patrimônio. Todos os direitos reservados.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
