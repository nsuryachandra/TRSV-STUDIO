import React, { useState, useEffect, useRef } from 'react';
import { User, Sparkles, Download, RefreshCw, Check, Upload, UserCheck, Edit, CheckCircle2, AlertCircle, Lock, Unlock } from 'lucide-react';
import { motion } from 'framer-motion';
import { removeBackground } from '@imgly/background-removal';

export default function UserPortal({ templates }) {
  const [profile, setProfile] = useState(() => {
    const fallback = { name: '', role: '', photoDataUrl: '', isBgRemoved: false };
    try {
      const stored = JSON.parse(localStorage.getItem('posterforge_user_profile'));
      if (!stored) return fallback;
      return {
        name: stored.name || '',
        role: stored.role || '',
        photoDataUrl: stored.photoDataUrl || '',
        username: stored.username || '',
        isBgRemoved: stored.isBgRemoved || false
      };
    } catch {
      return fallback;
    }
  });

  const [registering, setRegistering] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [downloadingTemplateId, setDownloadingTemplateId] = useState(null);
  const [isEditingProfile, setIsEditingProfile] = useState(() => {
    return !(profile.name && profile.role);
  });

  const [originalPhoto, setOriginalPhoto] = useState(() => {
    return localStorage.getItem('posterforge_original_photo') || null;
  });
  const [removingBg, setRemovingBg] = useState(false);
  const [bgRemovalProgress, setBgRemovalProgress] = useState('');

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (profile.name && profile.role) {
      setIsSaved(true);
    }
  }, []);

  const handleTextChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
    setIsSaved(false);
  };

  const triggerFileSelect = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      setOriginalPhoto(dataUrl);
      localStorage.setItem('posterforge_original_photo', dataUrl);
      setProfile(prev => ({ 
        ...prev, 
        photoDataUrl: dataUrl,
        isBgRemoved: false 
      }));
      setIsSaved(false);
    };
    reader.readAsDataURL(file);
  };

  const removeBackgroundClientSide = async () => {
    if (!profile.photoDataUrl) return;
    setRemovingBg(true);
    setBgRemovalProgress('Initializing AI Model...');

    try {
      // Use original uploaded photo if available, to avoid multiple compounding removal attempts
      const sourceImage = originalPhoto || profile.photoDataUrl;

      const blob = await removeBackground(sourceImage, {
        model: 'medium',
        progress: (stage, current, total) => {
          const pct = Math.round((current / total) * 100);
          if (stage.includes('fetch')) {
            setBgRemovalProgress(`Downloading AI model: ${pct}%`);
          } else {
            setBgRemovalProgress(`Removing background: ${pct}%`);
          }
        }
      });

      const reader = new FileReader();
      reader.onloadend = () => {
        const processedUrl = reader.result;
        setProfile(prev => {
          const updated = {
            ...prev,
            photoDataUrl: processedUrl,
            isBgRemoved: true
          };
          localStorage.setItem('posterforge_user_profile', JSON.stringify(updated));
          return updated;
        });
        setIsSaved(true);
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error('AI background removal error:', err);
      alert('AI Background removal failed. Please check your internet connection and try again.');
    } finally {
      setRemovingBg(false);
      setBgRemovalProgress('');
    }
  };

  const handleResetPhoto = () => {
    if (originalPhoto) {
      setProfile(prev => {
        const updated = {
          ...prev,
          photoDataUrl: originalPhoto,
          isBgRemoved: false
        };
        localStorage.setItem('posterforge_user_profile', JSON.stringify(updated));
        return updated;
      });
      setIsSaved(false);
    }
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    if (!profile.name || !profile.role) return;

    setRegistering(true);
    setTimeout(() => {
      localStorage.setItem('posterforge_user_profile', JSON.stringify(profile));
      setIsSaved(true);
      setRegistering(false);
      setIsEditingProfile(false);
    }, 400);
  };

  const generateAndDownloadHD = async (template) => {
    setDownloadingTemplateId(template.id);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1350;
      const ctx = canvas.getContext('2d');

      // 1. Draw base poster image
      const baseImg = new Image();
      baseImg.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        baseImg.onload = resolve;
        baseImg.onerror = reject;
        baseImg.src = template.image_url;
      });
      ctx.drawImage(baseImg, 0, 0, 1080, 1350);

      const cfg = template.config || {};

      // 2. Draw supporter portrait (Hero Portrait System)
      if (profile.photoDataUrl && cfg.photo) {
        const userImg = new Image();
        userImg.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
          userImg.onload = resolve;
          userImg.onerror = resolve;
          userImg.src = profile.photoDataUrl;
        });

        if (userImg.complete && userImg.naturalWidth > 0) {
          const p = cfg.photo;
          ctx.save();

          // Create feather gradient mask if bottom/left/right feather is configured
          const hasFeather = (p.edgeFeather && p.edgeFeather > 0) || 
                            (p.leftFeather && p.leftFeather > 0) || 
                            (p.rightFeather && p.rightFeather > 0);

          if (hasFeather) {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = p.width;
            tempCanvas.height = p.height;
            const tCtx = tempCanvas.getContext('2d');

            tCtx.drawImage(userImg, 0, 0, p.width, p.height);

            tCtx.globalCompositeOperation = 'destination-out';
            
            // Bottom feather (edgeFeather)
            if (p.edgeFeather && p.edgeFeather > 0) {
              const featherH = Math.min(p.edgeFeather * 2, p.height * 0.4);
              const grad = tCtx.createLinearGradient(0, p.height - featherH, 0, p.height);
              grad.addColorStop(0, 'rgba(0,0,0,0)');
              grad.addColorStop(1, 'rgba(0,0,0,1)');
              tCtx.fillStyle = grad;
              tCtx.fillRect(0, p.height - featherH, p.width, featherH);
            }

            // Left feather
            if (p.leftFeather && p.leftFeather > 0) {
              const featherW = Math.min(p.leftFeather * 2, p.width * 0.4);
              const grad = tCtx.createLinearGradient(0, 0, featherW, 0);
              grad.addColorStop(0, 'rgba(0,0,0,1)');
              grad.addColorStop(1, 'rgba(0,0,0,0)');
              tCtx.fillStyle = grad;
              tCtx.fillRect(0, 0, featherW, p.height);
            }

            // Right feather
            if (p.rightFeather && p.rightFeather > 0) {
              const featherW = Math.min(p.rightFeather * 2, p.width * 0.4);
              const grad = tCtx.createLinearGradient(p.width - featherW, 0, p.width, 0);
              grad.addColorStop(0, 'rgba(0,0,0,0)');
              grad.addColorStop(1, 'rgba(0,0,0,1)');
              tCtx.fillStyle = grad;
              tCtx.fillRect(p.width - featherW, 0, featherW, p.height);
            }

            ctx.drawImage(tempCanvas, p.x, p.y, p.width, p.height);
          } else {
            ctx.drawImage(userImg, p.x, p.y, p.width, p.height);
          }

          ctx.restore();
        }
      }

      // 3. Draw Supporter Name
      if (profile.name && cfg.name) {
        const n = cfg.name;
        ctx.save();
        ctx.font = `${n.weight || '700'} ${n.size || 60}px ${n.font || 'Montserrat'}, sans-serif`;
        ctx.fillStyle = n.color || '#000000';
        ctx.textAlign = n.align || 'center';
        ctx.textBaseline = 'top';
        if (n.shadow) {
          ctx.shadowColor = 'rgba(0,0,0,0.3)';
          ctx.shadowBlur = n.shadowBlur || 6;
        }
        const textToDraw = n.uppercase ? profile.name.toUpperCase() : profile.name;
        const textX = n.align === 'center' ? n.x + (n.width / 2) : n.x;
        ctx.fillText(textToDraw, textX, n.y);
        ctx.restore();
      }

      // 4. Draw Supporter Role
      if (profile.role && cfg.role) {
        const r = cfg.role;
        ctx.save();
        ctx.font = `${r.weight || '600'} ${r.size || 28}px ${r.font || 'Poppins'}, sans-serif`;
        ctx.fillStyle = r.color || '#333333';
        ctx.textAlign = r.align || 'center';
        ctx.textBaseline = 'top';
        const roleToDraw = r.uppercase ? profile.role.toUpperCase() : profile.role;
        const roleX = r.align === 'center' ? r.x + (r.width / 2) : r.x;
        ctx.fillText(roleToDraw, roleX, r.y);
        ctx.restore();
      }

      // 5. Trigger HD Download
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `${template.title.replace(/\s+/g, '_')}_${profile.name.replace(/\s+/g, '_')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('HD Render export failed:', err);
    } finally {
      setDownloadingTemplateId(null);
    }
  };

  return (
    <div className="space-y-10 max-w-5xl mx-auto p-1">
      {/* Page Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="badge-green">Live Engine</span>
            <span className="badge-yellow">Supporter Portal</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 font-poppins">
            Campaign <span className="text-emerald-600">Poster</span> Generator
          </h1>
          <p className="text-sm mt-1 text-slate-500">Overlay your profile onto campaign templates to generate HD posters.</p>
        </div>

        {/* Quick Setup Status Badge */}
        {profile.name && profile.role && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-xs">
            <span className={`w-2 h-2 rounded-full ${profile.photoDataUrl ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span className="text-xs font-bold text-slate-700">
              {profile.photoDataUrl ? 'Active & Ready' : 'Photo Required'}
            </span>
          </div>
        )}
      </div>

      {/* Supporter Configuration Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-white border border-slate-200 shadow-md relative overflow-hidden"
      >
        {/* Top styling band */}
        <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-yellow-400 to-amber-500" />

        <div className="p-6 sm:p-8">
          {!isEditingProfile ? (
            /* Premium Collapsed Read-Only Profile View */
            <div className="flex flex-col md:flex-row gap-8 items-center justify-between">
              
              {/* Photo Segment */}
              <div className="flex flex-col items-center space-y-3 shrink-0">
                <div
                  onClick={removingBg ? null : triggerFileSelect}
                  className={`w-32 h-32 rounded-2xl overflow-hidden flex flex-col items-center justify-center relative transition-all border-2 border-dashed ${
                    removingBg
                      ? 'border-emerald-500 bg-emerald-50/50 cursor-wait'
                      : 'border-slate-300 hover:border-amber-500 bg-slate-50 cursor-pointer group shadow-sm'
                  }`}
                >
                  {removingBg ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2 bg-white/90">
                      <RefreshCw size={22} className="animate-spin mb-1.5 text-emerald-600" />
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-700">{bgRemovalProgress || 'AI Segmenting...'}</span>
                    </div>
                  ) : profile.photoDataUrl ? (
                    <>
                      <img src={profile.photoDataUrl} alt="Supporter Profile" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/75 text-white">
                        <Upload size={14} className="mb-1" />
                        Update Photo
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center text-slate-400 group-hover:text-amber-500 transition-colors text-center p-2">
                      <User size={30} className="mb-1 opacity-55" />
                      <span className="text-[9px] font-extrabold uppercase tracking-wider">Tap To Upload Portrait</span>
                      <span className="text-[7px] font-bold text-amber-600 mt-0.5">Required *</span>
                    </div>
                  )}
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoUpload}
                  accept="image/*"
                  className="hidden"
                  disabled={removingBg}
                />

                <div className="flex flex-col gap-1.5 items-center w-full">
                  <button
                    type="button"
                    onClick={triggerFileSelect}
                    disabled={removingBg}
                    className="text-xs font-bold text-amber-600 hover:text-amber-700 disabled:opacity-40"
                  >
                    {profile.photoDataUrl ? 'Change Portrait Photo' : 'Choose Picture'}
                  </button>

                  {profile.photoDataUrl && !profile.isBgRemoved && !removingBg && (
                    <button
                      type="button"
                      onClick={removeBackgroundClientSide}
                      className="text-[10px] font-bold flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-all hover:scale-105 active:scale-95 shadow-xs"
                    >
                      <Sparkles size={11} className="animate-pulse text-emerald-600" />
                      Remove Background
                    </button>
                  )}

                  {profile.photoDataUrl && profile.isBgRemoved && !removingBg && (
                    <button
                      type="button"
                      onClick={handleResetPhoto}
                      className="text-[9px] font-semibold text-slate-500 hover:text-slate-700 underline"
                    >
                      Reset Original Photo
                    </button>
                  )}
                </div>
              </div>

              {/* Text Summary & Details */}
              <div className="flex-1 text-center md:text-left space-y-3">
                <div>
                  <span className="badge-green inline-block text-[10px] font-extrabold tracking-wider uppercase mb-1">
                    Supporter Identity
                  </span>
                  <h2 className="text-2xl font-black text-slate-900 font-poppins tracking-tight">
                    {profile.name}
                  </h2>
                  <p className="text-sm font-bold text-emerald-600 uppercase tracking-wide mt-0.5 font-poppins">
                    {profile.role}
                  </p>
                </div>

                {/* Status Indicator Panel */}
                {!profile.photoDataUrl ? (
                  <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-100 flex items-start gap-3">
                    <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={18} />
                    <div>
                      <span className="text-xs font-bold text-amber-950 block">⚠ Portrait Photo Missing</span>
                      <span className="text-[11px] text-slate-500 block leading-normal mt-0.5">Please upload your portrait photo. To proceed, we need your picture.</span>
                    </div>
                  </div>
                ) : !profile.isBgRemoved ? (
                  <div className="p-3.5 rounded-xl bg-yellow-50/70 border border-yellow-200 flex items-start gap-3">
                    <Sparkles className="text-yellow-600 shrink-0 mt-0.5 animate-pulse" size={18} />
                    <div>
                      <span className="text-xs font-bold text-yellow-955 block">✨ Background Removal Required</span>
                      <span className="text-[11px] text-slate-600 block leading-normal mt-0.5">Click the <b>"Remove Background"</b> button below your photo to isolate your portrait and unlock all poster downloads.</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-100 flex items-start gap-3">
                    <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={18} />
                    <div>
                      <span className="text-xs font-bold text-emerald-950 block">✓ Setup Complete & Unlocked</span>
                      <span className="text-[11px] text-slate-500 block leading-normal mt-0.5">Your profile is fully configured. All campaign templates below are unlocked! Click any template to instantly generate and download.</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Edit button */}
              <div className="shrink-0 pt-2 md:pt-0">
                <button
                  onClick={() => setIsEditingProfile(true)}
                  className="flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition-all active:scale-95 shadow-sm"
                >
                  <Edit size={14} />
                  Edit Profile Details
                </button>
              </div>

            </div>
          ) : (
            /* Editing / Creation Form View */
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="flex flex-col md:flex-row gap-8 items-center">
                {/* Photo Upload */}
                <div className="flex flex-col items-center space-y-3 shrink-0">
                  <div
                    onClick={triggerFileSelect}
                    className="w-36 h-36 rounded-2xl overflow-hidden flex flex-col items-center justify-center relative transition-all border-2 border-dashed border-slate-300 hover:border-amber-500 bg-slate-50 cursor-pointer group shadow-sm"
                  >
                    {profile.photoDataUrl ? (
                      <>
                        <img src={profile.photoDataUrl} alt="Profile" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/70 text-white">
                          <Upload size={16} className="mb-1" />
                          Change Photo
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center text-slate-400 group-hover:text-amber-500 transition-colors">
                        <User size={36} className="mb-1.5 opacity-60" />
                        <span className="text-[10px] font-extrabold uppercase tracking-wider">Upload Portrait</span>
                      </div>
                    )}
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handlePhotoUpload}
                    accept="image/*"
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={triggerFileSelect}
                    className="text-xs font-bold text-amber-600 hover:text-amber-700"
                  >
                    Choose picture
                  </button>
                </div>

                {/* Inputs */}
                <div className="flex-1 w-full space-y-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest block mb-1.5 text-slate-500">Your Full Name</label>
                    <input
                      type="text"
                      name="name"
                      value={profile.name}
                      onChange={handleTextChange}
                      placeholder="e.g. Nimmagadda Suryachandra"
                      className="pf-input"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest block mb-1.5 text-slate-500">Your Official Role / Designation</label>
                    <input
                      type="text"
                      name="role"
                      value={profile.role}
                      onChange={handleTextChange}
                      placeholder="e.g. President, Greater Hyderabad TRSV"
                      className="pf-input"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  {profile.name && profile.role && (
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(false)}
                      className="text-xs font-bold text-slate-500 hover:text-slate-700 px-3 py-2 rounded-lg bg-slate-50"
                    >
                      Cancel
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={registering}
                  className={`flex items-center gap-2 font-bold px-6 py-2.5 rounded-xl transition-all active:scale-95 w-full sm:w-auto justify-center text-sm ${isSaved ? 'btn-green' : 'btn-yellow'}`}
                >
                  {registering ? (
                    <>
                      <RefreshCw size={15} className="animate-spin" />
                      Saving...
                    </>
                  ) : isSaved ? (
                    <>
                      <Check size={15} />
                      Saved Successfully
                    </>
                  ) : (
                    <>
                      <Sparkles size={15} />
                      Save Details
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>

      {/* Templates Selector Section */}
      <div className="space-y-5">
        <div className="pb-3 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900 font-poppins">
            1-Click <span className="text-amber-500">Poster</span> Generator
          </h2>
          <p className="text-xs mt-0.5 text-slate-500">Click any template card below to automatically overlay your profile and compile an HD PNG.</p>
        </div>

        {templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 rounded-2xl border-2 border-dashed border-slate-200 bg-white">
            <span className="text-sm font-semibold text-slate-500">No templates configured by the administrator yet.</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {templates.map((template) => {
              const isGenerating = downloadingTemplateId === template.id;
              const isUnlocked = isSaved && !!profile.photoDataUrl && !!profile.isBgRemoved;

              return (
                <div
                  key={template.id}
                  className={`template-card group bg-white border border-slate-200 shadow-sm transition-all rounded-xl overflow-hidden flex flex-col justify-between ${
                    isUnlocked 
                      ? 'cursor-pointer hover:shadow-xl hover:border-amber-400' 
                      : 'opacity-70 cursor-not-allowed border-slate-200'
                  }`}
                  onClick={() => isUnlocked && downloadingTemplateId === null && generateAndDownloadHD(template)}
                >
                  <div className="relative aspect-[3/4] overflow-hidden bg-slate-100 shrink-0">
                    <img
                      src={template.image_url}
                      alt={template.title}
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                    />

                    {isUnlocked ? (
                      <div className={`absolute inset-0 flex flex-col justify-center items-center gap-2 transition-opacity bg-slate-900/75 backdrop-blur-xs ${
                        isGenerating ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}>
                        {isGenerating ? (
                          <div className="flex flex-col items-center gap-2">
                            <RefreshCw size={24} className="animate-spin text-amber-400 mb-1" />
                            <span className="text-xs font-bold text-white">Generating HD PNG...</span>
                          </div>
                        ) : (
                          <>
                            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-tr from-amber-400 to-yellow-300 shadow-lg text-slate-950">
                              <Download size={20} />
                            </div>
                            <span className="text-xs font-bold tracking-wider uppercase mt-1 text-white">Download HD Poster</span>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex flex-col justify-center items-center gap-1.5 bg-slate-900/60 backdrop-blur-[1.5px] text-white">
                        <div className="w-9 h-9 rounded-full bg-slate-950/75 flex items-center justify-center">
                          <Lock size={15} className="text-amber-400" />
                        </div>
                        <span className="text-[9px] font-extrabold tracking-wider uppercase bg-slate-950/80 px-2.5 py-1 rounded">
                          BG Removal Required
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-3 flex flex-col gap-1 bg-white border-t border-slate-100 flex-1 justify-between">
                    <div className="flex justify-between items-center w-full min-h-[22px]">
                      <span className="text-xs font-bold text-slate-900 truncate font-poppins">
                        {template.title}
                      </span>
                      {!isUnlocked && (
                        <span className="badge-yellow text-[8px] shrink-0 ml-1">
                          {!isSaved ? 'Setup Profile' : !profile.photoDataUrl ? 'Photo Required' : 'Remove BG'}
                        </span>
                      )}
                    </div>
                    {isUnlocked && (
                      <div className="md:hidden w-full py-1.5 rounded-lg bg-emerald-600 text-white flex items-center justify-center gap-1 text-[10px] font-bold mt-1 shadow-xs">
                        {isGenerating ? (
                          <>
                            <RefreshCw size={11} className="animate-spin shrink-0" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Download size={11} className="shrink-0" />
                            Get HD PNG
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Unofficial Supporter Tool Footer Disclaimer */}
      <div className="pt-6 pb-2 border-t border-slate-200/80 text-center flex flex-col items-center gap-1">
        <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-600 font-poppins">
          TRSV Design Studio
        </span>
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          Unofficial Fan & Supporter Campaign Tool • Independent Platform
        </span>
      </div>
    </div>
  );
}

