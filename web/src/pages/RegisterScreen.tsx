import { useState, useRef } from "react";
import { Shield, User, Mail, Phone, Lock, HeartPulse, Activity, Users, ArrowRight, ArrowLeft, CheckCircle2, Camera, MapPin } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { api } from "../services/api";

export function RegisterScreen() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    password: "",
    bloodGroup: "",
    medicalConditions: "",
    allergies: "",
    homeLocation: "",
    workLocation: "",
    primaryContactName: "",
    primaryContactPhone: "",
    secondaryContactName: "",
    secondaryContactPhone: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 4) {
      setStep(step + 1);
    } else {
      setIsLoading(true);
      setErrorMsg("");
      try {
        // Step 1: Register User
        const authPayload = {
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
        };
        const response = await api.post("/auth/register", authPayload);
        const { accessToken } = response.data.tokens;
        localStorage.setItem("access_token", accessToken);
        
        // Step 2: (TODO) Save medical profile and contacts to user-service
        
        navigate("/");
      } catch (err: any) {
        console.error("Registration Error:", err);
        setErrorMsg(err.response?.data?.message || "Failed to register. Please check your details.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center px-6 py-12 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-red-50 to-gray-50" />
      
      <div className="relative z-10 w-full max-w-md mx-auto flex flex-col">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-[#b71c1c] rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/30">
            <Shield className="w-8 h-8 text-white" strokeWidth={1.5} />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">Create Account</h1>
        <p className="text-gray-500 text-center mb-8 text-sm">Provide your details to ensure your safety in emergencies.</p>

        {/* Progress Bar */}
        <div className="flex items-center justify-center gap-2 mb-8 px-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className={`h-2 flex-1 rounded-full transition-all duration-300 ${step >= i ? 'bg-[#D32F2F]' : 'bg-gray-200'}`} />
            </div>
          ))}
        </div>

        <form onSubmit={handleNext} className="w-full bg-white p-6 sm:p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 min-h-[400px] flex flex-col">
          
          {/* STEP 1: Personal Info & Photo */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300 flex-1">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-[#D32F2F]" /> Personal Details
              </h2>
              
              {/* Photo Upload */}
              <div className="flex flex-col items-center justify-center mb-4">
                <div 
                  className="w-24 h-24 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer overflow-hidden relative hover:bg-gray-50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {photoPreview ? (
                    <img src={photoPreview} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center text-gray-400">
                      <Camera className="w-6 h-6 mb-1" />
                      <span className="text-[10px] font-semibold uppercase">Add Photo</span>
                    </div>
                  )}
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
              </div>

              <Input icon={<User className="w-5 h-5" />} label="Full Name" type="text" name="fullName" placeholder="Jane Doe" value={formData.fullName} onChange={handleChange} required />
              <Input icon={<Phone className="w-5 h-5" />} label="Phone Number" type="tel" name="phone" placeholder="+91 9876543210" value={formData.phone} onChange={handleChange} required />
              <Input icon={<Mail className="w-5 h-5" />} label="Email Address" type="email" name="email" placeholder="jane@example.com" value={formData.email} onChange={handleChange} required />
              <Input icon={<Lock className="w-5 h-5" />} label="Password" type="password" name="password" placeholder="Create a strong password" value={formData.password} onChange={handleChange} required />
            </div>
          )}

          {/* STEP 2: Medical Profile */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300 flex-1">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <HeartPulse className="w-5 h-5 text-[#D32F2F]" /> Medical Profile
              </h2>
              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-sm font-semibold text-gray-700 ml-1">Blood Group (Critical)</label>
                <select name="bloodGroup" value={formData.bloodGroup} onChange={handleChange} className="flex h-12 w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D32F2F]" required>
                  <option value="">Select Blood Group</option>
                  <option value="A+">A+</option><option value="A-">A-</option>
                  <option value="B+">B+</option><option value="B-">B-</option>
                  <option value="O+">O+</option><option value="O-">O-</option>
                  <option value="AB+">AB+</option><option value="AB-">AB-</option>
                </select>
              </div>
              <Input icon={<Activity className="w-5 h-5" />} label="Medical Conditions (Optional)" type="text" name="medicalConditions" placeholder="e.g. Asthma, Diabetes" value={formData.medicalConditions} onChange={handleChange} />
              <Input icon={<Activity className="w-5 h-5" />} label="Allergies (Optional)" type="text" name="allergies" placeholder="e.g. Peanuts, Penicillin" value={formData.allergies} onChange={handleChange} />
            </div>
          )}

          {/* STEP 3: Locations */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300 flex-1">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#D32F2F]" /> Daily Routes
              </h2>
              <p className="text-xs text-gray-500 mb-4">This helps AI determine if you deviate from your normal safe routes.</p>
              
              <Input icon={<MapPin className="w-5 h-5" />} label="Home Location" type="text" name="homeLocation" placeholder="Your residential address" value={formData.homeLocation} onChange={handleChange} required />
              <Input icon={<MapPin className="w-5 h-5" />} label="Work / College Location" type="text" name="workLocation" placeholder="Where you travel daily" value={formData.workLocation} onChange={handleChange} required />
            </div>
          )}

          {/* STEP 4: Emergency Contacts */}
          {step === 4 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300 flex-1">
              <h2 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
                <Users className="w-5 h-5 text-[#D32F2F]" /> Emergency Contacts
              </h2>
              <p className="text-xs text-gray-500 mb-4">These contacts will be notified immediately during an SOS.</p>
              
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
                <p className="text-sm font-bold text-gray-700">Primary Contact</p>
                <Input type="text" name="primaryContactName" placeholder="Contact Name" value={formData.primaryContactName} onChange={handleChange} required />
                <Input type="tel" name="primaryContactPhone" placeholder="Contact Phone Number" value={formData.primaryContactPhone} onChange={handleChange} required />
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3 mt-4">
                <p className="text-sm font-bold text-gray-700">Secondary Contact (Optional)</p>
                <Input type="text" name="secondaryContactName" placeholder="Contact Name" value={formData.secondaryContactName} onChange={handleChange} />
                <Input type="tel" name="secondaryContactPhone" placeholder="Contact Phone Number" value={formData.secondaryContactPhone} onChange={handleChange} />
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-3 mt-8 pt-4 border-t border-gray-100">
            {step > 1 && (
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setStep(step - 1)}>
                <ArrowLeft className="w-5 h-5 mr-2" /> Back
              </Button>
            )}
            <Button type="submit" className={`flex-[2] ${step === 4 ? 'bg-green-600 hover:bg-green-700 shadow-green-500/20 focus-visible:ring-green-500' : ''}`} disabled={isLoading}>
              {isLoading ? "Creating Account..." : step === 4 ? <><CheckCircle2 className="w-5 h-5 mr-2" /> Finish Setup</> : <>Next Step <ArrowRight className="w-5 h-5 ml-2" /></>}
            </Button>
          </div>
        </form>

        <p className="mt-8 text-center text-gray-600 font-medium">
          Already have an account?{" "}
          <Link to="/login" className="text-[#D32F2F] font-bold hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
