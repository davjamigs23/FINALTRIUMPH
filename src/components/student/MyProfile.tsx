import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { 
  User as UserIcon, Mail, Shield, GraduationCap, BookOpen, Calendar, CheckCircle2, Camera, Edit3, X, Save, Layers, Clock
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { doc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '../../firebase';

import FeedbackModal from '../ui/FeedbackModal';

export default function MyProfile() {
  const { user } = useAuth();
  const [activeProfileTab, setActiveProfileTab] = useState<'personal' | 'yearbook' | 'preview'>('personal');
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [feedback, setFeedback] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Local state for editing to avoid immediate Firestore writes during typing
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      setEditedValues({
        displayName: user.displayName || '',
        studentId: user.studentId || '',
        course: user.course || '',
        section: user.section || '',
        batch: user.batch || '2026',
        quote: user.quote || '',
        achievements: user.achievements || ''
      });
    }
  }, [user]);

  if (!user) return null;

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    try {
      const storageRef = ref(storage, `users/${user.uid}/profile.jpg`);
      await uploadBytes(storageRef, file);
      const photoURL = await getDownloadURL(storageRef);
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { photoURL });
      }
      await updateDoc(doc(db, 'users', user.uid), { photoURL });
      setFeedback({ title: 'Success', message: 'Profile photo updated successfully!', type: 'info', onClose: () => setFeedback(null) });
    } catch (error) {
      console.error(error);
      setFeedback({ title: 'Error', message: 'Failed to update profile photo.', type: 'error', onClose: () => setFeedback(null) });
    } finally {
      setIsUploading(false);
    }
  };

  const handleInputChange = (key: string, value: string) => {
    setEditedValues(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, editedValues);
      setIsEditing(false);
      setFeedback({ title: 'Success', message: 'Profile updated successfully!', type: 'info', onClose: () => setFeedback(null) });
    } catch (error) {
      console.error(error);
      setFeedback({ title: 'Error', message: 'Failed to update profile.', type: 'error', onClose: () => setFeedback(null) });
    }
  };

  const personalInfo = [
    { label: 'Full Name', key: 'displayName', value: editedValues.displayName, icon: <UserIcon className="h-4 w-4" /> },
    { label: 'Student ID', key: 'studentId', value: editedValues.studentId, icon: <GraduationCap className="h-4 w-4" /> },
    { label: 'Course', key: 'course', value: editedValues.course, icon: <BookOpen className="h-4 w-4" /> },
    { label: 'Section', key: 'section', value: editedValues.section, icon: <Layers className="h-4 w-4" /> },
    { label: 'Batch', key: 'batch', value: editedValues.batch, icon: <Calendar className="h-4 w-4" /> },
    { label: 'Email Address', value: user.email, icon: <Mail className="h-4 w-4" />, readonly: true },
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-[#0d1b2a]">My Profile</h1>
          <p className="text-sm text-gray-500 font-medium">Manage your personal information and yearbook settings.</p>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <button 
                onClick={() => setIsEditing(false)}
                className="flex items-center gap-2 px-6 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all font-sans"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
              <button 
                onClick={handleSaveProfile}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#85b27a] text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:shadow-xl transition-all font-sans"
              >
                <Save className="h-4 w-4" />
                Save Changes
              </button>
            </>
          ) : (
            <button 
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#1a237e] text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:shadow-xl transition-all font-sans"
            >
              <Edit3 className="h-4 w-4" />
              Edit Profile
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 gap-8">
        {[
          { id: 'personal', label: 'Personal Details' },
          { id: 'yearbook', label: 'Quotes & Achievements' },
          { id: 'preview', label: 'Yearbook Preview' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveProfileTab(tab.id as any)}
            className={cn(
              "pb-4 text-[11px] font-black uppercase tracking-widest transition-all relative",
              activeProfileTab === tab.id ? "text-[#1a237e]" : "text-gray-400 hover:text-gray-600"
            )}
          >
            {tab.label}
            {activeProfileTab === tab.id && (
              <motion.div layoutId="profileTab" className="absolute bottom-0 left-0 right-0 h-1 bg-[#fbbd08] rounded-full" />
            )}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-12 gap-8">
        {/* Left Card: Summary */}
        <div className="md:col-span-4 bg-white border border-gray-200 rounded-3xl p-8 shadow-sm flex flex-col items-center text-center h-fit sticky top-8">
          <div 
            className="relative group mb-6 cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="h-40 w-40 rounded-full border-4 border-[#fbbd08] p-1.5 shadow-2xl overflow-hidden bg-gray-50 flex items-center justify-center relative transition-transform duration-500 hover:scale-105">
              {isUploading ? (
                <div className="h-10 w-10 border-4 border-[#1a237e] border-t-transparent rounded-full animate-spin" />
              ) : user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover rounded-full transition-transform duration-700 group-hover:scale-110" referrerPolicy="no-referrer" />
              ) : (
                <UserIcon className="h-20 w-20 text-gray-200" />
               )}
              
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full backdrop-blur-[2px]">
                <Camera className="text-white h-10 w-10" />
              </div>
            </div>
            
            <input type="file" ref={fileInputRef} onChange={handlePhotoChange} className="hidden" accept="image/*" />
            
            <div className="absolute bottom-2 right-2 h-10 w-10 bg-[#1a237e] text-white rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-all border-2 border-white z-10">
              <Camera className="h-5 w-5" />
            </div>
          </div>
          
          <h2 className="text-2xl font-black text-[#0d1b2a] mb-1">{user.displayName}</h2>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#fbbd08] bg-[#fbbd08]/10 px-4 py-1.5 rounded-full mb-8">
            {user.role}
          </span>

          <div className="w-full space-y-4 pt-8 border-t border-gray-100">
             <div className="flex justify-between items-center text-[11px]">
               <span className="font-bold text-gray-400 uppercase tracking-widest">Account Status</span>
               <span className={cn("font-black flex items-center gap-1", user.isActive !== false ? "text-[#85b27a]" : "text-red-500")}>
                 <CheckCircle2 className="h-3 w-3" />
                 {user.isActive !== false ? 'Verified' : 'Pending'}
               </span>
             </div>
             <div className="flex justify-between items-center text-[11px]">
               <span className="font-bold text-gray-400 uppercase tracking-widest">Student ID</span>
               <span className="font-black text-[#0d1b2a]">{user.studentId || 'N/A'}</span>
             </div>
             <div className="flex justify-between items-center text-[11px]">
               <span className="font-bold text-gray-400 uppercase tracking-widest">Course</span>
               <span className="font-black text-[#0d1b2a]">{user.course || 'N/A'}</span>
             </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="md:col-span-8">
          <AnimatePresence mode="wait">
            {activeProfileTab === 'personal' && (
              <motion.div 
                key="personal"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm space-y-10"
              >
                <div className="flex items-center gap-4 border-b border-gray-50 pb-6">
                  <div className="p-3 bg-[#1a237e]/5 rounded-2xl">
                    <UserIcon className="h-6 w-6 text-[#1a237e]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-[#0d1b2a] uppercase tracking-tight">Personal Details</h3>
                    <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">Essential information for your official records.</p>
                  </div>
                </div>

                <div className="grid gap-8">
                  {personalInfo.map((item, index) => (
                    <div key={index} className="grid md:grid-cols-3 items-center group gap-4">
                      <div className="flex items-center gap-3 text-[#1a237e] opacity-40 group-hover:opacity-100 transition-all font-sans">
                        {item.icon}
                        <span className="text-[11px] font-black uppercase tracking-widest">{item.label}</span>
                      </div>
                      <div className="md:col-span-2">
                        {isEditing && !item.readonly ? (
                          <input 
                            value={item.value}
                            onChange={(e) => handleInputChange(item.key!, e.target.value)}
                            className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[#1a237e]/5 transition-all"
                            placeholder={`Enter ${item.label}`}
                          />
                        ) : (
                          <div className="px-5 py-3 bg-gray-50/50 rounded-xl">
                            <p className="text-sm font-black text-[#0d1b2a]">{item.value || 'Not Set'}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeProfileTab === 'yearbook' && (
              <motion.div 
                key="yearbook"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm space-y-10">
                   <div className="flex items-center gap-4 border-b border-gray-50 pb-6">
                    <div className="p-3 bg-[#fbbd08]/10 rounded-2xl">
                      <BookOpen className="h-6 w-6 text-[#fbbd08]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-[#0d1b2a] uppercase tracking-tight">Yearbook Quote</h3>
                      <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">A short message to represent your journey.</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {isEditing ? (
                      <textarea 
                        value={editedValues.quote}
                        onChange={(e) => handleInputChange('quote', e.target.value)}
                        className="w-full h-40 p-6 bg-gray-50 border border-gray-100 rounded-2xl font-serif italic text-lg text-[#0d1b2a] focus:outline-none focus:ring-2 focus:ring-[#1a237e]/5"
                        placeholder="Enter your yearbook quote..."
                        maxLength={250}
                      />
                    ) : (
                      <div className="w-full min-h-40 p-8 bg-[#1a237e] text-white rounded-3xl shadow-xl shadow-[#1a237e]/10 relative overflow-hidden font-serif">
                         <div className="absolute top-0 right-0 p-8 opacity-10">
                           <BookOpen className="h-20 w-20" />
                         </div>
                         <div className="relative text-2xl italic leading-relaxed">
                           "{editedValues.quote || 'Life is a journey, not a destination...'}"
                         </div>
                      </div>
                    )}
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-2">
                       <Clock className="h-3 w-3" /> Max 250 characters.
                    </p>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm space-y-10">
                   <div className="flex items-center gap-4 border-b border-gray-50 pb-6">
                    <div className="p-3 bg-[#85b27a]/10 rounded-2xl">
                      <CheckCircle2 className="h-6 w-6 text-[#85b27a]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-[#0d1b2a] uppercase tracking-tight">Achievements</h3>
                      <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">List your awards, honors, and milestones.</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {isEditing ? (
                      <textarea 
                        value={editedValues.achievements}
                        onChange={(e) => handleInputChange('achievements', e.target.value)}
                        className="w-full h-40 p-6 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-sm text-[#0d1b2a] focus:outline-none focus:ring-2 focus:ring-[#1a237e]/5"
                        placeholder="Enter your achievements (one per line)..."
                      />
                    ) : (
                      <div className="space-y-3">
                        {editedValues.achievements ? editedValues.achievements.split('\n').filter(a => a.trim()).map((achievement, i) => (
                          <div key={i} className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                             <div className="h-2 w-2 rounded-full bg-[#85b27a]" />
                             <p className="text-[13px] font-black text-[#0d1b2a] tracking-tight">{achievement}</p>
                          </div>
                        )) : (
                          <p className="text-sm text-gray-400 font-medium italic">No achievements added yet.</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeProfileTab === 'preview' && (
              <motion.div 
                key="preview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex justify-center py-8"
              >
                 {/* Yearbook Page Mockup */}
                 <div className="w-[400px] h-auto min-h-[600px] bg-white shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] rounded-sm p-10 flex flex-col items-center border border-gray-100 relative font-serif">
                    <div className="w-12 h-12 mb-6 grayscale opacity-60">
                        <img src="https://upload.wikimedia.org/wikipedia/en/e/e2/Ateneo_de_Naga_University_logo.png" alt="University Logo" className="w-full h-full object-contain" />
                    </div>
                    
                    <div className="text-center mb-10">
                        <h2 className="text-[10px] font-bold tracking-[0.3em] uppercase text-gray-400 mb-1">Ateneo de Naga University</h2>
                        <h3 className="text-[9px] font-medium tracking-[0.2em] uppercase text-gray-300">Class of 2026</h3>
                    </div>

                    <div className="w-64 h-80 border-8 border-double border-gray-200 mb-8 overflow-hidden bg-gray-50 p-2">
                       <div className="w-full h-full overflow-hidden">
                          {user.photoURL ? (
                            <img src={user.photoURL} alt="Yearbook Preview" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-100">
                               <UserIcon className="h-20 w-20 text-gray-200" />
                            </div>
                          )}
                       </div>
                    </div>

                    <div className="text-center w-full">
                       <h1 className="text-[32px] font-bold text-[#0d1b2a] leading-tight mb-2 tracking-tighter">
                          {editedValues.displayName}
                       </h1>
                       <div className="h-0.5 w-16 bg-[#fbbd08] mx-auto mb-6" />
                       
                       <div className="space-y-1 mb-8">
                         <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#1a237e]">{editedValues.course}</p>
                         <p className="text-[10px] font-medium text-gray-400 capitalize">Major in {editedValues.section}</p>
                       </div>

                       <div className="relative px-4">
                          <span className="absolute top-0 left-0 text-4xl text-[#fbbd08] opacity-30 leading-none">"</span>
                          <p className="text-[13px] italic text-[#0d1b2a]/80 leading-relaxed py-4">
                            {editedValues.quote || 'This is where your inspirational quote will appear on the final printed page of the yearbook.'}
                          </p>
                          <span className="absolute bottom-0 right-0 text-4xl text-[#fbbd08] opacity-30 leading-none rotate-180">"</span>
                       </div>

                       {editedValues.achievements && (
                          <div className="mt-8 pt-8 border-t border-gray-100 flex flex-wrap justify-center gap-2">
                             {editedValues.achievements.split('\n').filter(a => a.trim()).slice(0, 3).map((a, i) => (
                               <span key={i} className="text-[9px] font-black uppercase tracking-widest text-[#85b27a] border border-[#85b27a]/20 px-2 py-1 rounded">
                                 {a}
                               </span>
                             ))}
                          </div>
                       )}
                    </div>
                 </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      {feedback && <FeedbackModal {...feedback} />}
    </div>
  );
}
