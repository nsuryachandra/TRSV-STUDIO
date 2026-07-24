import React, { useState, useEffect } from 'react';
import { Type, Sparkles, Image as ImageIcon, Sliders, ChevronDown, ChevronRight } from 'lucide-react';

const getHexColor = (color) => {
  if (!color) return '#000000';
  const cleanColor = color.trim();
  if (cleanColor.startsWith('#')) {
    if (cleanColor.length === 4) {
      return '#' + cleanColor[1] + cleanColor[1] + cleanColor[2] + cleanColor[2] + cleanColor[3] + cleanColor[3];
    }
    return cleanColor.substring(0, 7);
  }
  if (cleanColor === 'transparent') return '#000000';
  if (cleanColor.startsWith('rgba') || cleanColor.startsWith('rgb')) {
    const match = cleanColor.match(/\d+/g);
    if (match && match.length >= 3) {
      const r = parseInt(match[0]);
      const g = parseInt(match[1]);
      const b = parseInt(match[2]);
      return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }
  }
  return '#000000';
};

export default function PropertiesPanel({ selectedId, setSelectedId, config, onChange }) {
  const [expandedSection, setExpandedSection] = useState('photo');

  // Synchronize expansion with canvas selections
  useEffect(() => {
    if (selectedId) {
      setExpandedSection(selectedId);
    }
  }, [selectedId]);

  const toggleSection = (section) => {
    if (expandedSection === section) {
      setExpandedSection(null);
    } else {
      setExpandedSection(section);
      if (setSelectedId) {
        setSelectedId(section);
      }
    }
  };

  // Helper to update specific section config
  const updateSectionValue = (section, key, value) => {
    onChange({
      ...config,
      [section]: {
        ...config[section],
        [key]: value
      }
    });
  };

  const photoConfig = config.photo || {};
  const nameConfig = config.name || {};
  const roleConfig = config.role || {};

  const applyPreset1 = () => {
    onChange({
      photo: {
        x: 661,
        y: 783,
        width: 420,
        height: 440,
        radius: 0,
        circle: false,
        autoCrop: true,
        faceCenter: true,
        removeBg: true,
        blendMode: 'normal',
        shadow: true,
        shadowBlur: 18,
        shadowOpacity: 0.18,
        shadowDistance: 4,
        edgeFeather: 6,
        leftFeather: 0,
        rightFeather: 0,
        scale: 1.0,
        rotation: 0,
        anchorSide: 'right',
        rimLightColor: '#FFD700',
        rimLightOpacity: 0.10,
        rimLightThickness: 3,
        fadeDistance: 80
      },
      name: {
        x: 270,
        y: 1240,
        width: 540,
        height: 80,
        font: 'Anton',
        size: 64,
        weight: '700',
        spacing: 2,
        uppercase: true,
        align: 'center',
        color: '#FFFFFF',
        shadow: true,
        shadowBlur: 6,
        shadowOpacity: 0.25,
        autoResize: true,
        minSize: 42,
        maxSize: 70,
        maxLines: 1
      },
      role: {
        x: 200,
        y: 1310,
        width: 680,
        height: 45,
        font: 'Poppins',
        size: 28,
        weight: '600',
        spacing: 1,
        uppercase: false,
        align: 'center',
        color: '#222222',
        autoResize: true,
        minSize: 22,
        maxSize: 34,
        maxLines: 1
      }
    });
  };

  const applyPreset2 = () => {
    onChange({
      photo: {
        x: 35,
        y: 783,
        width: 420,
        height: 440,
        radius: 0,
        circle: false,
        autoCrop: true,
        faceCenter: true,
        removeBg: true,
        blendMode: 'normal',
        shadow: true,
        shadowBlur: 18,
        shadowOpacity: 0.18,
        shadowDistance: 4,
        edgeFeather: 6,
        leftFeather: 0,
        rightFeather: 0,
        scale: 1.0,
        rotation: 0,
        anchorSide: 'left',
        rimLightColor: '#FFD700',
        rimLightOpacity: 0.10,
        rimLightThickness: 3,
        fadeDistance: 80
      },
      name: {
        x: 270,
        y: 1240,
        width: 540,
        height: 80,
        font: 'Anton',
        size: 64,
        weight: '700',
        spacing: 2,
        uppercase: true,
        align: 'center',
        color: '#FFFFFF',
        shadow: true,
        shadowBlur: 6,
        shadowOpacity: 0.25,
        autoResize: true,
        minSize: 42,
        maxSize: 70,
        maxLines: 1
      },
      role: {
        x: 200,
        y: 1310,
        width: 680,
        height: 45,
        font: 'Poppins',
        size: 28,
        weight: '600',
        spacing: 1,
        uppercase: false,
        align: 'center',
        color: '#222222',
        autoResize: true,
        minSize: 22,
        maxSize: 34,
        maxLines: 1
      }
    });
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 space-y-4 bg-white">
      {/* Panel Header */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 shrink-0">
        <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
          <Sliders size={16} />
        </div>
        <div>
          <h2 className="text-xs font-bold text-slate-800 tracking-wider uppercase">Template Config</h2>
          <p className="text-[10px] text-slate-500">Manage layout & styling locks</p>
        </div>
      </div>

      {/* 🚀 QUICK LAYOUT PRESETS */}
      <div className="border border-indigo-100 rounded-xl p-3 bg-indigo-50/20 shrink-0 space-y-2">
        <div className="flex items-center gap-1.5 text-indigo-600">
          <Sparkles size={13} className="animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Quick Layout Presets</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={applyPreset1}
            className="flex flex-col items-center justify-center p-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-center smooth-transition group shadow-sm"
          >
            <span className="text-[10px] font-bold text-slate-700 group-hover:text-indigo-650">Preset 1</span>
            <span className="text-[8px] text-slate-400 mt-0.5 font-medium">Bottom-Right Photo</span>
          </button>
          
          <button
            type="button"
            onClick={applyPreset2}
            className="flex flex-col items-center justify-center p-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-center smooth-transition group shadow-sm"
          >
            <span className="text-[10px] font-bold text-slate-700 group-hover:text-indigo-650">Preset 2</span>
            <span className="text-[8px] text-slate-400 mt-0.5 font-medium">Bottom-Left Photo</span>
          </button>
        </div>
      </div>

      {/* 📸 HERO PORTRAIT SECTION */}
      <div className="border border-slate-200/80 rounded-xl overflow-hidden bg-white shrink-0 shadow-sm">
        <button
          onClick={() => toggleSection('photo')}
          className={`w-full flex items-center justify-between p-3 transition-colors ${
            expandedSection === 'photo' ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50 text-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <ImageIcon size={14} />
            <span className="text-xs font-bold uppercase tracking-wider">📸 Hero Portrait</span>
          </div>
          {expandedSection === 'photo' ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        {expandedSection === 'photo' && (
          <div className="p-4 space-y-4 border-t border-slate-100 bg-white">
            {/* Anchor Side Preset */}
            <div>
              <label className="text-[9px] text-slate-500 block mb-1 uppercase tracking-wider font-bold">Anchor Side Positioning</label>
              <div className="flex rounded-lg bg-slate-50 p-0.5 border border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    const h = photoConfig.height || 400;
                    onChange({
                      ...config,
                      photo: {
                        ...photoConfig,
                        anchorSide: 'left',
                        x: 35,
                        y: 1350 - h - 20
                      }
                    });
                  }}
                  className={`flex-1 py-1 text-center text-[10px] font-bold rounded-md smooth-transition ${
                    (photoConfig.anchorSide || 'left') === 'left'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Left Margin (35px)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const w = photoConfig.width || 260;
                    const h = photoConfig.height || 400;
                    onChange({
                      ...config,
                      photo: {
                        ...photoConfig,
                        anchorSide: 'right',
                        x: 1080 - w - 35,
                        y: 1350 - h - 20
                      }
                    });
                  }}
                  className={`flex-1 py-1 text-center text-[10px] font-bold rounded-md smooth-transition ${
                    photoConfig.anchorSide === 'right'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Right Margin (35px)
                </button>
              </div>
            </div>

            {/* Position & Size coordinates */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Position & Dimensions</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] text-slate-500 block mb-0.5">X Position (px)</label>
                  <input
                    type="number"
                    value={Math.round(photoConfig.x || 0)}
                    onChange={(e) => updateSectionValue('photo', 'x', parseInt(e.target.value) || 0)}
                    className="w-full text-[11px] py-1 px-2 rounded-lg bg-white border border-slate-200 text-slate-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-slate-500 block mb-0.5">Y Position (px)</label>
                  <input
                    type="number"
                    value={Math.round(photoConfig.y || 0)}
                    onChange={(e) => updateSectionValue('photo', 'y', parseInt(e.target.value) || 0)}
                    className="w-full text-[11px] py-1 px-2 rounded-lg bg-white border border-slate-200 text-slate-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-slate-500 block mb-0.5">Width (px)</label>
                  <input
                    type="number"
                    value={Math.round(photoConfig.width || 260)}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 260;
                      // Clamp width between 245 and 285
                      const clamped = Math.min(285, Math.max(245, val));
                      updateSectionValue('photo', 'width', clamped);
                    }}
                    className="w-full text-[11px] py-1 px-2 rounded-lg bg-white border border-slate-200 text-slate-900 font-bold outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100"
                  />
                  <span className="text-[8px] text-slate-400 block mt-0.5 font-semibold">Limit: 245 - 285px</span>
                </div>
                <div>
                  <label className="text-[9px] text-slate-500 block mb-0.5">Height (px)</label>
                  <input
                    type="number"
                    value={Math.round(photoConfig.height || 400)}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 400;
                      // Clamp height between 380 and 430
                      const clamped = Math.min(430, Math.max(380, val));
                      updateSectionValue('photo', 'height', clamped);
                    }}
                    className="w-full text-[11px] py-1 px-2 rounded-lg bg-white border border-slate-200 text-slate-900 font-bold outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100"
                  />
                  <span className="text-[8px] text-slate-400 block mt-0.5 font-semibold">Limit: 380 - 430px</span>
                </div>
              </div>
            </div>

            {/* AI Settings */}
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1">
                <Sparkles size={11} />
                <span>AI Operations</span>
              </div>
              
              <div className="flex justify-between items-center text-xs">
                <div>
                  <span className="text-slate-700 font-bold block">AI Background Removal</span>
                  <span className="text-[9px] text-slate-400 font-medium">Run local segmentation</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={photoConfig.removeBg !== false} 
                    onChange={(e) => updateSectionValue('photo', 'removeBg', e.target.checked)} 
                    className="sr-only peer" 
                  />
                  <div className="w-8 h-4 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              <div className="flex justify-between items-center text-xs">
                <div>
                  <span className="text-slate-700 font-bold block">Smart Auto Crop</span>
                  <span className="text-[9px] text-slate-400 font-medium">Head and shoulders framing</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={photoConfig.autoCrop !== false} 
                    onChange={(e) => updateSectionValue('photo', 'autoCrop', e.target.checked)} 
                    className="sr-only peer" 
                  />
                  <div className="w-8 h-4 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            </div>

            {/* Photoshop Blending & Masking */}
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Photoshop Blending</span>
              
              <div>
                <div className="flex justify-between text-[9px] mb-0.5">
                  <span className="text-slate-500 font-medium">Bottom Fade Gradient Distance</span>
                  <span className="text-slate-800 font-bold">{(photoConfig.fadeDistance !== undefined ? photoConfig.fadeDistance : 80)}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="150"
                  value={photoConfig.fadeDistance !== undefined ? photoConfig.fadeDistance : 80}
                  onChange={(e) => updateSectionValue('photo', 'fadeDistance', parseInt(e.target.value))}
                  className="w-full accent-indigo-500 h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[9px] mb-0.5">
                  <span className="text-slate-500 font-medium">Bottom Edge Feathering</span>
                  <span className="text-slate-800 font-bold">{(photoConfig.edgeFeather !== undefined ? photoConfig.edgeFeather : 28)}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="80"
                  value={photoConfig.edgeFeather !== undefined ? photoConfig.edgeFeather : 28}
                  onChange={(e) => updateSectionValue('photo', 'edgeFeather', parseInt(e.target.value))}
                  className="w-full accent-indigo-500 h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[9px] mb-0.5">
                  <span className="text-slate-500 font-medium">Left Edge Feathering</span>
                  <span className="text-slate-800 font-bold">{(photoConfig.leftFeather !== undefined ? photoConfig.leftFeather : 0)}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={photoConfig.leftFeather !== undefined ? photoConfig.leftFeather : 0}
                  onChange={(e) => updateSectionValue('photo', 'leftFeather', parseInt(e.target.value))}
                  className="w-full accent-indigo-500 h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[9px] mb-0.5">
                  <span className="text-slate-500 font-medium">Right Edge Feathering</span>
                  <span className="text-slate-800 font-bold">{(photoConfig.rightFeather !== undefined ? photoConfig.rightFeather : 0)}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={photoConfig.rightFeather !== undefined ? photoConfig.rightFeather : 0}
                  onChange={(e) => updateSectionValue('photo', 'rightFeather', parseInt(e.target.value))}
                  className="w-full accent-indigo-500 h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>

            {/* Depth & Light Lighting */}
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Depth & Lighting</span>

              <div className="flex justify-between items-center text-xs">
                <div>
                  <span className="text-slate-700 font-bold block">Photoshop Drop Shadow</span>
                  <span className="text-[9px] text-slate-400 font-medium">Soft campaigns background shadow</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={photoConfig.shadow !== false} 
                    onChange={(e) => updateSectionValue('photo', 'shadow', e.target.checked)} 
                    className="sr-only peer" 
                  />
                  <div className="w-8 h-4 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {photoConfig.shadow !== false && (
                <div className="space-y-2 pl-2 border-l border-slate-200">
                  <div>
                    <div className="flex justify-between text-[9px] mb-0.5">
                      <span className="text-slate-500 font-medium">Shadow Offset (Y Distance)</span>
                      <span className="text-slate-800 font-bold">{(photoConfig.shadowDistance || 4)}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="20"
                      value={photoConfig.shadowDistance || 4}
                      onChange={(e) => updateSectionValue('photo', 'shadowDistance', parseInt(e.target.value))}
                      className="w-full accent-indigo-500 h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[9px] mb-0.5">
                      <span className="text-slate-500 font-medium">Shadow Blur</span>
                      <span className="text-slate-800 font-bold">{(photoConfig.shadowBlur || 18)}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="40"
                      value={photoConfig.shadowBlur || 18}
                      onChange={(e) => updateSectionValue('photo', 'shadowBlur', parseInt(e.target.value))}
                      className="w-full accent-indigo-500 h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center text-xs pt-1">
                <div>
                  <span className="text-slate-700 font-bold block">Warm Gold Rim Light</span>
                  <span className="text-[9px] text-slate-400 font-medium">Adds subtle warm contour outline</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={(photoConfig.rimLightOpacity || 0) > 0} 
                    onChange={(e) => {
                      onChange({
                        ...config,
                        photo: {
                          ...photoConfig,
                          rimLightOpacity: e.target.checked ? 0.10 : 0,
                          rimLightThickness: 3,
                          rimLightColor: '#FFD700'
                        }
                      });
                    }} 
                    className="sr-only peer" 
                  />
                  <div className="w-8 h-4 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {(photoConfig.rimLightOpacity || 0) > 0 && (
                <div className="space-y-2 pl-2 border-l border-slate-200 pt-1">
                  <div>
                    <div className="flex justify-between text-[9px] mb-0.5">
                      <span className="text-slate-500 font-medium">Rim Light Thickness</span>
                      <span className="text-slate-800 font-bold">{(photoConfig.rimLightThickness || 3)}px</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={photoConfig.rimLightThickness || 3}
                      onChange={(e) => updateSectionValue('photo', 'rimLightThickness', parseInt(e.target.value))}
                      className="w-full accent-indigo-500 h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[9px] mb-0.5">
                      <span className="text-slate-500 font-medium">Rim Light Intensity (Opacity)</span>
                      <span className="text-slate-800 font-bold">{Math.round((photoConfig.rimLightOpacity || 0.10) * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.05"
                      max="0.50"
                      step="0.05"
                      value={photoConfig.rimLightOpacity || 0.10}
                      onChange={(e) => updateSectionValue('photo', 'rimLightOpacity', parseFloat(e.target.value))}
                      className="w-full accent-indigo-500 h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 font-bold block mb-1">Rim Light Tone</span>
                    <div className="flex gap-1.5">
                      {[
                        { name: 'Gold', value: '#FFD700' },
                        { name: 'Amber', value: '#FF8C00' },
                        { name: 'White', value: '#FFFFFF' }
                      ].map((colorOpt) => (
                        <button
                          key={colorOpt.value}
                          type="button"
                          onClick={() => updateSectionValue('photo', 'rimLightColor', colorOpt.value)}
                          className={`px-2.5 py-1 rounded-lg text-[9px] font-bold border transition-colors ${
                            (photoConfig.rimLightColor || '#FFD700') === colorOpt.value
                              ? 'bg-indigo-600 border-indigo-500 text-white'
                              : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 shadow-xs'
                          }`}
                        >
                          {colorOpt.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 👤 NAME SECTION */}
      <div className="border border-slate-200/80 rounded-xl overflow-hidden bg-white shrink-0 shadow-sm">
        <button
          onClick={() => toggleSection('name')}
          className={`w-full flex items-center justify-between p-3 transition-colors ${
            expandedSection === 'name' ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50 text-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <Type size={14} />
            <span className="text-xs font-bold uppercase tracking-wider">👤 Supporter Name</span>
          </div>
          {expandedSection === 'name' ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        {expandedSection === 'name' && (
          <div className="p-4 space-y-4 border-t border-slate-100 bg-white">
            {/* Position coordinates */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Layout Position</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] text-slate-500 block mb-0.5">X Position (px)</label>
                  <input
                    type="number"
                    value={Math.round(nameConfig.x || 0)}
                    onChange={(e) => updateSectionValue('name', 'x', parseInt(e.target.value) || 0)}
                    className="w-full text-[11px] py-1 px-2 rounded-lg bg-white border border-slate-200 text-slate-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-slate-500 block mb-0.5">Y Position (px)</label>
                  <input
                    type="number"
                    value={Math.round(nameConfig.y || 0)}
                    onChange={(e) => updateSectionValue('name', 'y', parseInt(e.target.value) || 0)}
                    className="w-full text-[11px] py-1 px-2 rounded-lg bg-white border border-slate-200 text-slate-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100"
                  />
                </div>
              </div>
            </div>

            {/* Font constraints */}
            <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
              <div>
                <label className="text-[9px] text-slate-500 block mb-0.5">Font Family</label>
                <select
                  value={nameConfig.font || 'Montserrat'}
                  onChange={(e) => updateSectionValue('name', 'font', e.target.value)}
                  className="w-full text-[11px] py-1 px-2 rounded-lg bg-white border border-slate-200 text-slate-900 font-bold outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 cursor-pointer"
                >
                  <option value="Montserrat">Montserrat (Bold)</option>
                  <option value="Anton">Anton (Heavy)</option>
                  <option value="Bebas Neue">Bebas Neue (Tall)</option>
                  <option value="Oswald">Oswald (Sleek)</option>
                  <option value="Playfair Display">Playfair Serif</option>
                  <option value="Inter">Inter (Minimal)</option>
                </select>
              </div>
              <div>
                <label className="text-[9px] text-slate-500 block mb-0.5">Base Font Size (px)</label>
                <input
                  type="number"
                  min="42"
                  max="70"
                  value={nameConfig.size || 64}
                  onChange={(e) => {
                    const val = Math.max(42, Math.min(70, parseInt(e.target.value) || 64));
                    updateSectionValue('name', 'size', val);
                  }}
                  className="w-full text-[11px] py-1 px-2 rounded-lg bg-white border border-slate-200 text-slate-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100"
                />
              </div>
            </div>

            {/* Text Color */}
            <div>
              <label className="text-[9px] text-slate-500 block mb-1">Text Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={getHexColor(nameConfig.color || '#FFFFFF')}
                  onChange={(e) => updateSectionValue('name', 'color', e.target.value)}
                  className="w-7 h-7 rounded border-0 bg-transparent cursor-pointer"
                />
                <input
                  type="text"
                  value={nameConfig.color || '#FFFFFF'}
                  onChange={(e) => updateSectionValue('name', 'color', e.target.value)}
                  className="flex-1 text-[11px] py-1 px-2 rounded-lg bg-white border border-slate-200 text-slate-900 font-mono outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100"
                />
              </div>
            </div>

            {/* Letter Spacing */}
            <div>
              <div className="flex justify-between text-[10px] mb-0.5">
                <span className="text-slate-500 font-medium">Letter Spacing</span>
                <span className="text-slate-800 font-bold">{nameConfig.spacing || 2}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                value={nameConfig.spacing || 2}
                onChange={(e) => updateSectionValue('name', 'spacing', parseInt(e.target.value))}
                className="w-full accent-indigo-500 h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Max Width */}
            <div>
              <label className="text-[9px] text-slate-500 block mb-0.5">Max Width Constraint (px)</label>
              <input
                type="number"
                value={Math.round(nameConfig.width || 800)}
                onChange={(e) => updateSectionValue('name', 'width', parseInt(e.target.value) || 300)}
                className="w-full text-[11px] py-1 px-2 rounded-lg bg-white border border-slate-200 text-slate-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100"
              />
              <span className="text-[9px] text-slate-400 mt-1 block font-medium">Names exceeding this width automatically shrink down to a minimum of 42px.</span>
            </div>
          </div>
        )}
      </div>

      {/* 🏷 ROLE SECTION */}
      <div className="border border-slate-200/80 rounded-xl overflow-hidden bg-white shrink-0 shadow-sm">
        <button
          onClick={() => toggleSection('role')}
          className={`w-full flex items-center justify-between p-3 transition-colors ${
            expandedSection === 'role' ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50 text-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <Type size={14} className="text-amber-500" />
            <span className="text-xs font-bold uppercase tracking-wider">🏷 Supporter Role</span>
          </div>
          {expandedSection === 'role' ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        {expandedSection === 'role' && (
          <div className="p-4 space-y-4 border-t border-slate-100 bg-white">
            {/* Position coordinates */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Layout Position</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] text-slate-500 block mb-0.5">X Position (px)</label>
                  <input
                    type="number"
                    value={Math.round(roleConfig.x || 0)}
                    onChange={(e) => updateSectionValue('role', 'x', parseInt(e.target.value) || 0)}
                    className="w-full text-[11px] py-1 px-2 rounded-lg bg-white border border-slate-200 text-slate-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-slate-500 block mb-0.5">Y Position (px)</label>
                  <input
                    type="number"
                    value={Math.round(roleConfig.y || 0)}
                    onChange={(e) => updateSectionValue('role', 'y', parseInt(e.target.value) || 0)}
                    className="w-full text-[11px] py-1 px-2 rounded-lg bg-white border border-slate-200 text-slate-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100"
                  />
                </div>
              </div>
            </div>

            {/* Font constraints */}
            <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
              <div>
                <label className="text-[9px] text-slate-500 block mb-0.5">Font Family</label>
                <select
                  value={roleConfig.font || 'Poppins'}
                  onChange={(e) => updateSectionValue('role', 'font', e.target.value)}
                  className="w-full text-[11px] py-1 px-2 rounded-lg bg-white border border-slate-200 text-slate-900 font-bold outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 cursor-pointer"
                >
                  <option value="Poppins">Poppins (SemiBold)</option>
                  <option value="Inter">Inter (Sans)</option>
                  <option value="Montserrat">Montserrat</option>
                  <option value="Oswald">Oswald</option>
                  <option value="Playfair Display">Playfair Serif</option>
                </select>
              </div>
              <div>
                <label className="text-[9px] text-slate-500 block mb-0.5">Base Font Size (px)</label>
                <input
                  type="number"
                  min="22"
                  max="34"
                  value={roleConfig.size || 28}
                  onChange={(e) => {
                    const val = Math.max(22, Math.min(34, parseInt(e.target.value) || 28));
                    updateSectionValue('role', 'size', val);
                  }}
                  className="w-full text-[11px] py-1 px-2 rounded-lg bg-white border border-slate-200 text-slate-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100"
                />
              </div>
            </div>

            {/* Text Color */}
            <div>
              <label className="text-[9px] text-slate-500 block mb-1">Text Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={getHexColor(roleConfig.color || '#222222')}
                  onChange={(e) => updateSectionValue('role', 'color', e.target.value)}
                  className="w-7 h-7 rounded border-0 bg-transparent cursor-pointer"
                />
                <input
                  type="text"
                  value={roleConfig.color || '#222222'}
                  onChange={(e) => updateSectionValue('role', 'color', e.target.value)}
                  className="flex-1 text-[11px] py-1 px-2 rounded-lg bg-white border border-slate-200 text-slate-900 font-mono outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100"
                />
              </div>
            </div>

            {/* Max Width */}
            <div>
              <label className="text-[9px] text-slate-500 block mb-0.5">Max Width Constraint (px)</label>
              <input
                type="number"
                value={Math.round(roleConfig.width || 700)}
                onChange={(e) => updateSectionValue('role', 'width', parseInt(e.target.value) || 200)}
                className="w-full text-[11px] py-1 px-2 rounded-lg bg-white border border-slate-200 text-slate-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100"
              />
              <span className="text-[9px] text-slate-400 mt-1 block font-medium">Roles exceeding this width automatically shrink down to a minimum of 22px.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
