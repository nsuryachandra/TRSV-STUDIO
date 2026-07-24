import React, { useEffect, useRef, useState } from 'react';
import { Eye, ShieldCheck, RefreshCw } from 'lucide-react';

const MOCK_PHOTO_URL = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?fit=crop&w=400&h=400';

export default function LivePreview({ posterUrl, config }) {
  const canvasRef = useRef(null);
  const [posterImage, setPosterImage] = useState(null);
  const [userPhoto, setUserPhoto] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load original poster image
  useEffect(() => {
    if (!posterUrl) return;
    setLoading(true);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = posterUrl;
    img.onload = () => {
      setPosterImage(img);
      setLoading(false);
    };
    img.onerror = () => {
      // Fallback for local paths without proxy issues
      img.src = 'http://localhost:3001' + posterUrl;
    };
  }, [posterUrl]);

  // Load mock user photo
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = MOCK_PHOTO_URL;
    img.onload = () => {
      setUserPhoto(img);
    };
  }, []);

  // Redraw preview canvas whenever config, poster, or photo changes
  useEffect(() => {
    if (!canvasRef.current || !posterImage) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Lock canvas dimensions to 1080x1350
    canvas.width = 1080;
    canvas.height = 1350;

    // 1. Draw base poster image scaled to fill 1080x1350
    ctx.drawImage(posterImage, 0, 0, 1080, 1350);

    // Helper to calculate auto-fitted font size
    const getAdjustedFontSize = (text, font, baseSize, maxWidth, minSize, maxSize, weight) => {
      ctx.font = `${weight} ${baseSize}px "${font}"`;
      let size = Math.min(maxSize, Math.max(minSize, baseSize));
      ctx.font = `${weight} ${size}px "${font}"`;
      while (ctx.measureText(text).width > maxWidth && size > minSize) {
        size -= 1;
        ctx.font = `${weight} ${size}px "${font}"`;
      }
      return size;
    };

    // 2. Draw Photo Placeholder (with mock photo if loaded)
    if (config.photo && config.photo.width > 0 && config.photo.height > 0) {
      const { x, y, width, height, radius, circle, autoCrop, removeBg, shadow, shadowBlur, shadowOpacity } = config.photo;

      ctx.save();
      
      // Apply drop shadow if enabled
      if (shadow !== false) {
        ctx.shadowColor = `rgba(0, 0, 0, ${shadowOpacity !== undefined ? shadowOpacity : 0.2})`;
        ctx.shadowBlur = shadowBlur !== undefined ? shadowBlur : 18;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 4;
      } else {
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
      }

      // Path masking for roundness (only if configured)
      if (circle || radius > 0) {
        ctx.beginPath();
        if (circle) {
          const cx = x + width / 2;
          const cy = y + height / 2;
          const r = Math.min(width, height) / 2;
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.clip();
        } else if (radius > 0) {
          ctx.roundRect(x, y, width, height, radius);
          ctx.clip();
        }
      }

      if (userPhoto) {
        // Calculate contain-fit dimensions
        const imgRatio = userPhoto.width / userPhoto.height;
        const targetRatio = width / height;
        let drawWidth = width;
        let drawHeight = height;
        let drawX = x;
        let drawY = y;

        if (imgRatio > targetRatio) {
          drawHeight = width / imgRatio;
          drawY = y + (height - drawHeight) / 2;
        } else {
          drawWidth = height * imgRatio;
          drawX = x + (width - drawWidth) / 2;
        }

        // Draw profile background gradient if background removed
        if (removeBg) {
          const grad = ctx.createLinearGradient(drawX, drawY, drawX, drawY + drawHeight);
          grad.addColorStop(0, '#1e293b');
          grad.addColorStop(1, '#0f172a');
          ctx.fillStyle = grad;
          ctx.fillRect(drawX, drawY, drawWidth, drawHeight);
        }

        // Create temporary offscreen canvas for bottom fade composite
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = drawWidth;
        tempCanvas.height = drawHeight;
        const tempCtx = tempCanvas.getContext('2d');

        // Draw cropped/fit image on temp canvas
        tempCtx.drawImage(userPhoto, 0, 0, drawWidth, drawHeight);

        // Apply Bottom Fade & Edge Feather masks (Feathered Easing Gradient)
        const fadeDistance = config.photo.fadeDistance !== undefined ? config.photo.fadeDistance : 80;
        const edgeFeather = config.photo.edgeFeather !== undefined ? config.photo.edgeFeather : 28;

        if (fadeDistance > 0 || edgeFeather > 0) {
          const maskGrad = tempCtx.createLinearGradient(0, drawHeight, 0, 0);
          maskGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');

          if (edgeFeather > 0) {
            maskGrad.addColorStop(Math.min(1, (edgeFeather * 0.4) / drawHeight), 'rgba(0, 0, 0, 0.15)');
            maskGrad.addColorStop(Math.min(1, edgeFeather / drawHeight), 'rgba(0, 0, 0, 0.5)');
          }

          const startFadeY = Math.max(edgeFeather, 0);
          const endFadeY = Math.max(fadeDistance, edgeFeather);

          if (endFadeY > startFadeY) {
            const midY1 = startFadeY + (endFadeY - startFadeY) * 0.35;
            const midY2 = startFadeY + (endFadeY - startFadeY) * 0.75;

            maskGrad.addColorStop(Math.min(1, midY1 / drawHeight), 'rgba(0, 0, 0, 0.75)');
            maskGrad.addColorStop(Math.min(1, midY2 / drawHeight), 'rgba(0, 0, 0, 0.92)');
            maskGrad.addColorStop(Math.min(1, endFadeY / drawHeight), 'rgba(0, 0, 0, 1)');
          }

          maskGrad.addColorStop(1, 'rgba(0, 0, 0, 1)');

          tempCtx.globalCompositeOperation = 'destination-in';
          tempCtx.fillStyle = maskGrad;
          tempCtx.fillRect(0, 0, drawWidth, drawHeight);
          tempCtx.globalCompositeOperation = 'source-over';
        }

        // Apply left feather
        const leftFeather = config.photo.leftFeather || 0;
        if (leftFeather > 0) {
          const featherW = Math.min(leftFeather * 2, drawWidth * 0.4);
          const grad = tempCtx.createLinearGradient(0, 0, featherW, 0);
          grad.addColorStop(0, 'rgba(0,0,0,1)');
          grad.addColorStop(1, 'rgba(0,0,0,0)');
          tempCtx.globalCompositeOperation = 'destination-out';
          tempCtx.fillStyle = grad;
          tempCtx.fillRect(0, 0, featherW, drawHeight);
          tempCtx.globalCompositeOperation = 'source-over';
        }

        // Apply right feather
        const rightFeather = config.photo.rightFeather || 0;
        if (rightFeather > 0) {
          const featherW = Math.min(rightFeather * 2, drawWidth * 0.4);
          const grad = tempCtx.createLinearGradient(drawWidth - featherW, 0, drawWidth, 0);
          grad.addColorStop(0, 'rgba(0,0,0,0)');
          grad.addColorStop(1, 'rgba(0,0,0,1)');
          tempCtx.globalCompositeOperation = 'destination-out';
          tempCtx.fillStyle = grad;
          tempCtx.fillRect(drawWidth - featherW, 0, featherW, drawHeight);
          tempCtx.globalCompositeOperation = 'source-over';
        }

        // 1. Draw Depth Shadow on main canvas under the photo
        if (config.photo.shadow !== false) {
          ctx.save();
          ctx.shadowColor = `rgba(0, 0, 0, ${config.photo.shadowOpacity !== undefined ? config.photo.shadowOpacity : 0.18})`;
          ctx.shadowBlur = config.photo.shadowBlur !== undefined ? config.photo.shadowBlur : 18;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = config.photo.shadowDistance !== undefined ? config.photo.shadowDistance : 4;
          
          // Draw silhouette using the transparent offscreen canvas
          ctx.drawImage(tempCanvas, drawX, drawY);
          ctx.restore();
        }

        // 2. Draw actual portrait with warm gold rim light shadow on top
        ctx.save();
        const rimOpacity = config.photo.rimLightOpacity !== undefined ? config.photo.rimLightOpacity : 0.10;
        if (rimOpacity > 0) {
          ctx.shadowColor = `rgba(255, 215, 0, ${rimOpacity})`; // Gold #FFD700
          ctx.shadowBlur = config.photo.rimLightThickness !== undefined ? config.photo.rimLightThickness : 3;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
        } else {
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
        }

        ctx.drawImage(tempCanvas, drawX, drawY);
        ctx.restore();

      } else {
        // Fallback placeholder grey box
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(x, y, width, height);
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 4;
        ctx.strokeRect(x, y, width, height);
      }
      ctx.restore();
    }

    // Helper function to draw text
    const drawTextPlaceholder = (rawText, elementConfig, defaultColor, isName = true) => {
      if (!elementConfig || elementConfig.width <= 0) return;

      const {
        x, y, width, font, size, weight, spacing, align, color,
        outlineColor, outlineWidth, autoResize, minSize, maxSize
      } = elementConfig;

      ctx.save();
      
      const fontName = font || (isName ? 'Anton' : 'Poppins');
      const fontWeight = weight || (isName ? '700' : '600');
      const fontColor = color || defaultColor;
      const textAlign = align || 'center';
      
      let baseSize = size || (isName ? 64 : 28);
      let text = rawText || '';
      if (isName) {
        text = text.toUpperCase();
      }

      // Configure min/max for auto-sizing
      const minimumSize = minSize || (isName ? 42 : 22);
      const maximumSize = maxSize || (isName ? 70 : 34);

      let fontSize = baseSize;
      if (autoResize !== false) {
        fontSize = getAdjustedFontSize(text, fontName, baseSize, width, minimumSize, maximumSize, fontWeight);
      }

      ctx.font = `${fontWeight} ${fontSize}px "${fontName}"`;
      ctx.fillStyle = fontColor;
      ctx.textBaseline = 'top';

      // Setup shadow
      if (isName) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 2;
      } else {
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
      }

      // Letter spacing support
      const spacingPx = spacing !== undefined ? spacing : (isName ? 2 : 1);
      
      let currentX = x;
      if (textAlign === 'center') {
        const totalWidth = ctx.measureText(text).width + (text.length - 1) * spacingPx;
        currentX = x + (width - totalWidth) / 2;
      } else if (textAlign === 'right') {
        const totalWidth = ctx.measureText(text).width + (text.length - 1) * spacingPx;
        currentX = x + width - totalWidth;
      }

      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        
        ctx.fillText(char, currentX, y);

        if (outlineColor && outlineWidth > 0) {
          ctx.shadowColor = 'transparent';
          ctx.strokeStyle = outlineColor;
          ctx.lineWidth = outlineWidth;
          ctx.lineJoin = 'round';
          ctx.miterLimit = 2;
          ctx.strokeText(char, currentX, y);
        }

        currentX += ctx.measureText(char).width + spacingPx;
      }
      
      ctx.restore();
    };

    // 3. Draw Name Text
    drawTextPlaceholder('NIMMAGADDA SURYACHANDRA', config.name, '#FFFFFF', true);

    // 4. Draw Role Text
    drawTextPlaceholder('President, Greater Hyderabad TRSV', config.role, '#222222', false);

  }, [posterImage, userPhoto, config]);

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Panel title */}
      <div className="flex justify-between items-center bg-slate-50 px-4 py-3 border-b border-slate-200">
        <div className="flex items-center gap-1.5 text-slate-800">
          <Eye size={15} className="text-indigo-600" />
          <span className="text-xs font-bold font-poppins">Live Canvas Preview</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">
          <ShieldCheck size={12} />
          <span>HD WYSIWYG</span>
        </div>
      </div>

      {/* Preview Container */}
      <div className="flex-1 flex items-center justify-center p-4 bg-slate-100/55 overflow-hidden relative min-h-[300px]">
        {loading ? (
          <div className="flex flex-col items-center gap-2 text-slate-400">
            <RefreshCw size={24} className="animate-spin text-indigo-600" />
            <span className="text-xs font-semibold">Preparing preview...</span>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <canvas
              ref={canvasRef}
              className="max-w-full max-h-full object-contain rounded-lg shadow-xl border border-slate-250/50"
            />
          </div>
        )}
      </div>
    </div>
  );
}
