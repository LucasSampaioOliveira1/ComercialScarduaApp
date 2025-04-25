"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, User, Lock, AlertCircle, Check } from "lucide-react";
import { motion } from "framer-motion";

export default function ForgotPassword() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [step, setStep] = useState(1); // 1: Username, 2: Senha atual, 3: Nova senha

  // Função para verificar usuário
  const handleVerifyUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/auth/reset-password?username=${encodeURIComponent(username)}`);
      const data = await res.json();
      
      setLoading(false);

      if (data.exists) {
        setSuccess("Usuário verificado com sucesso.");
        setStep(2); // Avança para a etapa de verificar senha atual
      } else {
        setError("Usuário não encontrado.");
      }
    } catch (err) {
      setLoading(false);
      setError("Erro ao verificar usuário. Tente novamente.");
    }
  };

  // Função para verificar senha atual
  const handleVerifyCurrentPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/verify-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          username,
          password: currentPassword 
        }),
      });

      const data = await res.json();
      setLoading(false);

      if (data.verified) {
        setSuccess("Senha verificada com sucesso.");
        setStep(3); // Avança para a etapa de definir nova senha
      } else {
        setError("Senha atual incorreta.");
      }
    } catch (err) {
      setLoading(false);
      setError("Erro ao verificar senha. Tente novamente.");
    }
  };

  // Função para redefinir a senha
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    if (newPassword.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (newPassword === currentPassword) {
      setError("A nova senha deve ser diferente da senha atual.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          username,
          currentPassword,
          newPassword 
        }),
      });

      const data = await res.json();
      setLoading(false);

      if (data.success) {
        setSuccess("Senha redefinida com sucesso!");
        setTimeout(() => {
          router.push("/"); // Redireciona para a página de login
        }, 2000);
      } else {
        setError(data.error || "Erro ao redefinir senha.");
      }
    } catch (err) {
      setLoading(false);
      setError("Erro no servidor. Tente novamente mais tarde.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-md p-8">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm">
            <Image 
              src="/logo.png" 
              alt="Logo da Empresa" 
              width={70} 
              height={70}
              className="object-contain"
            />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-800 text-center mb-2">
          {step === 1 && "Recuperação de Senha"}
          {step === 2 && "Verificação de Senha"}
          {step === 3 && "Nova Senha"}
        </h1>
        
        <p className="text-gray-600 text-center mb-6">
          {step === 1 && "Informe seu nome de usuário para recuperar sua senha"}
          {step === 2 && "Digite sua senha atual para verificação"}
          {step === 3 && "Defina sua nova senha"}
        </p>

        {/* Indicador de etapas */}
        <div className="flex items-center justify-center mb-8">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-[#344893] text-white' : 'bg-gray-200 text-gray-500'}`}>
            1
          </div>
          <div className={`w-12 h-1 ${step >= 2 ? 'bg-[#344893]' : 'bg-gray-200'}`}></div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-[#344893] text-white' : 'bg-gray-200 text-gray-500'}`}>
            2
          </div>
          <div className={`w-12 h-1 ${step >= 3 ? 'bg-[#344893]' : 'bg-gray-200'}`}></div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-[#344893] text-white' : 'bg-gray-200 text-gray-500'}`}>
            3
          </div>
        </div>

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

        {success && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-50 text-green-700 p-3 rounded-lg flex items-center mb-6"
          >
            <Check size={18} className="mr-2 flex-shrink-0" />
            <p className="text-sm">{success}</p>
          </motion.div>
        )}

        {/* Etapa 1: Verificação do Nome de Usuário */}
        {step === 1 && (
          <motion.form 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onSubmit={handleVerifyUsername}
            className="space-y-6"
          >
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Nome de Usuário
              </label>
              <div className="relative rounded-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User size={18} className="text-gray-400" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#344893] focus:border-[#344893] bg-white transition-all duration-200"
                  placeholder="Digite seu nome de usuário ou email"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
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
                  Verificando...
                </>
              ) : (
                "Continuar"
              )}
            </motion.button>
          </motion.form>
        )}

        {/* Etapa 2: Verificação da Senha Atual */}
        {step === 2 && (
          <motion.form 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onSubmit={handleVerifyCurrentPassword}
            className="space-y-6"
          >
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Senha Atual
              </label>
              <div className="relative rounded-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={18} className="text-gray-400" />
                </div>
                <input
                  id="currentPassword"
                  name="currentPassword"
                  type="password"
                  required
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#344893] focus:border-[#344893] bg-white transition-all duration-200"
                  placeholder="Digite sua senha atual"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="flex space-x-3">
              <motion.button
                type="button"
                onClick={() => setStep(1)}
                className="w-1/3 flex justify-center items-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 font-medium transition-colors duration-200"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <ArrowLeft size={18} className="mr-1" />
                Voltar
              </motion.button>

              <motion.button
                type="submit"
                disabled={loading}
                className="w-2/3 flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-white bg-[#344893] hover:bg-[#2c3c7c] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#344893] font-medium transition-colors duration-200 disabled:bg-gray-400"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Verificando...
                  </>
                ) : (
                  "Verificar"
                )}
              </motion.button>
            </div>
          </motion.form>
        )}

        {/* Etapa 3: Nova senha */}
        {step === 3 && (
          <motion.form 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onSubmit={handleResetPassword}
            className="space-y-6"
          >
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Nova senha
              </label>
              <div className="relative rounded-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={18} className="text-gray-400" />
                </div>
                <input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  required
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#344893] focus:border-[#344893] bg-white transition-all duration-200"
                  placeholder="Digite sua nova senha"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={6}
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirme a nova senha
              </label>
              <div className="relative rounded-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={18} className="text-gray-400" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#344893] focus:border-[#344893] bg-white transition-all duration-200"
                  placeholder="Confirme sua nova senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={6}
                />
              </div>
            </div>

            <div className="flex space-x-3">
              <motion.button
                type="button"
                onClick={() => setStep(2)}
                className="w-1/3 flex justify-center items-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 font-medium transition-colors duration-200"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <ArrowLeft size={18} className="mr-1" />
                Voltar
              </motion.button>

              <motion.button
                type="submit"
                disabled={loading}
                className="w-2/3 flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-white bg-[#344893] hover:bg-[#2c3c7c] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#344893] font-medium transition-colors duração-200 disabled:bg-gray-400"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Redefinindo...
                  </>
                ) : (
                  "Redefinir senha"
                )}
              </motion.button>
            </div>
          </motion.form>
        )}

        <div className="mt-8 text-center">
          <Link href="/" className="text-sm font-medium text-[#344893] hover:text-[#5a71bd] transition-colors flex items-center justify-center">
            <ArrowLeft size={16} className="mr-1" />
            Voltar para o login
          </Link>
        </div>
      </div>
    </div>
  );
}