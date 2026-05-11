import React from 'react';
import { User as UserIcon } from 'lucide-react';
import { AppUser } from '../../types';

interface YearbookPreviewProps {
  user: Partial<AppUser>;
  className?: string;
}

export default function YearbookPreview({ user, className }: YearbookPreviewProps) {
  const achievements = user.achievements?.split('\n').filter(a => a.trim()) || [];

  return (
    <div className={`w-[360px] h-auto min-h-[540px] bg-white shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] rounded-sm p-8 flex flex-col items-center border border-gray-100 relative font-serif scale-90 origin-top ${className}`}>
      <div className="w-10 h-10 mb-4 grayscale opacity-40">
        <img src="https://upload.wikimedia.org/wikipedia/en/e/e2/Ateneo_de_Naga_University_logo.png" alt="University Logo" className="w-full h-full object-contain" />
      </div>
      
      <div className="text-center mb-8">
        <h2 className="text-[8px] font-bold tracking-[0.3em] uppercase text-gray-400 mb-1">Ateneo de Naga University</h2>
        <h3 className="text-[7px] font-medium tracking-[0.2em] uppercase text-gray-300">Class of {user.batch || '2026'}</h3>
      </div>

      <div className="w-56 h-72 border-8 border-double border-gray-200 mb-6 overflow-hidden bg-gray-50 p-2">
        <div className="w-full h-full overflow-hidden">
          {user.photoURL ? (
            <img src={user.photoURL} alt="Yearbook Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              <UserIcon className="h-16 w-16 text-gray-200" />
            </div>
          )}
        </div>
      </div>

      <div className="text-center w-full">
        <h1 className="text-[26px] font-bold text-[#0d1b2a] leading-tight mb-2 tracking-tighter">
          {user.displayName}
        </h1>
        <div className="h-0.5 w-12 bg-[#fbbd08] mx-auto mb-4" />
        
        <div className="space-y-1 mb-6">
          <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-[#1a237e]">{user.course ? (user.course.startsWith('Bachelor') ? user.course : `Bachelor of Science in ${user.course}`) : 'Bachelor of Science'}</p>
          <div className="h-[1px] w-8 bg-gray-100 mx-auto my-1" />
          <p className="text-[9px] font-medium text-gray-400 uppercase tracking-widest">{user.batch || 'Class of 2026'}</p>
        </div>

        <div className="relative px-4">
          <span className="absolute top-0 left-0 text-3xl text-[#fbbd08] opacity-30 leading-none">"</span>
          <p className="text-[12px] italic text-[#0d1b2a]/80 leading-relaxed py-3">
            {user.quote || 'This is where your inspirational quote will appear on the final printed page of the yearbook.'}
          </p>
          <span className="absolute bottom-0 right-0 text-3xl text-[#fbbd08] opacity-30 leading-none rotate-180">"</span>
        </div>

        {achievements.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-100 flex flex-wrap justify-center gap-2">
            {achievements.slice(0, 3).map((a, i) => (
              <span key={i} className="text-[8px] font-black uppercase tracking-widest text-[#85b27a] border border-[#85b27a]/20 px-2 py-1 rounded">
                {a}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
