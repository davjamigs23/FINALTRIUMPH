import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar as CalendarIcon, 
  MapPin, 
  Clock, 
  User, 
  ChevronRight, 
  Plus,
  AlertTriangle,
  X,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { ScheduleService } from '../../services/ScheduleService';
import { NotificationService } from '../../services/NotificationService';
import { BookingSession } from '../../types';
import { cn } from '../../lib/utils';
import FeedbackModal from '../ui/FeedbackModal';

export default function SmartScheduling() {
  const { user } = useAuth();
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [currentBooking, setCurrentBooking] = useState<BookingSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [feedback, setFeedback] = useState<any>(null);
  const [pendingSlot, setPendingSlot] = useState<string | null>(null);

  const fetchCurrentBooking = async () => {
    if (!user) return;
    try {
      const booking = await ScheduleService.getStudentBooking(user.uid);
      setCurrentBooking(booking);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentBooking();
  }, [user]);

  useEffect(() => {
    if (isBookingOpen) {
      const loadSlots = async () => {
        const booked = await ScheduleService.getBookedSlots(selectedDate);
        setBookedSlots(booked.map(b => b.timeSlot));
      };
      loadSlots();
    }
  }, [selectedDate, isBookingOpen]);

  const initiateBooking = (slot: string) => {
    setPendingSlot(slot);
  };

  const cancelPendingBooking = () => {
    setPendingSlot(null);
  }

  const handleBook = async () => {
    if (!user || !pendingSlot) return;
    setBookingLoading(true);
    try {
      if (currentBooking) {
        await ScheduleService.rescheduleSession(currentBooking.id, user.uid, selectedDate, pendingSlot);
        await NotificationService.sendNotification(user.uid, 'Session Rescheduled', `You have successfully rescheduled your session to ${selectedDate} at ${pendingSlot}`, 'reminder');
      } else {
        await ScheduleService.bookSession(user.uid, selectedDate, pendingSlot);
        await NotificationService.sendNotification(user.uid, 'Session Booked', `You have successfully booked your session for ${selectedDate} at ${pendingSlot}. A reminder notification will be sent 24 hours before the scheduled session.`, 'reminder');
      }
      setIsBookingOpen(false);
      setPendingSlot(null);
      await fetchCurrentBooking();
      setFeedback({ title: 'Success', message: currentBooking ? 'Session successfully rescheduled!' : `Session successfully booked for ${selectedDate} at ${pendingSlot}! A reminder notification will be sent 24 hours before the scheduled session.`, type: 'info', onClose: () => setFeedback(null) });
    } catch (err: any) {
      setFeedback({ title: 'Booking Error', message: err.message, type: 'error', onClose: () => setFeedback(null) });
      setPendingSlot(null);
    } finally {
      setBookingLoading(false);
    }
  };

  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);

  const handleCancelClick = () => {
    setIsCancelConfirmOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!currentBooking || !user) return;
    try {
      await ScheduleService.cancelSession(currentBooking.id, user.uid, currentBooking.date);
      await NotificationService.sendNotification(user.uid, 'Session Cancelled', `Your session for ${currentBooking.date} has been cancelled.`, 'status_change');
      await fetchCurrentBooking();
      setIsCancelConfirmOpen(false);
      setFeedback({ title: 'Cancelled', message: 'Appointment cancelled — Your slot has been released. You can book a new one anytime.', type: 'info', onClose: () => setFeedback(null) });
    } catch (err: any) {
      setFeedback({ title: 'Error', message: err.message || 'Failed to cancel session.', type: 'error', onClose: () => setFeedback(null) });
      setIsCancelConfirmOpen(false);
    }
  };

  const policies = [
    { title: 'Reschedule Limit', content: 'You can reschedule up to 2 times only.' },
    { title: 'Cancellation window', content: 'Must be done at least 24 hours before your session.' },
    { title: 'Punctuality', content: 'Arriving 15 minutes late will release your slot.' },
  ];

  const timeSlots = ScheduleService.getAvailableTimeSlots();

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tighter text-[#0d1b2a]">Schedule</h2>
          <p className="text-sm text-gray-500 font-medium">Manage your professional yearbook photo session bookings.</p>
        </div>
        {!currentBooking && (
          <button 
            onClick={() => setIsBookingOpen(true)}
            className="bg-[#1a237e] hover:shadow-xl text-white rounded-xl px-10 h-14 font-black uppercase tracking-widest transition-all active:scale-95"
          >
             <Plus className="inline-block mr-2 h-5 w-5" /> Book New Slot
          </button>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
           <div className={cn(
             "p-8 text-white border-none shadow-2xl rounded-3xl relative overflow-hidden transition-all duration-500",
             currentBooking ? "bg-[#85b27a]" : "bg-[#1a237e] opacity-40"
           )}>
             <div className="absolute top-0 right-0 p-8 opacity-10">
               <CalendarIcon className="h-32 w-32" />
             </div>
             
             {currentBooking ? (
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div className="space-y-6">
                    <div>
                      <span className="bg-white/20 text-white text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full">Current Appointment</span>
                      <h3 className="text-5xl font-black tracking-tighter mt-4 uppercase leading-none">
                        {formatDate(currentBooking.date)}
                      </h3>
                      <div className="flex items-center gap-2 mt-2 opacity-80 text-lg font-black tracking-widest">
                        <Clock className="h-5 w-5" />
                        {currentBooking.timeSlot}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-3 opacity-90">
                        <MapPin className="h-4 w-4 text-[#fbbd08]" />
                        <span className="text-sm font-bold uppercase tracking-wide">Main University Studio - Bldg B</span>
                      </div>
                      <div className="flex items-center gap-3 opacity-90">
                        <User className="h-4 w-4 text-[#fbbd08]" />
                        <span className="text-sm font-bold uppercase tracking-wide">Triumph Photography Team</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 w-full md:w-auto">
                    <button 
                      onClick={() => setIsBookingOpen(true)}
                      className="bg-[#fbbd08] text-[#0d1b2a] font-black rounded-xl h-12 shadow-lg shadow-[#fbbd08]/20 uppercase text-[11px] tracking-widest px-8 hover:scale-[1.02] transition-all"
                    >
                      Reschedule
                    </button>
                    <button 
                     onClick={handleCancelClick}
                     className="bg-white/10 hover:bg-white/20 text-white font-black rounded-xl h-12 shadow-md uppercase text-[11px] tracking-widest border border-white/20 px-8 transition-all"
                    >
                      Cancel Appointment
                    </button>
                  </div>
                </div>
              ) : (
               <div className="relative z-10 py-12 text-center space-y-4">
                  <CalendarIcon className="h-16 w-16 mx-auto opacity-40" />
                  <h3 className="text-2xl font-black uppercase tracking-tighter">No session scheduled</h3>
                  <p className="max-w-xs mx-auto text-sm font-medium opacity-60">You haven't booked your photo session yet. Secured slots appear here.</p>
               </div>
             )}
           </div>

           <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
                <h4 className="font-black text-[10px] uppercase tracking-widest opacity-40 mb-4">Dress Code Guidelines</h4>
                <div className="aspect-video bg-gray-100 rounded-2xl mb-4 overflow-hidden relative group">
                  <img src="http://k.sinaimg.cn/n/front/688/w954h534/20190114/3vyz-hrsecha6960654.jpg/w700d1q75cms.jpg" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" alt="Dress code" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-[#1a237e]/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => setIsGuideOpen(true)}
                      className="bg-white text-[#1a237e] text-[10px] px-4 py-2 rounded-lg font-black uppercase tracking-widest shadow-lg"
                    >View Guide</button>
                  </div>
                </div>
                <ul className="space-y-2">
                   <li className="flex items-center gap-2 text-[11px] font-bold text-[#0d1b2a]">
                     <ChevronRight className="h-3 w-3 text-[#fbbd08]" />
                     Professional Attire Required
                   </li>
                   <li className="flex items-center gap-2 text-[11px] font-bold text-[#0d1b2a]">
                     <ChevronRight className="h-3 w-3 text-[#fbbd08]" />
                     Formal blazer and white inner shirt
                   </li>
                </ul>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                 <h4 className="font-black text-[10px] uppercase tracking-widest opacity-40">Pre-Shoot Checklist</h4>
                 {[
                   'Confirm your time slot (Verified)',
                   'Prepare your uniform/blazer',
                   'Grooming & Hair preparation',
                   'Check for ongoing campus alerts'
                 ].map((text, i) => (
                   <div key={i} className="flex gap-3 items-center">
                      <div className="h-4 w-4 rounded border border-[#1a237e]/20 flex items-center justify-center bg-gray-50">
                        <CheckCircle2 className="h-2.5 w-2.5 text-[#1a237e] opacity-20" />
                      </div>
                      <span className="text-[11px] font-semibold text-[#0d1b2a]">{text}</span>
                   </div>
                 ))}
                 <button 
                   onClick={async () => {
                      const { jsPDF } = await import('jspdf');
                      const doc = new jsPDF({
                        orientation: 'p',
                        unit: 'mm',
                        format: 'a4'
                      });

                      // Styling
                      doc.setFillColor(26, 35, 126); // #1a237e
                      doc.rect(0, 0, 210, 30, 'F');
                      doc.setTextColor(255, 255, 255);
                      doc.setFontSize(22);
                      doc.setFont('helvetica', 'bold');
                      doc.text("ADNU YEARBOOK SHOOT", 105, 18, { align: 'center' });

                      doc.setTextColor(50, 50, 50);
                      doc.setFontSize(16);
                      doc.text("Checklist & Guidelines", 105, 26, { align: 'center' });

                      doc.setFontSize(12);
                      doc.setFont('helvetica', 'normal');
                      let y = 50;

                      const checklist = [
                        "1. Confirm your scheduled time slot.",
                        "2. Wear proper formal yearbook uniform.",
                        "3. Blazer must be clean and well-pressed.",
                        "4. Maintain proper ADNU grooming standards:",
                        "   - Hair should be neatly styled",
                        "   - No eccentric hair colors",
                        "   - Proper hygiene maintained",
                        "5. Bring your student ID if required."
                      ];

                      doc.setDrawColor(251, 189, 8); // #fbbd08
                      doc.setLineWidth(1);
                      doc.rect(10, 40, 190, checklist.length * 10 + 10);

                      checklist.forEach((item) => {
                        doc.text(item, 15, y);
                        y += 10;
                      });

                      doc.setFontSize(10);
                      doc.setTextColor(150, 150, 150);
                      doc.text("Generated by ADNU Yearbook Portal", 105, 285, { align: 'center' });

                      doc.save('ADNU_Yearbook_Checklist.pdf');
                    }}
                   className="w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-[#1a237e] text-[#1a237e] hover:bg-gray-50 transition-all"
                 >Download PDF Checklist</button>
              </div>
           </div>
        </div>

        <div className="space-y-6">
           <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
             <h3 className="font-black text-[13px] uppercase tracking-widest text-[#0d1b2a] mb-6 flex items-center gap-3">
               <AlertTriangle className="h-5 w-5 text-[#fbbd08]" />
               Scheduling Policies
             </h3>
             <div className="space-y-4">
                {policies.map((p, i) => (
                  <div key={i} className="pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                    <h5 className="text-[9px] font-black uppercase tracking-[0.2em] text-[#1a237e] mb-1">{p.title}</h5>
                    <p className="text-[11px] opacity-70 leading-relaxed font-medium text-gray-600">{p.content}</p>
                  </div>
                ))}
             </div>
           </div>
        </div>
      </div>

      {/* Booking Modal */}
      <AnimatePresence>
        {isBookingOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBookingOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="px-8 py-6 bg-[#1a237e] text-white flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight">Select a Slot</h3>
                  <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">Only available slots are shown</p>
                </div>
                <button onClick={() => setIsBookingOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-all">
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                <div>
                   <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">Pick a Date</label>
                   <input 
                    type="date" 
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-[#0d1b2a]"
                   />
                </div>

                 {pendingSlot ? (
                    <div className="space-y-6">
                        <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 flex flex-col gap-4 items-center text-center">
                            <h4 className="text-[13px] font-black uppercase tracking-widest text-[#0d1b2a]">Confirm Booking</h4>
                            <p className="text-sm font-bold text-amber-800">
                                You are about to book a session on <br/>
                                <span className="text-xl text-[#0d1b2a]">{formatDate(selectedDate)}</span> <br/>
                                at <span className="text-xl text-[#0d1b2a]">{pendingSlot}</span>
                            </p>
                        </div>
                        <div className="flex gap-4">
                            <button 
                                disabled={bookingLoading}
                                onClick={cancelPendingBooking}
                                className="flex-1 py-4 border border-gray-100 bg-gray-50 text-gray-500 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-gray-100 transition-all font-sans"
                            >
                                Back
                            </button>
                            <button 
                                disabled={bookingLoading}
                                onClick={handleBook}
                                className="flex-1 py-4 bg-[#85b27a] text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:shadow-xl transition-all font-sans"
                            >
                                {bookingLoading ? 'Processing...' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                 ) : (
                    <div>
                       <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-4">Available Times on {selectedDate}</label>
                       <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {timeSlots.map((slot) => {
                            const isBooked = bookedSlots.includes(slot);
                            return (
                              <button
                                key={slot}
                                disabled={isBooked || bookingLoading}
                                onClick={() => initiateBooking(slot)}
                                className={cn(
                                  "py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                  isBooked ? "bg-gray-100 text-gray-300 cursor-not-allowed" : "bg-white border border-gray-100 text-[#1a237e] hover:border-[#fbbd08] hover:bg-[#fbbd08]/5"
                                )}
                              >
                                {slot}
                              </button>
                            );
                          })}
                       </div>
                    </div>
                 )}
              </div>

              {bookingLoading && (
                <div className="absolute inset-0 bg-white/60 flex items-center justify-center backdrop-blur-[2px]">
                   <div className="h-10 w-10 border-4 border-[#1a237e] border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Cancellation Confirmation Modal */}
      <AnimatePresence>
        {isCancelConfirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setIsCancelConfirmOpen(false)}
               className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            />
            <motion.div 
               initial={{ scale: 0.95, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.95, opacity: 0 }}
               className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 text-center"
            >
               <div className="h-16 w-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertTriangle className="h-8 w-8 text-red-500" />
               </div>
               <h3 className="text-xl font-black text-[#0d1b2a] mb-2 uppercase tracking-tight">Cancel Appointment?</h3>
               <p className="text-sm text-gray-500 font-medium leading-relaxed mb-8">
                  This action will release your slot for other students. You may not be able to book the same time again.
               </p>
               <div className="flex gap-4">
                  <button 
                     onClick={() => setIsCancelConfirmOpen(false)}
                     className="flex-1 py-3 border border-gray-100 rounded-xl text-[11px] font-black uppercase tracking-widest text-gray-400 hover:bg-gray-50 transition-all"
                  >
                     Keep it
                  </button>
                  <button 
                     onClick={handleConfirmCancel}
                     className="flex-1 py-3 bg-red-500 text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                  >
                     Yes, Cancel
                  </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Dress Code Guide Modal */}
      <AnimatePresence>
        {isGuideOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="w-full max-w-2xl bg-white rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="px-8 py-6 bg-[#1a237e] text-white flex justify-between items-center">
                <h3 className="text-lg font-black uppercase tracking-tight">Dress Code Guide</h3>
                <button onClick={() => setIsGuideOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-all">
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="p-8 space-y-6">
                <div className="grid md:grid-cols-2 gap-8">
                   <div className="space-y-4">
                      <h4 className="text-sm font-black text-[#0d1b2a] uppercase tracking-wider">Male Students</h4>
                      <ul className="space-y-3">
                         {[
                           'Formal black/navy blazer',
                           'White long-sleeved polo',
                           'Black tie (standard width)',
                           'Clean-shaven or neatly groomed beard',
                           'Appropriate school-standard haircut'
                         ].map((item, i) => (
                           <li key={i} className="flex items-center gap-3 text-xs font-bold text-gray-600">
                             <div className="h-1.5 w-1.5 rounded-full bg-[#fbbd08]" />
                             {item}
                           </li>
                         ))}
                      </ul>
                   </div>
                   <div className="space-y-4">
                      <h4 className="text-sm font-black text-[#0d1b2a] uppercase tracking-wider">Female Students</h4>
                      <ul className="space-y-3">
                         {[
                           'Formal black/navy blazer',
                           'White inner shirt/polo',
                           'Modest natural-looking makeup',
                           'Neatly styled hair (Ear-exposed)',
                           'Minimal jewelry (Small studs)'
                         ].map((item, i) => (
                           <li key={i} className="flex items-center gap-3 text-xs font-bold text-gray-600">
                             <div className="h-1.5 w-1.5 rounded-full bg-[#fbbd08]" />
                             {item}
                           </li>
                         ))}
                      </ul>
                   </div>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-4">
                   <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                   <p className="text-[11px] font-bold text-amber-800 leading-relaxed uppercase">
                      Students who fail to follow the dress code will not be allowed to proceed with the session and must reschedule.
                   </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {feedback && <FeedbackModal {...feedback} />}
    </div>
  );
}
