import React, { useState } from 'react';
import { Search, Edit, Copy, Trash2, Plus, LayoutTemplate, Zap, Star } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Gallery({ templates, onSelectTemplate, onDuplicateTemplate, onDeleteTemplate, onSwitchTab }) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTemplates = templates.filter(t =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 sm:space-y-8 p-1">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="badge-yellow text-[9px] sm:text-[10px]">Admin Studio</span>
            <span className="badge-blue text-[9px] sm:text-[10px]">{templates.length} Templates</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 font-poppins">
            Template <span className="text-amber-500">Gallery</span>
          </h1>
          <p className="text-xs sm:text-sm mt-1 text-slate-500">Select an existing poster template to edit layout boundaries or personalize.</p>
        </div>
        <button
          onClick={() => onSwitchTab('upload')}
          className="btn-yellow w-full sm:w-auto flex items-center justify-center gap-2 shadow-md hover:shadow-lg py-2.5 sm:py-2"
        >
          <Plus size={17} />
          Create Template
        </button>
      </div>

      {/* Search bar */}
      <div className="relative max-w-md w-full">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input
          type="text"
          placeholder="Search templates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pf-input pl-10 py-2.5 shadow-sm text-sm"
        />
      </div>

      {/* Grid */}
      {filteredTemplates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 rounded-2xl border-2 border-dashed border-slate-200 bg-white/60">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 bg-amber-50 border border-amber-200 text-amber-600">
            <LayoutTemplate size={28} />
          </div>
          <h3 className="text-lg font-bold text-slate-800 font-poppins">No templates found</h3>
          <p className="text-sm text-center mt-1 max-w-xs text-slate-500">
            {searchQuery ? "Try checking your search query spelling." : "Upload a new AI-generated poster to create your first template."}
          </p>
          {!searchQuery && (
            <button
              onClick={() => onSwitchTab('upload')}
              className="btn-yellow flex items-center gap-1.5 mt-5"
            >
              <Plus size={15} />
              Upload a poster now
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {filteredTemplates.map((template, idx) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: idx * 0.04 }}
              className="template-card group bg-white border border-slate-200 shadow-sm hover:shadow-xl hover:border-blue-500 transition-all rounded-2xl overflow-hidden flex flex-col justify-between"
            >
              {/* Image Preview */}
              <div className="relative aspect-[3/4] overflow-hidden bg-slate-100 shrink-0">
                <img
                  src={template.image_url}
                  alt={template.title}
                  className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
                  loading="lazy"
                />

                {/* Hover overlay (Desktop Only) */}
                <div className="hidden md:flex absolute inset-0 flex-col justify-center items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-slate-900/75 backdrop-blur-xs">
                  {/* Top delete */}
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteTemplate(template.id); }}
                    className="absolute top-3 right-3 p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-colors border border-red-500/30"
                    title="Delete Template"
                  >
                    <Trash2 size={14} />
                  </button>

                  <div className="flex gap-2">
                    <button
                      onClick={() => onSelectTemplate(template, 'editor')}
                      className="p-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-500 transition-all shadow-md active:scale-95 flex items-center gap-1.5 text-xs font-bold"
                      title="Edit Canvas Template"
                    >
                      <Edit size={15} />
                      Edit Layout
                    </button>
                    <button
                      onClick={() => onDuplicateTemplate(template.id)}
                      className="p-2.5 rounded-xl bg-white/20 text-white hover:bg-white/30 transition-all backdrop-blur-md active:scale-95"
                      title="Duplicate Template"
                    >
                      <Copy size={15} />
                    </button>
                    <button
                      onClick={() => onSelectTemplate(template, 'user-portal')}
                      className="p-2.5 rounded-xl bg-amber-400 text-slate-950 hover:bg-amber-300 transition-all shadow-md active:scale-95 flex items-center gap-1.5 text-xs font-black"
                      title="Personalize & Download"
                    >
                      <Zap size={14} />
                      Use
                    </button>
                  </div>
                </div>

                {/* Layer count badge */}
                <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-900/80 text-white backdrop-blur-md border border-white/10">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-[10px] font-bold text-slate-200">{Object.keys(template.config || {}).length} Layers</span>
                </div>
              </div>

              {/* Card Footer Title info */}
              <div className="p-3 flex justify-between items-center bg-white border-t border-slate-100 flex-1 min-h-[58px]">
                <div className="truncate flex-1">
                  <h3 className="text-xs font-bold text-slate-900 truncate font-poppins">
                    {template.title}
                  </h3>
                  <p className="text-[9px] text-slate-400 mt-0.5">
                    Updated {new Date(template.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => onSelectTemplate(template, 'user-portal')}
                  className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors border border-amber-200/60 ml-2"
                >
                  <Star size={12} />
                </button>
              </div>

              {/* Mobile quick-action bar (Visible on Mobile only for touch friendliness) */}
              <div className="md:hidden flex border-t border-slate-100 bg-slate-50/80 px-2 py-2 gap-1.5 justify-between items-center shrink-0">
                <button
                  onClick={() => onSelectTemplate(template, 'user-portal')}
                  className="flex-1 py-1.5 px-2 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center gap-1 text-[10px] font-extrabold shadow-sm active:scale-95"
                >
                  <Zap size={11} />
                  Use
                </button>
                <button
                  onClick={() => onSelectTemplate(template, 'editor')}
                  className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 flex items-center justify-center active:scale-95"
                  title="Edit Layout"
                >
                  <Edit size={12} />
                </button>
                <button
                  onClick={() => onDuplicateTemplate(template.id)}
                  className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 flex items-center justify-center active:scale-95"
                  title="Duplicate"
                >
                  <Copy size={12} />
                </button>
                <button
                  onClick={() => onDeleteTemplate(template.id)}
                  className="p-1.5 rounded-lg bg-red-50 border border-red-200 text-red-500 flex items-center justify-center active:scale-95"
                  title="Delete"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
