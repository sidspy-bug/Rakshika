import { useState } from "react";
import { Shield, Mail, Lock, ArrowRight } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { firebaseAuthService } from "../services/firebaseAuth";

export function LoginScreen() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");
    
    try {
      await firebaseAuthService.login(email, password);
      navigate("/");
    } catch (err: any) {
      console.error("Login Error:", err);
      setErrorMsg(err.message || "Failed to sign in. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center px-6 py-12 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-red-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-md mx-auto flex flex-col items-center">
        <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-[#b71c1c] rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/30 mb-8">
          <Shield className="w-10 h-10 text-white" strokeWidth={1.5} />
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 text-center mb-2">Welcome Back</h1>
        <p className="text-gray-500 text-center mb-10">Sign in to Rakshika to stay protected.</p>

        <form onSubmit={handleLogin} className="w-full space-y-5 bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
          
          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-600 border border-red-100 rounded-xl text-sm font-medium">
              {errorMsg}
            </div>
          )}

          <Input 
            icon={<Mail className="w-5 h-5" />} 
            label="Email Address" 
            type="email" 
            placeholder="Enter your email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required 
          />
          
          <div>
            <Input 
              icon={<Lock className="w-5 h-5" />} 
              label="Password" 
              type="password" 
              placeholder="Enter your password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
            <div className="flex justify-end mt-2">
              <a href="#" className="text-sm font-semibold text-[#D32F2F] hover:underline">Forgot password?</a>
            </div>
          </div>

          <Button type="submit" className="w-full mt-4 h-12 text-base font-bold shadow-red-500/20 shadow-lg" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign In"} <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          
          <Button 
            type="button" 
            variant="secondary" 
            className="w-full mt-3 h-12 text-base font-bold text-gray-700" 
            onClick={() => {
              localStorage.setItem("access_token", "demo-bypass-token");
              navigate("/");
            }}
          >
            Bypass Login (Demo Mode)
          </Button>
        </form>

        <p className="mt-8 text-gray-600 font-medium">
          Don't have an account?{" "}
          <Link to="/register" className="text-[#D32F2F] font-bold hover:underline">
            Register now
          </Link>
        </p>
      </div>
    </div>
  );
}
