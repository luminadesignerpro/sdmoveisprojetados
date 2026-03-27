import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2, Mail, Lock, Sparkles, ShieldCheck, Zap, Star } from "lucide-react";
import { z } from "zod";
import logoSD from "@/assets/logo-sd.jpeg";

const emailSchema = z.string().email("Email inválido");
const passwordSchema = z.string().min(6, "Senha deve ter pelo menos 6 caracteres");

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) navigate("/");
      setCheckingAuth(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/");
      setCheckingAuth(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const validateForm = (): boolean => {
    try {
      emailSchema.parse(email);
    } catch {
      toast({ title: "Email inválido", variant: "destructive" });
      return false;
    }
    try {
      passwordSchema.parse(password);
    } catch {
      toast({ title: "Senha muito curta", variant: "destructive" });
      return false;
    }
    if (!isLogin && password !== confirmPassword) {
      toast({ title: "Senhas não conferem", variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast({ title: "Bem-vindo de volta!", description: "Acesso premium concedido." });
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast({ title: "Conta criada!", description: "Verifique seu email para ativação." });
      }
    } catch (error: any) {
      toast({ title: "Erro de Acesso", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-[#D4AF37]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#D4AF37]/5 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#D4AF37]/5 blur-[120px] rounded-full" />
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] pointer-events-none" />

      <div className="w-full max-w-lg relative z-10">
        {/* Luxury Card */}
        <div className="bg-[#111111] rounded-[4rem] p-10 md:p-16 shadow-2xl border border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#D4AF37]/10 to-transparent blur-2xl rounded-full" />
          
          {/* Logo Section */}
          <div className="flex flex-col items-center mb-12 text-center">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-[#D4AF37] to-[#b8952a] rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
              <div className="relative w-28 h-28 rounded-[2.5rem] overflow-hidden border-2 border-[#D4AF37]/30 shadow-2xl mb-6 bg-black">
                <img src={logoSD} alt="SD Móveis" className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700" />
              </div>
            </div>
            <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter mb-2">SD <span className="text-[#D4AF37]">Móveis</span></h1>
            <div className="flex items-center gap-3">
               <span className="h-px w-8 bg-white/10" />
               <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.4em] italic">Neural Core v4.0</p>
               <span className="h-px w-8 bg-white/10" />
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="email" className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-1">Identificação Elite</Label>
                <div className="relative group">
                  <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-700 group-focus-within:text-[#D4AF37] transition-colors" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="E-mail profissional"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-16 bg-white/5 border border-white/5 rounded-2xl pl-16 pr-6 text-white text-sm italic font-medium tracking-tight outline-none focus:border-[#D4AF37]/40 focus:ring-0 transition-all shadow-inner"
                    required
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="password" className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-1">Chave de Acesso</Label>
                <div className="relative group">
                  <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-700 group-focus-within:text-[#D4AF37] transition-colors" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Senha de segurança"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-16 bg-white/5 border border-white/5 rounded-2xl pl-16 pr-16 text-white text-sm italic font-medium tracking-tight outline-none focus:border-[#D4AF37]/40 focus:ring-0 transition-all shadow-inner"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-700 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {!isLogin && (
                <div className="space-y-3 animate-in slide-in-from-top-4 duration-500">
                  <Label htmlFor="confirmPassword" className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-1">Confirmar Chave</Label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-700" />
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Repita sua senha"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-16 bg-white/5 border border-white/5 rounded-2xl pl-16 pr-6 text-white text-sm italic font-medium tracking-tight outline-none focus:border-[#D4AF37]/40 focus:ring-0 transition-all shadow-inner"
                      required
                    />
                  </div>
                </div>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-18 rounded-[1.5rem] text-xs font-black uppercase tracking-[0.3em] bg-gradient-to-r from-[#D4AF37] to-[#b8952a] hover:scale-[1.02] active:scale-95 text-black shadow-2xl shadow-amber-500/10 transition-all italic"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                  Validando Credenciais...
                </>
              ) : isLogin ? (
                <div className="flex items-center gap-3">
                   <Zap className="w-5 h-5 fill-black" /> Acessar Cloud SD
                </div>
              ) : (
                <div className="flex items-center gap-3">
                   <Star className="w-5 h-5 fill-black" /> Criar Perfil de Elite
                </div>
              )}
            </Button>
          </form>

          {/* Toggle Action */}
          <div className="mt-12 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setConfirmPassword("");
              }}
              className="text-[10px] font-black uppercase tracking-widest text-gray-600 hover:text-[#D4AF37] transition-all"
            >
              {isLogin ? "Solicitar Novo Acesso Premium" : "Já possuo Chave de Acesso"}
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-12 flex flex-col items-center gap-4">
           <p className="text-[9px] text-gray-700 font-black uppercase tracking-[0.5em] italic">
             © 2026 SD MÓVEIS PROJETADOS • EXCELLENCE IN DESIGN
           </p>
           <div className="flex gap-6">
              <span className="w-1.5 h-1.5 rounded-full bg-white/5" />
              <span className="w-1.5 h-1.5 rounded-full bg-white/10" />
              <span className="w-1.5 h-1.5 rounded-full bg-white/5" />
           </div>
        </div>
      </div>
    </div>
  );
}
