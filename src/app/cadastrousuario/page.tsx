"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { 
  User, Mail, Key, CreditCard, Upload, AlertCircle, 
  ArrowLeft, Eye, EyeOff, UserPlus 
} from "lucide-react";

export default function CadastroUsuario() {
  const [nome, setNome] = useState("");
  const [sobrenome, setSobrenome] = useState("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState("user");
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1); // Para dividir o cadastro em 2 etapas
  const router = useRouter();

  const formatCpf = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    return cleaned
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1-$2")
      .slice(0, 14);
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpf(formatCpf(e.target.value));
  };

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFoto(file);
      
      // Criar preview da imagem
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setFotoPreview(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const goToNextStep = () => {
    if (!nome || !sobrenome || !email) {
      setError("Por favor, preencha todos os campos obrigatórios.");
      return;
    }
    setStep(2);
    setError(null);
  };

  const goToPreviousStep = () => {
    setStep(1);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validação
    if (!nome || !sobrenome || !cpf || !email || !password) {
      setError("Por favor, preencha todos os campos obrigatórios.");
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("nome", nome);
      formData.append("sobrenome", sobrenome);
      formData.append("cpf", cpf);
      formData.append("email", email);
      formData.append("password", password);
      formData.append("role", role);
      if (foto) {
        formData.append("foto", foto);
      }

      const response = await fetch("/api/auth/register", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        // Animação de sucesso
        setTimeout(() => {
          router.push("/?success=cadastro");
        }, 1000);
      } else {
        setError(data.error || "Erro ao cadastrar usuário.");
      }
    } catch (error) {
      setError("Erro ao conectar com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Painel lateral - visível apenas em telas grandes */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#344893] relative overflow-hidden">
        <div className="absolute inset-0 bg-[#344893] opacity-90"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-[#344893] via-[#4a60aa] to-[#2c3c7c] opacity-90"></div>
        
        {/* Padrão decorativo */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#253577] to-transparent"></div>
        <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-[#5a71bd] rounded-full opacity-20"></div>
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-[#5a71bd] rounded-full opacity-20"></div>
        
        <div className="relative z-10 flex flex-col items-center justify-center h-full px-12 text-white">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="text-center"
          >
            {/* Logo com fundo branco circular */}
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
              Seja bem-vindo(a)!
            </h1>
            
            <p className="text-lg text-gray-100 mb-8 max-w-md">
              Crie sua conta para acessar o sistema de Controle de Patrimônio
            </p>
            
            <div className="bg-[#253577] bg-opacity-80 rounded-lg p-6 mt-8 shadow-lg border border-white/20">
              <h3 className="text-xl font-semibold mb-4 text-white">Vantagens do Cadastro</h3>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <div className="mr-3 mt-1 text-emerald-300">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5"></path>
                    </svg>
                  </div>
                  <span className="text-sm text-white">Acesso a todos os recursos do sistema</span>
                </li>
                <li className="flex items-start">
                  <div className="mr-3 mt-1 text-emerald-300">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5"></path>
                    </svg>
                  </div>
                  <span className="text-sm text-white">Gerenciamento completo de patrimônios</span>
                </li>
                <li className="flex items-start">
                  <div className="mr-3 mt-1 text-emerald-300">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5"></path>
                    </svg>
                  </div>
                  <span className="text-sm text-white">Geração de relatórios e documentos</span>
                </li>
              </ul>
            </div>
          </motion.div>
        </div>
      </div>
      
      {/* Formulário de cadastro */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Logo para telas pequenas */}
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
          
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-800">Criar Conta</h1>
            <p className="text-gray-600 mt-2">
              Preencha os dados abaixo para se cadastrar
            </p>
          </div>
          
          {/* Indicador de etapa */}
          <div className="flex justify-center mb-6">
            <div className="flex items-center">
              <div className={`rounded-full h-8 w-8 flex items-center justify-center ${step === 1 ? 'bg-[#344893] text-white' : 'bg-green-500 text-white'}`}>
                1
              </div>
              <div className={`h-1 w-10 ${step === 1 ? 'bg-gray-300' : 'bg-green-500'}`}></div>
              <div className={`rounded-full h-8 w-8 flex items-center justify-center ${step === 2 ? 'bg-[#344893] text-white' : 'bg-gray-300 text-gray-600'}`}>
                2
              </div>
            </div>
          </div>
          
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 text-red-700 p-3 rounded-lg mb-6 flex items-center"
            >
              <AlertCircle size={18} className="mr-2 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </motion.div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Etapa 1: Dados Básicos */}
            {step === 1 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-5"
              >
                <div>
                  <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-1">
                    Nome
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User size={18} className="text-gray-400" />
                    </div>
                    <input
                      id="nome"
                      name="nome"
                      type="text"
                      required
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#344893] focus:border-[#344893]"
                      placeholder="Digite seu nome"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="sobrenome" className="block text-sm font-medium text-gray-700 mb-1">
                    Sobrenome
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User size={18} className="text-gray-400" />
                    </div>
                    <input
                      id="sobrenome"
                      name="sobrenome"
                      type="text"
                      required
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#344893] focus:border-[#344893]"
                      placeholder="Digite seu sobrenome"
                      value={sobrenome}
                      onChange={(e) => setSobrenome(e.target.value)}
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Nome de usuário
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail size={18} className="text-gray-400" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="text"
                      required
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#344893] focus:border-[#344893]"
                      placeholder="Digite seu nome de usuário"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="pt-5">
                  <motion.button
                    type="button"
                    onClick={goToNextStep}
                    className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-white bg-[#344893] hover:bg-[#2c3c7c] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#344893] font-medium"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    Continuar
                  </motion.button>
                  
                  <div className="text-center mt-6">
                    <Link href="/" className="text-sm flex items-center justify-center text-gray-600 hover:text-[#344893] transition-colors">
                      <ArrowLeft size={16} className="mr-1" />
                      Voltar para o login
                    </Link>
                  </div>
                </div>
              </motion.div>
            )}
            
            {/* Etapa 2: Detalhes e finalização */}
            {step === 2 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-5"
              >
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Senha
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Key size={18} className="text-gray-400" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#344893] focus:border-[#344893]"
                      placeholder="Crie uma senha forte"
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
                
                <div>
                  <label htmlFor="cpf" className="block text-sm font-medium text-gray-700 mb-1">
                    CPF
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <CreditCard size={18} className="text-gray-400" />
                    </div>
                    <input
                      id="cpf"
                      name="cpf"
                      type="text"
                      required
                      maxLength={14}
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#344893] focus:border-[#344893]"
                      placeholder="000.000.000-00"
                      value={cpf}
                      onChange={handleCpfChange}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Foto de perfil <span className="text-gray-500 font-normal">(opcional)</span>
                  </label>
                  
                  <div className="flex items-center space-x-4">
                    <div className="relative h-16 w-16 overflow-hidden bg-gray-100 rounded-full flex items-center justify-center">
                      {fotoPreview ? (
                        <img 
                          src={fotoPreview} 
                          alt="Preview" 
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <User size={32} className="text-gray-400" />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="relative border border-gray-300 rounded-lg overflow-hidden">
                        <input
                          id="foto"
                          name="foto"
                          type="file"
                          accept="image/*"
                          onChange={handleFotoChange}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className="p-2 flex items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors">
                          <Upload size={18} className="text-gray-500 mr-2" />
                          <span className="text-sm text-gray-700">Escolher arquivo</span>
                        </div>
                      </div>
                      {foto && (
                        <p className="text-xs text-gray-500 mt-1 truncate">
                          {foto.name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="pt-6 space-y-4">
                  <motion.button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-white bg-[#344893] hover:bg-[#2c3c7c] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#344893] font-medium"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Cadastrando...
                      </>
                    ) : (
                      <>
                        <UserPlus size={18} className="mr-2" />
                        Finalizar Cadastro
                      </>
                    )}
                  </motion.button>
                  
                  <button
                    type="button"
                    onClick={goToPreviousStep}
                    className="w-full flex justify-center items-center py-3 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 font-medium"
                  >
                    <ArrowLeft size={18} className="mr-2" />
                    Voltar
                  </button>
                </div>
              </motion.div>
            )}
          </form>
          
          <div className="mt-10 text-center">
            <p className="text-xs text-gray-500">
              Ao se cadastrar, você concorda com os Termos de Uso e Política de Privacidade.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
