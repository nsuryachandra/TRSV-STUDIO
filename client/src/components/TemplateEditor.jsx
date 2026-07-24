import React, { useState, useEffect, useRef } from 'react';
import { Stage, Layer, Image as KonvaImage, Rect, Text, Group, Line, Transformer } from 'react-konva';
import { 
  Undo2, Redo2, Save, Eye, Download, Grid, Move, MousePointer, 
  Trash2, Copy, Sparkles, Image as ImageIcon, Type, Minimize2, ZoomIn, ZoomOut, ArrowLeft
} from 'lucide-react';
import { detectPlaceholder } from '../utils/detection';
import PropertiesPanel from './PropertiesPanel';
import LivePreview from './LivePreview';


const DEFAULT_CONFIGS = {
  photo: { 
    width: 260, 
    height: 400, 
    x: 35,
    y: 930,
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
    edgeFeather: 28,
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
    width: 800, 
    height: 80, 
    font: 'Montserrat', 
    size: 64, 
    weight: '900', 
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
    width: 700, 
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
};

export default function TemplateEditor({ template, onSave, onBack }) {
  // Load original poster image
  const [imageObj, setImageObj] = useState(null);
  const [offscreenCanvas, setOffscreenCanvas] = useState(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  // Canvas Viewport State (Zoom & Pan)
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [stageDimensions, setStageDimensions] = useState({ width: 600, height: 600 });
  
  // App states
  const [activeTool, setActiveTool] = useState('select'); // 'select', 'photo', 'name', 'role', 'move'
  const [clickDetectMode, setClickDetectMode] = useState(false);
  const [gridEnabled, setGridEnabled] = useState(false);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [selectedId, setSelectedId] = useState(null); // 'photo', 'name', 'role'
  
  // Main Template Config
  const [config, setConfig] = useState({
    photo: null,
    name: null,
    role: null
  });

  // Undo/Redo stacks
  const [history, setHistory] = useState([]);
  const [historyIdx, setHistoryIdx] = useState(-1);

  const stageContainerRef = useRef(null);
  const stageRef = useRef(null);
  const trRef = useRef(null);
  const imageRef = useRef(null);
  const isNudgingRef = useRef(false);
  const latestConfigRef = useRef(config);

  // Sync latestConfigRef
  useEffect(() => {
    latestConfigRef.current = config;
  }, [config]);

  // Resize stage container dynamically
  useEffect(() => {
    if (!stageContainerRef.current) return;
    const updateDimensions = () => {
      setStageDimensions({
        width: stageContainerRef.current.clientWidth,
        height: stageContainerRef.current.clientHeight
      });
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Load Image and Setup config
  useEffect(() => {
    if (!template) return;
    
    // Setup starting config
    setConfig({
      photo: template.config?.photo || null,
      name: template.config?.name || null,
      role: template.config?.role || null
    });

    // Reset history
    setHistory([JSON.parse(JSON.stringify(template.config || {}))]);
    setHistoryIdx(0);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = template.image_url;
    img.onload = () => {
      setImageObj(img);
      setImageSize({ width: 1080, height: 1350 });

      // Create offscreen canvas for Click & Detect pixel lookups
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1350;
      canvas.getContext('2d').drawImage(img, 0, 0, 1080, 1350);
      setOffscreenCanvas(canvas);

      // Fit Image on screen initially
      fitImageToStage(1080, 1350);
    };
    img.onerror = () => {
      // Proxy URL fallback
      img.src = 'http://localhost:3001' + template.image_url;
    };
  }, [template]);

  // Fit image helper
  const fitImageToStage = (imgW, imgH) => {
    if (!stageContainerRef.current) return;
    const stageW = stageContainerRef.current.clientWidth;
    const stageH = stageContainerRef.current.clientHeight;

    const scaleX = (stageW - 40) / imgW;
    const scaleY = (stageH - 40) / imgH;
    const newScale = Math.min(scaleX, scaleY, 1); // don't zoom past 100% initial

    setScale(newScale);
    setPosition({
      x: (stageW - imgW * newScale) / 2,
      y: (stageH - imgH * newScale) / 2
    });
  };

  // Push state to history for Undo/Redo
  const pushHistory = (newConfig) => {
    const updatedHistory = history.slice(0, historyIdx + 1);
    updatedHistory.push(JSON.parse(JSON.stringify(newConfig)));
    setHistory(updatedHistory);
    setHistoryIdx(updatedHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIdx > 0) {
      const prevIdx = historyIdx - 1;
      setHistoryIdx(prevIdx);
      setConfig(JSON.parse(JSON.stringify(history[prevIdx])));
      setSelectedId(null);
    }
  };

  const handleRedo = () => {
    if (historyIdx < history.length - 1) {
      const nextIdx = historyIdx + 1;
      setHistoryIdx(nextIdx);
      setConfig(JSON.parse(JSON.stringify(history[nextIdx])));
      setSelectedId(null);
    }
  };

  // Handle configuration changes from properties panel or drag-transforms
  const handleConfigChange = (newConfig) => {
    setConfig(newConfig);
    pushHistory(newConfig);
  };

  // Zoom controls
  const handleZoom = (factor) => {
    setScale(prev => Math.max(0.1, Math.min(10, prev * factor)));
  };

  const handleWheel = (e) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    const oldScale = scale;

    const zoomFactor = 1.05;
    const newScale = e.evt.deltaY < 0 ? oldScale * zoomFactor : oldScale / zoomFactor;
    setScale(Math.max(0.1, Math.min(10, newScale)));

    const mousePointTo = {
      x: (pointer.x - position.x) / oldScale,
      y: (pointer.y - position.y) / oldScale,
    };

    setPosition({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
  };

  // Drawing mouse handlers for drag-to-draw
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });

  const getRelativePointerPosition = () => {
    const stage = stageRef.current;
    if (!stage) return { x: 0, y: 0 };
    const pointer = stage.getPointerPosition();
    return {
      x: (pointer.x - position.x) / scale,
      y: (pointer.y - position.y) / scale
    };
  };

  const handleMouseDown = (e) => {
    // If panning with Move tool
    if (activeTool === 'move' || e.target === stageRef.current || e.target === imageRef.current) {
      setSelectedId(null);
    }

    if (activeTool === 'select' || activeTool === 'move') return;

    // Start drawing a placeholder
    const relPos = getRelativePointerPosition();
    setIsDrawing(true);
    setDrawStart(relPos);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;

    const relPos = getRelativePointerPosition();
    const x = Math.min(drawStart.x, relPos.x);
    const y = Math.min(drawStart.y, relPos.y);
    let width = Math.abs(relPos.x - drawStart.x);
    let height = Math.abs(relPos.y - drawStart.y);

    if (snapEnabled) {
      width = Math.round(width / 10) * 10;
      height = Math.round(height / 10) * 10;
    }

    setConfig(prev => ({
      ...prev,
      [activeTool]: {
        ...DEFAULT_CONFIGS[activeTool],
        x,
        y,
        width: Math.max(40, width),
        height: Math.max(40, height)
      }
    }));
  };

  const handleMouseUp = (e) => {
    const relPos = getRelativePointerPosition();
    
    // Check if Click & Detect Mode is enabled OR if they just did a quick click without dragging
    const clickDistance = Math.sqrt(
      Math.pow(relPos.x - drawStart.x, 2) + Math.pow(relPos.y - drawStart.y, 2)
    );

    if ((clickDetectMode || clickDistance < 5) && isDrawing && ['photo', 'name', 'role'].includes(activeTool)) {
      setIsDrawing(false);
      
      // Perform Smart click & detect algorithm
      if (offscreenCanvas) {
        const detectedBox = detectPlaceholder(offscreenCanvas, relPos.x, relPos.y, activeTool);
        if (detectedBox) {
          const finalBox = {
            ...DEFAULT_CONFIGS[activeTool],
            ...detectedBox
          };
          
          const newConfig = {
            ...config,
            [activeTool]: finalBox
          };
          setConfig(newConfig);
          pushHistory(newConfig);
          setSelectedId(activeTool);
          setActiveTool('select'); // automatically switch back to select
          return;
        }
      }
    }

    if (isDrawing) {
      setIsDrawing(false);
      pushHistory(config);
      setSelectedId(activeTool);
      setActiveTool('select'); // return to selection pointer
    }
  };

  // Keyboard support (Delete active node and Arrow Key Nudge movement)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only if we aren't typing in an input/select/textarea element
      if (
        document.activeElement.tagName === 'INPUT' || 
        document.activeElement.tagName === 'SELECT' || 
        document.activeElement.tagName === 'TEXTAREA' ||
        document.activeElement.isContentEditable
      ) return;
      
      if (!selectedId || !latestConfigRef.current[selectedId]) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        handleDeleteElement();
        return;
      }

      // Check for nudge arrows
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault(); // Prevent default browser scrolling
        
        const elementConfig = latestConfigRef.current[selectedId];
        const nudgeAmount = e.shiftKey ? 10 : 1;
        let newX = elementConfig.x;
        let newY = elementConfig.y;

        switch (e.key) {
          case 'ArrowUp':
            newY -= nudgeAmount;
            break;
          case 'ArrowDown':
            newY += nudgeAmount;
            break;
          case 'ArrowLeft':
            newX -= nudgeAmount;
            break;
          case 'ArrowRight':
            newX += nudgeAmount;
            break;
          default:
            break;
        }

        // Mark that we are nudging
        isNudgingRef.current = true;

        setConfig(prev => ({
          ...prev,
          [selectedId]: {
            ...prev[selectedId],
            x: newX,
            y: newY
          }
        }));
      }
    };

    const handleKeyUp = (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (isNudgingRef.current) {
          isNudgingRef.current = false;
          // Push the final nudged state to history once the key is released
          pushHistory(latestConfigRef.current);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedId]);

  const handleDeleteElement = () => {
    if (!selectedId) return;
    const newConfig = {
      ...config,
      [selectedId]: null
    };
    setConfig(newConfig);
    pushHistory(newConfig);
    setSelectedId(null);
  };

  const handleDuplicateElement = () => {
    // There are only exactly three placeholders, duplicating means copying coordinates to another slot if empty, 
    // or slightly shifting the box. Since we have specific slots, duplicating will restore the item with a slight offset.
    if (!selectedId || !config[selectedId]) return;
    const item = config[selectedId];
    const newConfig = {
      ...config,
      [selectedId]: {
        ...item,
        x: Math.min(imageSize.width - item.width, item.x + 30),
        y: Math.min(imageSize.height - item.height, item.y + 30)
      }
    };
    setConfig(newConfig);
    pushHistory(newConfig);
  };

  // Selection transformer configuration
  useEffect(() => {
    if (!trRef.current) return;
    if (selectedId && config[selectedId]) {
      const selectedNode = stageRef.current.findOne('#' + selectedId);
      if (selectedNode) {
        trRef.current.nodes([selectedNode]);
        trRef.current.getLayer().batchDraw();
      }
    } else {
      trRef.current.nodes([]);
      trRef.current.getLayer().batchDraw();
    }
  }, [selectedId, config]);

  // Handle Transform/Drag operations
  const handleDragEnd = (e, id) => {
    const node = e.currentTarget;
    let newX = node.x();
    let newY = node.y();

    if (snapEnabled) {
      newX = Math.round(newX / 10) * 10;
      newY = Math.round(newY / 10) * 10;
      node.x(newX);
      node.y(newY);
    }

    const newConfig = {
      ...config,
      [id]: {
        ...config[id],
        x: newX,
        y: newY
      }
    };
    setConfig(newConfig);
    pushHistory(newConfig);
  };

  const handleTransformEnd = (e, id) => {
    const node = e.currentTarget;
    let newX = node.x();
    let newY = node.y();
    let newW = node.width() * node.scaleX();
    let newH = node.height() * node.scaleY();

    // Reset scales on the visual element, we record physical width/height
    node.scaleX(1);
    node.scaleY(1);

    if (snapEnabled) {
      newX = Math.round(newX / 10) * 10;
      newY = Math.round(newY / 10) * 10;
      newW = Math.round(newW / 10) * 10;
      newH = Math.round(newH / 10) * 10;
    }

    let finalW = Math.max(40, newW);
    let finalH = Math.max(40, newH);

    if (id === 'photo') {
      finalW = Math.min(285, Math.max(245, finalW));
      finalH = Math.min(430, Math.max(380, finalH));
    }

    const newConfig = {
      ...config,
      [id]: {
        ...config[id],
        x: newX,
        y: newY,
        width: finalW,
        height: finalH
      }
    };
    setConfig(newConfig);
    pushHistory(newConfig);
  };

  // Grid renderer
  const renderGridLines = () => {
    if (!gridEnabled || !imageSize.width) return null;
    const lines = [];
    const spacing = 40;

    // Vertical lines
    for (let x = spacing; x < imageSize.width; x += spacing) {
      lines.push(
        <Line
          key={`v-${x}`}
          points={[x, 0, x, imageSize.height]}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={1}
          dash={[5, 5]}
        />
      );
    }
    // Horizontal lines
    for (let y = spacing; y < imageSize.height; y += spacing) {
      lines.push(
        <Line
          key={`h-${y}`}
          points={[0, y, imageSize.width, y]}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={1}
          dash={[5, 5]}
        />
      );
    }
    return lines;
  };

  // Sidebar Tabs
  const [sideTab, setSideTab] = useState('properties'); // 'properties' or 'preview'

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-50 overflow-hidden select-none">
      
      {/* Top Toolbar */}
      <div className="h-14 border-b border-slate-200 bg-white px-4 flex justify-between items-center z-10 shrink-0 shadow-sm shadow-slate-100/50">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 smooth-transition"
            title="Back to Gallery"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="h-4 w-px bg-slate-200"></div>
          <span className="text-sm font-bold text-slate-800 truncate max-w-[150px] sm:max-w-none">
            {template.title}
          </span>
        </div>

        {/* Undo, Redo, Zoom, Grid */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleUndo}
            disabled={historyIdx <= 0}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:hover:bg-transparent smooth-transition"
            title="Undo"
          >
            <Undo2 size={16} />
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIdx >= history.length - 1}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:hover:bg-transparent smooth-transition"
            title="Redo"
          >
            <Redo2 size={16} />
          </button>
          <div className="h-4 w-px bg-slate-200 mx-1"></div>

          <button
            onClick={() => handleZoom(1.15)}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 smooth-transition"
            title="Zoom In"
          >
            <ZoomIn size={16} />
          </button>
          <span className="text-xs text-slate-500 font-bold font-mono w-10 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => handleZoom(0.85)}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 smooth-transition"
            title="Zoom Out"
          >
            <ZoomOut size={16} />
          </button>
          <button
            onClick={() => fitImageToStage(imageSize.width, imageSize.height)}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 smooth-transition"
            title="Fit to Screen"
          >
            <Minimize2 size={16} />
          </button>

          <div className="h-4 w-px bg-slate-200 mx-1"></div>

          <button
            onClick={() => setGridEnabled(!gridEnabled)}
            className={`p-2 rounded-lg smooth-transition ${gridEnabled ? 'bg-indigo-50 text-indigo-650 border border-indigo-200' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'}`}
            title="Toggle Grid Lines"
          >
            <Grid size={16} />
          </button>

          <button
            onClick={() => setSnapEnabled(!snapEnabled)}
            className={`p-2 rounded-lg text-xs font-bold smooth-transition ${snapEnabled ? 'bg-indigo-50 text-indigo-650 border border-indigo-200' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'}`}
            title="Snap to 10px grid"
          >
            SNAP
          </button>
        </div>

        {/* Save Template Button */}
        <div>
          <button
            onClick={() => onSave(config)}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg shadow-indigo-600/10 smooth-transition active:scale-95"
          >
            <Save size={14} />
            Save Config
          </button>
        </div>
      </div>

      {/* Workspace Area (Left sidebar, Stage Canvas, Right properties panel) */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Toolbar (Floating tool select) */}
        <div className="w-14 border-r border-slate-200 bg-white flex flex-col items-center py-4 gap-3 shrink-0 shadow-sm shadow-slate-100/50">
          <button
            onClick={() => { setActiveTool('select'); setSelectedId(null); }}
            className={`p-2.5 rounded-xl smooth-transition ${activeTool === 'select' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-800'}`}
            title="Pointer / Select Tool"
          >
            <MousePointer size={18} />
          </button>
          
          <div className="w-8 h-px bg-slate-200 my-1"></div>

          <button
            onClick={() => setActiveTool('photo')}
            className={`p-2.5 rounded-xl smooth-transition flex flex-col items-center ${activeTool === 'photo' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-800'}`}
            title="Add Photo Placeholder"
          >
            <ImageIcon size={18} />
          </button>

          <button
            onClick={() => setActiveTool('name')}
            className={`p-2.5 rounded-xl smooth-transition flex flex-col items-center ${activeTool === 'name' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-800'}`}
            title="Add Name Placeholder"
          >
            <Type size={18} />
            <span className="text-[7px] font-extrabold mt-0.5 leading-none">NAME</span>
          </button>

          <button
            onClick={() => setActiveTool('role')}
            className={`p-2.5 rounded-xl smooth-transition flex flex-col items-center ${activeTool === 'role' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-800'}`}
            title="Add Role Placeholder"
          >
            <Type size={18} />
            <span className="text-[7px] font-extrabold mt-0.5 leading-none font-mono">ROLE</span>
          </button>

          <button
            onClick={() => { setActiveTool('move'); setSelectedId(null); }}
            className={`p-2.5 rounded-xl smooth-transition ${activeTool === 'move' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-800'}`}
            title="Pan / Move Canvas Tool"
          >
            <Move size={18} />
          </button>

          <div className="w-8 h-px bg-slate-200 my-1"></div>

          {/* Smart Click & Detect Toggle */}
          {['photo', 'name', 'role'].includes(activeTool) && (
            <button
              onClick={() => setClickDetectMode(!clickDetectMode)}
              className={`p-2.5 rounded-xl smooth-transition floating-icon border ${
                clickDetectMode 
                  ? 'bg-amber-50 text-amber-700 border-amber-200 shadow-sm shadow-amber-200/20' 
                  : 'bg-slate-50 text-slate-400 hover:text-slate-800 border-slate-200'
              }`}
              title="Toggle Smart Click & Detect Mode"
            >
              <Sparkles size={18} />
            </button>
          )}

          <div className="flex-1"></div>

          {/* Quick Actions (Delete, Duplicate) */}
          {selectedId && (
            <>
              <button
                onClick={handleDuplicateElement}
                className="p-2.5 rounded-xl text-slate-400 hover:bg-slate-55 hover:text-slate-800 smooth-transition"
                title="Duplicate Selected"
              >
                <Copy size={16} />
              </button>
              <button
                onClick={handleDeleteElement}
                className="p-2.5 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-700 smooth-transition"
                title="Delete Selected"
              >
                <Trash2 size={16} />
              </button>
            </>
          )}
        </div>

        {/* Center Stage (Canvas workspace) */}
        <div 
          ref={stageContainerRef}
          className={`flex-1 h-full bg-slate-100 overflow-hidden relative ${
            activeTool === 'move' ? 'cursor-grab active:cursor-grabbing' : 
            ['photo', 'name', 'role'].includes(activeTool) ? 'cursor-crosshair' : 'cursor-default'
          }`}
        >
          {/* Smart detect indicator */}
          {clickDetectMode && ['photo', 'name', 'role'].includes(activeTool) && (
            <div className="absolute top-3 left-3 z-10 bg-amber-50 backdrop-blur-md border border-amber-200 text-[10px] text-amber-800 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm">
              <Sparkles size={13} className="animate-pulse text-amber-600" />
              <span>Smart Detect Mode: Click on the poster to auto-estimate layout boundaries</span>
            </div>
          )}

          {/* Canvas stage */}
          {imageObj && (
            <Stage
              ref={stageRef}
              width={stageDimensions.width}
              height={stageDimensions.height}
              scaleX={scale}
              scaleY={scale}
              x={position.x}
              y={position.y}
              draggable={activeTool === 'move'}
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            >
              <Layer>
                {/* Background image */}
                <KonvaImage
                  ref={imageRef}
                  image={imageObj}
                  width={imageSize.width}
                  height={imageSize.height}
                  id="background-poster"
                />

                {/* Grid Overlay */}
                {renderGridLines()}

                {/* Render Placeholders */}
                {/* Photo Placeholder */}
                {config.photo && (
                  <Group
                    id="photo"
                    x={config.photo.x}
                    y={config.photo.y}
                    draggable={activeTool === 'select'}
                    onClick={() => { if (activeTool === 'select') setSelectedId('photo'); }}
                    onTap={() => { if (activeTool === 'select') setSelectedId('photo'); }}
                    onDragEnd={(e) => handleDragEnd(e, 'photo')}
                    onTransformEnd={(e) => handleTransformEnd(e, 'photo')}
                  >
                    <Rect
                      width={config.photo.width}
                      height={config.photo.height}
                      fill="rgba(59, 130, 246, 0.15)"
                      stroke="#3b82f6"
                      strokeWidth={selectedId === 'photo' ? 3 : 1.5}
                      cornerRadius={config.photo.circle ? Math.min(config.photo.width, config.photo.height)/2 : (config.photo.radius || 0)}
                    />
                    <Text
                      text="PHOTO PLACEHOLDER"
                      width={config.photo.width}
                      height={config.photo.height}
                      align="center"
                      verticalAlign="middle"
                      fill="#1e40af"
                      fontSize={11}
                      fontStyle="bold"
                    />
                  </Group>
                )}

                {/* Name Placeholder */}
                {config.name && (
                  <Group
                    id="name"
                    x={config.name.x}
                    y={config.name.y}
                    draggable={activeTool === 'select'}
                    onClick={() => { if (activeTool === 'select') setSelectedId('name'); }}
                    onTap={() => { if (activeTool === 'select') setSelectedId('name'); }}
                    onDragEnd={(e) => handleDragEnd(e, 'name')}
                    onTransformEnd={(e) => handleTransformEnd(e, 'name')}
                  >
                    <Rect
                      width={config.name.width}
                      height={config.name.height}
                      fill="rgba(245, 158, 11, 0.15)"
                      stroke="#f59e0b"
                      strokeWidth={selectedId === 'name' ? 3 : 1.5}
                    />
                    <Text
                      text="NAME OVERLAY AREA"
                      width={config.name.width}
                      height={config.name.height}
                      align="center"
                      verticalAlign="middle"
                      fill="#78350f"
                      fontSize={11}
                      fontStyle="bold"
                    />
                  </Group>
                )}

                {/* Role Placeholder */}
                {config.role && (
                  <Group
                    id="role"
                    x={config.role.x}
                    y={config.role.y}
                    draggable={activeTool === 'select'}
                    onClick={() => { if (activeTool === 'select') setSelectedId('role'); }}
                    onTap={() => { if (activeTool === 'select') setSelectedId('role'); }}
                    onDragEnd={(e) => handleDragEnd(e, 'role')}
                    onTransformEnd={(e) => handleTransformEnd(e, 'role')}
                  >
                    <Rect
                      width={config.role.width}
                      height={config.role.height}
                      fill="rgba(16, 185, 129, 0.15)"
                      stroke="#10b981"
                      strokeWidth={selectedId === 'role' ? 3 : 1.5}
                    />
                    <Text
                      text="ROLE OVERLAY AREA"
                      width={config.role.width}
                      height={config.role.height}
                      align="center"
                      verticalAlign="middle"
                      fill="#064e3b"
                      fontSize={11}
                      fontStyle="bold"
                    />
                  </Group>
                )}

                {/* Transformer handles */}
                <Transformer
                  ref={trRef}
                  boundBoxFunc={(oldBox, newBox) => {
                    // limit resize to avoid flipping shapes
                    if (newBox.width < 40 || newBox.height < 40) {
                      return oldBox;
                    }
                    return newBox;
                  }}
                  anchorStroke="#6366f1"
                  anchorFill="#818cf8"
                  anchorSize={8}
                  borderStroke="#818cf8"
                  borderStrokeWidth={1}
                />
              </Layer>
            </Stage>
          )}
        </div>

        {/* Right Panel (Dual properties and live preview tabs) */}
        <div className="w-[340px] border-l border-slate-200 bg-white flex flex-col shrink-0 shadow-sm">
          {/* Tab selector */}
          <div className="flex bg-slate-50 p-1 border-b border-slate-200">
            <button
              onClick={() => setSideTab('properties')}
              className={`flex-1 py-2 text-center rounded-xl text-xs font-bold smooth-transition ${sideTab === 'properties' ? 'bg-white text-indigo-650 border border-slate-200/50 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Properties
            </button>
            <button
              onClick={() => setSideTab('preview')}
              className={`flex-1 py-2 text-center rounded-xl text-xs font-bold smooth-transition ${sideTab === 'preview' ? 'bg-white text-indigo-650 border border-slate-200/50 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Live Preview
            </button>
          </div>

          {/* Tab contents */}
          <div className="flex-1 min-h-0 flex flex-col">
            {sideTab === 'properties' ? (
              <PropertiesPanel
                selectedId={selectedId}
                setSelectedId={setSelectedId}
                config={config}
                onChange={handleConfigChange}
              />
            ) : (
              <div className="h-full p-4 bg-slate-50">
                <LivePreview
                  posterUrl={template.image_url}
                  config={config}
                />
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
