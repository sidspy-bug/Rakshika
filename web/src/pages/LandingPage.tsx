import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Bell, MapPin, HeartHandshake, PhoneCall } from 'lucide-react';
import './LandingPage.css';

export const LandingPage = () => {
  const navigate = useNavigate();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.2,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: "spring", stiffness: 100 }
    }
  };

  return (
    <div className="landing-container min-h-screen relative flex flex-col items-center justify-center p-6 text-gray-800">
      {/* Abstract Background Blobs */}
      <div className="bg-blob blob-1"></div>
      <div className="bg-blob blob-2"></div>
      <div className="bg-blob blob-3"></div>

      <motion.div 
        className="z-10 w-full max-w-4xl"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <header className="text-center mb-12 relative">
          <motion.div 
            className="inline-block mb-4 p-4 rounded-full bg-white/50 shadow-xl backdrop-blur-md floating-element"
            variants={itemVariants}
          >
            <Shield className="w-16 h-16 text-pink-600" />
          </motion.div>
          <motion.h1 
            className="text-6xl font-extrabold mb-4 tracking-tight"
            variants={itemVariants}
          >
            Welcome to <span className="text-gradient">Rakshika</span>
          </motion.h1>
          <motion.p 
            className="text-xl text-gray-600 font-medium max-w-2xl mx-auto"
            variants={itemVariants}
          >
            India's most intelligent women safety ecosystem. Empowering you to step out with confidence, knowing protection is just a tap or shake away.
          </motion.p>
        </header>

        {/* Feature Cards in 3D */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16 perspective-1000"
          variants={itemVariants}
        >
          <FeatureCard 
            icon={<PhoneCall className="w-8 h-8 text-pink-500" />}
            title="Instant SOS"
            description="Trigger SOS with a tap, shake, or voice command to alert authorities instantly."
            delay="floating-element"
          />
          <FeatureCard 
            icon={<MapPin className="w-8 h-8 text-purple-500" />}
            title="Safe Routing"
            description="AI-powered map guides you through the safest, well-lit routes."
            delay="floating-element-fast"
          />
          <FeatureCard 
            icon={<Bell className="w-8 h-8 text-rose-500" />}
            title="Smart Alerts"
            description="Automatic notifications sent to your trusted contacts with live location."
            delay="floating-element-delayed"
          />
          <FeatureCard 
            icon={<HeartHandshake className="w-8 h-8 text-fuchsia-500" />}
            title="Community"
            description="Connect with nearby responders and volunteers for immediate help."
            delay="floating-element"
          />
        </motion.div>

        {/* Action Buttons */}
        <motion.div 
          className="flex flex-col sm:flex-row items-center justify-center gap-6"
          variants={itemVariants}
        >
          <button 
            className="btn-3d px-10 py-4 text-lg font-bold min-w-[200px]"
            onClick={() => navigate('/register')}
          >
            Get Started
          </button>
          <button 
            className="btn-3d-secondary px-10 py-4 text-lg font-bold min-w-[200px] flex items-center justify-center bg-white"
            onClick={() => navigate('/login')}
          >
            <span className="relative z-10 text-gradient">Login</span>
          </button>
        </motion.div>

      </motion.div>
    </div>
  );
};

const FeatureCard = ({ icon, title, description, delay }: { icon: React.ReactNode, title: string, description: string, delay: string }) => {
  return (
    <div className={`glass-card-3d p-6 flex flex-col items-center text-center ${delay}`}>
      <div className="mb-4 p-3 rounded-2xl bg-white/60 shadow-inner">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-2 text-gray-800">{title}</h3>
      <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
};
