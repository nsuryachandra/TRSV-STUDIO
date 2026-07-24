import React, { useState, useEffect } from 'react';
import { LayoutTemplate, UploadCloud, Users, Sparkles, FolderHeart, Plus, RefreshCw, X, LogOut, Menu, Terminal, Activity } from 'lucide-react';
import Gallery from './components/Gallery';
import TemplateEditor from './components/TemplateEditor';
import UserPortal from './components/UserPortal';
import Login from './components/Login';
import DevPortal from './components/DevPortal';

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('posterforge_session') || 'null');
    } catch {
      return null;
    }
  });

  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [activeTab, setActiveTab] = useState('gallery'); // 'gallery', 'upload', 'user-portal', 'editor'
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Upload state
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState('');
  const [savingUpload, setSavingUpload] = useState(false);

  // Helper to obtain authorization headers for Admin
  const getAdminHeaders = () => {
    try {
      return {
        'Authorization': `Basic ${btoa('surya_dev:surya')}`
      };
    } catch {
      return {};
    }
  };

  // Synchronize browser history and path changes
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  // Setup path and tab guards
  useEffect(() => {
    // If not logged in, enforce path '/login'
    if (!user) {
      if (currentPath !== '/login') {
        navigateTo('/login');
      }
      return;
    }

    // Role-based path security guards
    if (user.role === 'supporter') {
      // Supporters can only access /portal or /gallery
      if (currentPath !== '/portal' && currentPath !== '/gallery') {
        navigateTo('/gallery');
      }
      setActiveTab('user-portal');
    } else if (user.role === 'admin') {
      // Admins can access /upload, /devanalytics, /editor, /gallery, or /
      if (currentPath === '/devanalytics') {
        setActiveTab('dev');
      } else if (currentPath === '/upload') {
        setActiveTab('upload');
      } else if (currentPath === '/editor') {
        setActiveTab('editor');
      } else if (currentPath === '/gallery') {
        setActiveTab('gallery');
      } else if (currentPath === '/' || currentPath === '/login') {
        navigateTo('/gallery');
      } else {
        navigateTo('/gallery');
      }
    }
  }, [currentPath, user]);

  // Load templates from database on mount
  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/templates');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTemplates();
    }
  }, [user]);

  const handleLogin = (sessionUser) => {
    setUser(sessionUser);
    localStorage.setItem('posterforge_session', JSON.stringify(sessionUser));
    navigateTo('/gallery');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('posterforge_session');
    setSelectedTemplate(null);
    setMobileMenuOpen(false);
    navigateTo('/login');
  };

  const handleSelectTemplate = (template, mode) => {
    setSelectedTemplate(template);
    navigateTo('/editor');
    setMobileMenuOpen(false);
  };

  const handleDuplicateTemplate = async (id) => {
    try {
      const res = await fetch(`/api/templates/${id}/duplicate`, {
        method: 'POST',
        headers: getAdminHeaders()
      });
      if (res.ok) {
        fetchTemplates();
      }
    } catch (err) {
      console.error('Duplicate failed:', err);
    }
  };

  const handleDeleteTemplate = async (id) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      const res = await fetch(`/api/templates/${id}`, {
        method: 'DELETE',
        headers: getAdminHeaders()
      });
      if (res.ok) {
        fetchTemplates();
        if (selectedTemplate && selectedTemplate.id === id) {
          setSelectedTemplate(null);
          navigateTo('/gallery');
        }
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleSaveTemplateConfig = async (config) => {
    if (!selectedTemplate) return;
    try {
      const res = await fetch(`/api/templates/${selectedTemplate.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAdminHeaders()
        },
        body: JSON.stringify({
          title: selectedTemplate.title,
          config
        })
      });
      if (res.ok) {
        alert('Template config saved successfully!');
        fetchTemplates();
      }
    } catch (err) {
      console.error('Save template config failed:', err);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setUploadPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;

    setSavingUpload(true);
    const formData = new FormData();
    formData.append('title', uploadTitle || 'Untitled Poster');
    formData.append('poster', uploadFile);
    
    const initialConfig = {
      photo: { x: 35, y: 930, width: 260, height: 400, radius: 0, circle: false, autoCrop: true, faceCenter: true, removeBg: true, blendMode: 'normal', shadow: true, shadowBlur: 18, shadowOpacity: 0.18, shadowDistance: 4, edgeFeather: 28, scale: 1.0, rotation: 0, anchorSide: 'left', rimLightColor: '#FFD700', rimLightOpacity: 0.10, rimLightThickness: 3, fadeDistance: 80 },
      name: { x: 140, y: 780, width: 800, height: 80, font: 'Bebas Neue', size: 64, weight: '700', spacing: 2, uppercase: true, align: 'center', color: '#FFFFFF', shadow: true, shadowBlur: 6, shadowOpacity: 0.25, autoResize: true, minSize: 42, maxSize: 70, maxLines: 1 },
      role: { x: 190, y: 880, width: 700, height: 45, font: 'Poppins', size: 28, weight: '600', spacing: 1, uppercase: false, align: 'center', color: '#222222', autoResize: true, minSize: 22, maxSize: 34, maxLines: 1 }
    };
    formData.append('config', JSON.stringify(initialConfig));

    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        body: formData,
        headers: getAdminHeaders()
      });
      if (res.ok) {
        const newTemplate = await res.json();
        setUploadTitle('');
        setUploadFile(null);
        setUploadPreview('');
        await fetchTemplates();
        handleSelectTemplate(newTemplate, 'editor');
      }
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setSavingUpload(false);
    }
  };

  // 1. Unauthenticated Gateway
  if (!user || currentPath === '/login') {
    return <Login onLogin={handleLogin} />;
  }

  // 2. Fullscreen Editor Mode (Admin only)
  if (currentPath === '/editor' && selectedTemplate && user.role === 'admin') {
    return (
      <TemplateEditor
        template={selectedTemplate}
        onSave={handleSaveTemplateConfig}
        onBack={() => {
          setSelectedTemplate(null);
          navigateTo('/gallery');
        }}
      />
    );
  }

  // 3. Isolated Supporter Portal view (Light Theme - Mobile Responsive)
  if (user.role === 'supporter') {
    return (
      <div className="flex flex-col h-screen overflow-hidden bg-slate-50">
        
        {/* Supporter Dashboard Header */}
        <header className="h-16 px-4 sm:px-8 flex items-center justify-between z-20 shrink-0 bg-white border-b border-slate-200 shadow-sm sticky top-0">
          <div className="flex items-center gap-2.5">
            <img src="/trsv_logo.png" className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-contain shrink-0 shadow-sm" alt="TRSV Logo" />
            <div>
              <h1 className="text-xs sm:text-sm font-black leading-none tracking-wide text-slate-900 font-poppins">
                TRSV <span className="text-amber-500">Design Studio</span>
              </h1>
              <span className="text-[9px] sm:text-[10px] font-extrabold mt-0.5 block tracking-widest uppercase text-emerald-600">Supporter Portal</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200">
              <div className="w-2 h-2 rounded-full animate-pulse bg-emerald-500 shrink-0"></div>
              <span className="text-[11px] sm:text-xs font-bold text-slate-800 truncate max-w-[100px] sm:max-w-[160px]">{user.profile?.name}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-[11px] sm:text-xs font-bold px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
            >
              <LogOut size={13} />
              <span className="hidden xs:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Supporter Workspace Content */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 relative">
          <UserPortal templates={templates} />
        </main>
      </div>
    );
  }

  // 4. Admin Dashboard layout (Mobile & Desktop Responsive)
  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-slate-50 text-slate-900">
      
      {/* Mobile Header Bar */}
      <header className="md:hidden h-14 px-4 bg-white border-b border-slate-200 flex items-center justify-between z-30 sticky top-0 shadow-sm">
        <div className="flex items-center gap-2.5">
          <img src="/trsv_logo.png" className="w-8 h-8 rounded-xl object-contain shrink-0 shadow-sm" alt="TRSV Logo" />
          <div>
            <h1 className="text-xs font-black leading-none tracking-wide text-slate-900 font-poppins">
              TRSV <span className="text-amber-500">Design Studio</span>
            </h1>
            <span className="text-[8px] font-extrabold mt-0.5 block tracking-widest uppercase text-blue-600">Admin Area</span>
          </div>
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 active:scale-95"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Mobile Drawer Overlay Backdrop */}
      {mobileMenuOpen && (
        <div 
          onClick={() => setMobileMenuOpen(false)}
          className="md:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-30"
        />
      )}

      {/* Sidebar Navigation (Desktop Fixed, Mobile Slide-over Drawer) */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 shadow-sm flex flex-col justify-between transform transition-transform duration-300 ease-in-out
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div>
          {/* Logo & Branding */}
          <div className="h-16 flex items-center px-5 gap-3 border-b border-slate-100">
            <img src="/trsv_logo.png" className="w-9 h-9 rounded-xl object-contain shrink-0 shadow-sm" alt="TRSV Logo" />
            <div>
              <h1 className="text-sm font-black leading-none tracking-wide text-slate-900 font-poppins">
                TRSV <span className="text-amber-500">Design Studio</span>
              </h1>
              <span className="text-[9px] font-extrabold mt-0.5 block tracking-widest uppercase text-blue-600">Template Studio</span>
            </div>
          </div>

          {/* Nav Items */}
          <div className="p-3 space-y-5 mt-2">
            
            {/* Admin Controls */}
            <div className="space-y-1">
              <span className="px-2 text-[9px] font-bold tracking-widest uppercase block mb-2 text-slate-400">Admin Area</span>
              <button
                onClick={() => { setSelectedTemplate(null); navigateTo('/gallery'); setMobileMenuOpen(false); }}
                className={`nav-item ${currentPath === '/gallery' ? 'active-yellow' : ''}`}
              >
                <LayoutTemplate size={17} />
                Template Gallery
              </button>
              <button
                onClick={() => { setSelectedTemplate(null); navigateTo('/upload'); setMobileMenuOpen(false); }}
                className={`nav-item ${currentPath === '/upload' ? 'active-blue' : ''}`}
              >
                <UploadCloud size={17} />
                Upload Poster
              </button>
              <button
                onClick={() => { setSelectedTemplate(null); navigateTo('/devanalytics'); setMobileMenuOpen(false); }}
                className={`nav-item ${currentPath === '/devanalytics' ? 'active-amber' : ''}`}
              >
                <Terminal size={17} />
                Dev Analytics
              </button>
            </div>
 
            <div className="h-[1px] bg-slate-100 my-2" />
 
            {/* Supporter View Controls */}
            <div className="space-y-1">
              <span className="px-2 text-[9px] font-bold tracking-widest uppercase block mb-2 text-slate-400">Supporter Preview</span>
              <button
                onClick={() => { setSelectedTemplate(null); navigateTo('/portal'); setMobileMenuOpen(false); }}
                className={`nav-item ${currentPath === '/portal' ? 'active-green' : ''}`}
              >
                <Users size={17} />
                Supporter Portal
              </button>
            </div>

          </div>
        </div>

        {/* Footer Branding & Logout */}
        <div className="p-3 space-y-2.5 border-t border-slate-100">
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200/60">
            <FolderHeart size={15} className="text-amber-600 animate-pulse shrink-0" />
            <div>
              <span className="text-[10px] font-bold block text-amber-900">Admin Session Active</span>
              <span className="text-[9px] text-amber-700/80">Full template access</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold bg-slate-50 border border-slate-200 text-slate-600 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-all active:scale-95 shadow-sm"
          >
            <LogOut size={14} />
            Logout Studio
          </button>
          <div className="text-center pt-1">
            <span className="text-[9px] font-bold text-amber-600 uppercase tracking-wider">Built by Surya</span>
          </div>
        </div>
      </aside>

      {/* Main Workspace Frame */}
      <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 relative bg-slate-50">
        {loading && activeTab === 'gallery' ? (
          <div className="absolute inset-0 flex items-center justify-center z-20 bg-white/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-amber-100 border border-amber-200">
                <RefreshCw size={22} className="animate-spin text-amber-600" />
              </div>
              <span className="text-sm font-bold text-slate-600">Syncing Templates...</span>
            </div>
          </div>
        ) : null}

        {/* GALLERY TAB */}
        {activeTab === 'gallery' && (
          <Gallery
            templates={templates}
            onSelectTemplate={handleSelectTemplate}
            onDuplicateTemplate={handleDuplicateTemplate}
            onDeleteTemplate={handleDeleteTemplate}
            onSwitchTab={setActiveTab}
          />
        )}

        {/* UPLOAD TAB */}
        {activeTab === 'upload' && (
          <div className="max-w-2xl mx-auto space-y-6 sm:space-y-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 font-poppins">
                Upload <span className="text-amber-500">AI Poster</span>
              </h1>
              <p className="text-xs sm:text-sm mt-1 text-slate-500">Upload any high-resolution AI poster to initialize editable layout layers.</p>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-6 p-5 sm:p-8 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest block mb-2 text-slate-500">Template Title</label>
                  <input
                    type="text"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="e.g. Telangana Student Wing Campaign"
                    className="pf-input"
                    required
                  />
                </div>

                {/* Upload drop container */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest block mb-2 text-slate-500">Poster Image File (PNG, JPG, WEBP)</label>
                  
                  {uploadPreview ? (
                    <div className="relative rounded-2xl overflow-hidden aspect-[3/4] max-h-[350px] sm:max-h-[400px] mx-auto flex items-center justify-center border border-slate-200 bg-slate-50 group">
                      <img 
                        src={uploadPreview} 
                        alt="Poster preview" 
                        className="max-h-full max-w-full object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => { setUploadFile(null); setUploadPreview(''); }}
                        className="absolute top-4 right-4 p-2 rounded-xl bg-slate-900/80 text-white hover:bg-red-600 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div 
                      onClick={() => document.getElementById('poster-file-input').click()}
                      className="border-2 border-dashed border-amber-300 hover:border-amber-500 bg-amber-50/40 hover:bg-amber-50/80 rounded-2xl py-10 sm:py-14 px-4 text-center cursor-pointer transition-all group"
                    >
                      <UploadCloud size={36} className="mx-auto mb-2.5 text-amber-500 group-hover:scale-110 transition-transform" />
                      <span className="text-xs sm:text-sm font-bold block text-slate-800">Click to select poster image</span>
                      <span className="text-[10px] sm:text-xs mt-1 block text-slate-400">Supports high-res images up to 50MB</span>
                    </div>
                  )}

                  <input
                    id="poster-file-input"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => navigateTo('/gallery')}
                  className="btn-ghost"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingUpload || !uploadFile}
                  className="btn-yellow flex items-center gap-1.5 disabled:opacity-40"
                >
                  {savingUpload ? (
                    <>
                      <RefreshCw size={15} className="animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Plus size={15} />
                      Create Template
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* USER PORTAL TAB */}
        {activeTab === 'user-portal' && (
          <UserPortal templates={templates} />
        )}

        {/* DEV PORTAL TAB */}
        {activeTab === 'dev' && (
          <DevPortal />
        )}
      </main>
    </div>
  );
}
