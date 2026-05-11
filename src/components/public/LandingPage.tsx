import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { ArrowRight, CheckCircle2, Clock, Layers, Calendar } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { AuthForm } from './AuthForm';

import { TriumphLogo } from '../ui/TriumphLogo';

export default function LandingPage() {
  
  return (
    <div className="min-h-screen bg-[#f3f4f6] text-[#111827] flex flex-col font-sans">
      {/* Minimal Header */}
      <header className="h-[80px] px-6 md:px-12 flex justify-between items-center bg-white border-b border-[#e5e7eb] sticky top-0 z-50">
        <div className="h-16">
          <TriumphLogo showText={true} className="h-full" />
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-6 md:px-12 py-12 md:py-20 grid md:grid-cols-2 gap-16 items-center">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#1a237e]/5 text-[#1a237e] rounded-full text-[10px] font-black mb-10 tracking-[0.1em] uppercase">
            <Clock className="h-3 w-3" />
            Submissions Open • Batch of 2026
          </div>
          <h1 className="text-5xl md:text-8xl font-black leading-[0.85] tracking-tighter mb-8 text-[#0d1b2a]">
            SECURE YOUR <br />
            <span className="text-[#1a237e] underline decoration-[#fbbd08] decoration-8 underline-offset-8">LEGACY.</span>
          </h1>
          <p className="text-base md:text-lg font-medium text-muted-foreground mb-10 max-w-md leading-relaxed">
            The high-performance portal for graduating seniors. Track requirements, schedule shoots, and finalize your yearbook layout with unparalleled precision.
          </p>
        </motion.div>

        {/* Auth Grid */}
        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-xl space-y-6">
            <div className="flex flex-col items-center gap-2 mb-2">
              <div className="h-16 w-16">
                <TriumphLogo showText={false} className="h-full w-full" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-black uppercase tracking-tight">Portal Access</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#1a237e]">Manage your legacy</p>
              </div>
            </div>
            
            <p className="text-xs text-gray-400 text-center">Sign in or create an account to access the yearbook portal.</p>

            <AuthForm />
        </div>
      </main>

      <footer className="p-8 border-t border-border mt-auto bg-white">
        <div className="max-w-7xl mx-auto flex flex-col md:row justify-between items-center gap-4">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
            TRIUMPH YEARBOOK PUBLISHING PORTAL v2.0.4 • BATCH 2026
          </p>
          <div className="flex gap-6 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            <span>Terms</span>
            <span>Security</span>
            <span>Support</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
