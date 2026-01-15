import React, { useState, useRef, useEffect, useMemo } from 'react';
import SpanishMap from './Map/SpanishMap';
import { useLanguage } from '../context/LanguageContext';

const MultiMapView = ({ elections }) => {
    const { t } = useLanguage();
    // Group elections by type
    const electionsByType = useMemo(() => {
        const groups = { congreso: [], municipales: [] };
        elections?.forEach(e => {
            if (groups[e.type]) groups[e.type].push(e);
        });
        Object.values(groups).forEach(arr =>
            arr.sort((a, b) => (b.year - a.year) || (b.month - a.month))
        );
        return groups;
    }, [elections]);

    // State for map configurations including layout (width/height)
    const [maps, setMaps] = useState([
        { id: 1, type: 'congreso', electionId: '', style: { width: '50%', height: '550px' } },
        { id: 2, type: 'congreso', electionId: '', style: { width: '50%', height: '550px' } }
    ]);

    // Drag and Drop state
    const [draggedId, setDraggedId] = useState(null);

    // Export options
    const [exportFormat, setExportFormat] = useState('svg');
    const [exportBg, setExportBg] = useState('dark');
    const [exportScale, setExportScale] = useState(2); // 1x, 2x, 3x, 4x
    const [showExportMenu, setShowExportMenu] = useState(false);

    useEffect(() => {
        if (elections?.length > 0 && !maps[0]?.electionId) {
            const congreso = electionsByType.congreso;
            setMaps(prev => prev.map((m, i) => ({
                ...m,
                electionId: congreso[0]?.id || ''
            })));
        }
    }, [elections, electionsByType]);

    const addMap = () => {
        const newId = Math.max(0, ...maps.map(m => m.id)) + 1;
        const defaultType = 'congreso';
        const defaultElection = electionsByType[defaultType]?.[0]?.id || '';
        setMaps([...maps, {
            id: newId,
            type: defaultType,
            electionId: defaultElection,
            style: { width: '50%', height: '550px' }
        }]);
    };

    const removeMap = (id) => {
        if (maps.length <= 1) return;
        setMaps(maps.filter(m => m.id !== id));
    };

    const updateMapType = (id, newType) => {
        const firstElection = electionsByType[newType]?.[0]?.id || '';
        setMaps(maps.map(m => m.id === id ? { ...m, type: newType, electionId: firstElection } : m));
    };

    const updateMapElection = (id, electionId) => {
        setMaps(maps.map(m => m.id === id ? { ...m, electionId } : m));
    };



    // Container ref for width calculations
    const containerRef = useRef(null);

    // Resize Logic (Width & Height)
    const handleResizeStart = (e, id) => {
        e.preventDefault();
        e.stopPropagation();
        const map = maps.find(m => m.id === id);
        if (!map) return;

        const containerWidth = containerRef.current?.offsetWidth || 1000;
        const startX = e.clientX;
        const startY = e.clientY;
        const startHeight = parseInt(map.style.height || '550', 10);

        // Parse start width (handle % or px, default to 50%)
        let startWidthPx = 0;
        const currentWidth = map.style.width || '50%';
        if (currentWidth.includes('%')) {
            startWidthPx = (parseFloat(currentWidth) / 100) * containerWidth;
        } else {
            startWidthPx = parseInt(currentWidth, 10);
        }

        const handleMouseMove = (moveEvent) => {
            // Height (Pixels)
            const deltaY = moveEvent.clientY - startY;
            const newHeight = Math.max(300, startHeight + deltaY);

            // Width (Percentage)
            const deltaX = moveEvent.clientX - startX;
            const newWidthPx = Math.max(200, startWidthPx + deltaX);
            const newWidthPercent = Math.min(100, Math.max(15, (newWidthPx / containerWidth) * 100)); // Clamp between 15% and 100%

            setMaps(prev => prev.map(m => m.id === id ? {
                ...m,
                style: {
                    ...m.style,
                    height: `${newHeight}px`,
                    width: `${newWidthPercent.toFixed(1)}%`
                }
            } : m));
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    // DnD Logic with Visual Indicators
    const [dragState, setDragState] = useState({
        draggedId: null,
        targetId: null,
        position: null // 'before' | 'after'
    });

    const handleDragStart = (e, id) => {
        setDragState(prev => ({ ...prev, draggedId: id }));
        e.dataTransfer.effectAllowed = 'move';
        // Add a transparent ghost or styling if needed
        e.target.style.opacity = '0.4';
    };

    const handleDragEnd = (e) => {
        setDragState({ draggedId: null, targetId: null, position: null });
        e.target.style.opacity = '1';
    };

    const handleDragOver = (e, targetId) => {
        e.preventDefault(); // allow drop
        if (!dragState.draggedId || dragState.draggedId === targetId) return;

        const targetEl = e.currentTarget;
        const rect = targetEl.getBoundingClientRect();
        const clientX = e.clientX;
        const clientY = e.clientY;

        // Determine if we are hovering the "start" or "end" of the item relative to flow
        // For flex-wrap, valid assumption is usually horizontal flow, but vertical if wrapped.
        // Simple logic: if in left half => before, right half => after?
        // Or cleaner: calculate distance to edges.
        const isLeft = clientX < rect.left + rect.width / 2;

        setDragState(prev => ({
            ...prev,
            targetId,
            position: isLeft ? 'before' : 'after'
        }));
    };

    const handleDragLeave = () => {
        // Optional: clear target if leaving the card, but flaky with children.
        // Usually ignored in favor of DragOver updates.
    };

    const handleDrop = (e, targetId) => {
        e.preventDefault();
        const { draggedId, position } = dragState;
        if (!draggedId || draggedId === targetId) return;

        const fromIndex = maps.findIndex(m => m.id === draggedId);
        const toIndex = maps.findIndex(m => m.id === targetId);
        if (fromIndex === -1 || toIndex === -1) return;

        const newMaps = [...maps];
        const [movedItem] = newMaps.splice(fromIndex, 1);

        // Adjust insertion index
        // If we removed an item BEFORE the target, the target index shifted down by 1.
        let insertIndex = toIndex;
        if (fromIndex < toIndex) {
            insertIndex = insertIndex - 1;
        }

        // If position is 'after', insert at index + 1
        if (position === 'after') {
            insertIndex++;
        }

        newMaps.splice(insertIndex, 0, movedItem);
        setMaps(newMaps);
        setDragState({ draggedId: null, targetId: null, position: null });
    };

    const getShortName = (election) => {
        if (!election) return '';
        const monthNames = t('months');
        return `${monthNames[parseInt(election.month)] || election.month} ${election.year}`;
    };

    // Background colors for export
    const getBgColor = (bg) => {
        switch (bg) {
            case 'white': return '#ffffff';
            case 'transparent': return 'none';
            default: return '#0a0a0a';
        }
    };

    const getCardBgColor = (bg) => {
        switch (bg) {
            case 'white': return '#f0f0f0';
            case 'transparent': return 'none';
            default: return '#1a1a1a';
        }
    };

    const getWatermarkColor = (bg) => {
        switch (bg) {
            case 'white': return 'rgba(0, 0, 0, 0.4)';
            default: return 'rgba(255, 255, 255, 0.5)';
        }
    };

    // Export individual map
    const exportMap = async (mapId, format = exportFormat, bg = exportBg) => {
        const mapContainer = document.querySelector(`[data-map-id="${mapId}"] svg`);
        if (!mapContainer) {
            alert(t('map_not_found'));
            return;
        }

        const mapConfig = maps.find(m => m.id === mapId);
        const election = elections?.find(e => e.id === mapConfig?.electionId);
        const filename = `electostatica-${election?.type || 'mapa'}-${election?.year || ''}-${election?.month || ''}`;

        // Clone SVG
        const clonedSvg = mapContainer.cloneNode(true);

        // Add background rect
        const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bgRect.setAttribute('width', '100%');
        bgRect.setAttribute('height', '100%');
        bgRect.setAttribute('fill', getBgColor(bg));
        clonedSvg.insertBefore(bgRect, clonedSvg.firstChild);

        const svgData = new XMLSerializer().serializeToString(clonedSvg);

        if (format === 'png') {
            await exportAsPNG(svgData, 700, 480, filename);
        } else {
            downloadSVG(svgData, filename);
        }
    };

    // Export all maps
    const exportAll = async () => {
        const svgs = document.querySelectorAll('#multi-view-grid [data-map-id] svg');
        if (svgs.length === 0) {
            alert(t('no_maps_to_export'));
            return;
        }

        const cols = 2; // Default for export
        const svgWidth = 700;
        const svgHeight = 480;
        const padding = 20;
        const rows = Math.ceil(maps.length / cols);
        const totalWidth = cols * svgWidth + (cols + 1) * padding;
        const totalHeight = rows * svgHeight + (rows + 1) * padding + 40;

        let combinedSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}">`;

        // Background
        if (exportBg !== 'transparent') {
            combinedSVG += `<rect width="100%" height="100%" fill="${getBgColor(exportBg)}"/>`;
        }

        svgs.forEach((svg, index) => {
            const row = Math.floor(index / cols);
            const col = index % cols;
            const x = padding + col * (svgWidth + padding);
            const y = padding + row * (svgHeight + padding);

            const svgContent = svg.innerHTML;
            combinedSVG += `<g transform="translate(${x}, ${y})">`;
            if (exportBg !== 'transparent') {
                combinedSVG += `<rect width="${svgWidth}" height="${svgHeight}" fill="${getCardBgColor(exportBg)}" rx="12"/>`;
            }
            combinedSVG += `<svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 700 480">${svgContent}</svg>`;
            combinedSVG += `</g>`;
        });

        combinedSVG += `</svg>`;

        if (exportFormat === 'png') {
            await exportAsPNG(combinedSVG, totalWidth, totalHeight, 'electostatica-multimapa');
        } else {
            downloadSVG(combinedSVG, 'electostatica-multimapa');
        }

        setShowExportMenu(false);
    };

    const downloadSVG = (svgData, filename) => {
        const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}.svg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const exportAsPNG = async (svgData, width, height, filename) => {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const scale = exportScale;
            canvas.width = width * scale;
            canvas.height = height * scale;
            ctx.scale(scale, scale);

            const img = new Image();
            const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);

            img.onload = () => {
                if (exportBg !== 'transparent') {
                    ctx.fillStyle = getBgColor(exportBg);
                    ctx.fillRect(0, 0, width, height);
                }
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    const pngUrl = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = pngUrl;
                    link.download = `${filename}.png`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(pngUrl);
                    URL.revokeObjectURL(url);
                    resolve();
                }, 'image/png');
            };

            img.src = url;
        });
    };

    return (
        <div className="multi-view-container">
            <div className="multi-controls-bar">
                <button className="premium-btn primary" onClick={addMap}>
                    <span>+</span> {t('add_map')}
                </button>

                <div className="export-dropdown">
                    <button
                        className="premium-btn secondary"
                        onClick={() => setShowExportMenu(!showExportMenu)}
                    >
                        📄 {t('export')} ▾
                    </button>
                    {showExportMenu && (
                        <div className="export-menu">
                            <div className="export-option">
                                <label>{t('format')}</label>
                                <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value)}>
                                    <option value="svg">SVG</option>
                                    <option value="png">PNG</option>
                                </select>
                            </div>
                            <div className="export-option">
                                <label>{t('background')}</label>
                                <select value={exportBg} onChange={(e) => setExportBg(e.target.value)}>
                                    <option value="dark">{t('dark')}</option>
                                    <option value="white">{t('white')}</option>
                                    <option value="transparent">{t('transparent')}</option>
                                </select>
                            </div>
                            {exportFormat === 'png' && (
                                <div className="export-option">
                                    <label>{t('resolution')}</label>
                                    <select value={exportScale} onChange={(e) => setExportScale(Number(e.target.value))}>
                                        <option value={1}>1x (72 DPI)</option>
                                        <option value={2}>2x (144 DPI)</option>
                                        <option value={3}>3x (216 DPI)</option>
                                        <option value={4}>4x (288 DPI)</option>
                                    </select>
                                </div>
                            )}
                            <button className="export-btn-confirm" onClick={exportAll}>
                                {t('')} {exportFormat.toUpperCase()}
                            </button>
                        </div>
                    )}
                </div>

                <span className="info-badge">{maps.length} {t('maps')}</span>
                <span className="info-badge" style={{ marginLeft: 'auto', opacity: 0.7 }}>{t('drag_to_reorder')}</span>
            </div>

            <div
                id="multi-view-grid"
                className="multi-grid"
                ref={containerRef}
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '1rem',
                    overflowY: 'auto',
                    alignContent: 'flex-start',
                    paddingBottom: '2rem'
                }}
            >
                {maps.slice(0, 8).map((mapConfig, index) => {
                    const typeElections = electionsByType[mapConfig.type] || [];

                    const dragHandle = (
                        <div className="drag-handle" style={{ cursor: 'move', opacity: 0.5, fontSize: '1.2rem', padding: '0.2rem' }}>
                            ⋮⋮
                        </div>
                    );

                    const selectors = (
                        <>
                            <select
                                value={mapConfig.type}
                                onChange={(e) => updateMapType(mapConfig.id, e.target.value)}
                            >
                                <option value="congreso">{t('congreso')}</option>
                                <option value="municipales">{t('municipales')}</option>
                            </select>
                            <select
                                value={mapConfig.electionId}
                                onChange={(e) => updateMapElection(mapConfig.id, e.target.value)}
                            >
                                {typeElections.map(e => (
                                    <option key={e.id} value={e.id}>
                                        {getShortName(e)}
                                    </option>
                                ))}
                            </select>
                        </>
                    );

                    const actions = (
                        <>
                            <button
                                onClick={() => exportMap(mapConfig.id)}
                                title={`Exportar ${exportFormat.toUpperCase()}`}
                                style={{
                                    width: '32px',
                                    height: '32px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: 'rgba(10, 10, 10, 0.8)',
                                    border: '1px solid var(--surface-border)',
                                    color: 'white',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: 'pointer',
                                    backdropFilter: 'blur(4px)'
                                }}
                            >
                                ⬇
                            </button>
                            <button
                                onClick={() => removeMap(mapConfig.id)}
                                disabled={maps.length <= 1}
                                title={t('remove_map')}
                                style={{
                                    width: '32px',
                                    height: '32px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: 'rgba(10, 10, 10, 0.8)',
                                    border: '1px solid var(--surface-border)',
                                    color: maps.length > 1 ? '#ef4444' : 'gray',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: maps.length > 1 ? 'pointer' : 'not-allowed',
                                    backdropFilter: 'blur(4px)'
                                }}
                            >
                                ×
                            </button>
                        </>
                    );

                    return (
                        <div
                            key={mapConfig.id}
                            className="map-card-container"
                            data-map-id={mapConfig.id}
                            draggable="true"
                            onDragStart={(e) => handleDragStart(e, mapConfig.id)}
                            onDragEnd={handleDragEnd}
                            onDragOver={(e) => handleDragOver(e, mapConfig.id)}
                            onDrop={(e) => handleDrop(e, mapConfig.id)}
                            style={{
                                width: `calc(${mapConfig.style?.width || '50%'} - 1rem)`, // Subtract gap
                                flexGrow: 0,
                                flexShrink: 0,
                                height: mapConfig.style?.height || '550px',
                                transition: 'opacity 0.2s ease',
                                position: 'relative'
                            }}
                        >
                            {/* Drop Indicator - Left */}
                            {dragState.targetId === mapConfig.id && dragState.position === 'before' && (
                                <div style={{
                                    position: 'absolute',
                                    top: 0, bottom: 0, left: '-6px',
                                    width: '4px',
                                    background: 'var(--primary)',
                                    zIndex: 50,
                                    borderRadius: '2px',
                                    boxShadow: '0 0 10px var(--primary)'
                                }} />
                            )}

                            {/* Drop Indicator - Right */}
                            {dragState.targetId === mapConfig.id && dragState.position === 'after' && (
                                <div style={{
                                    position: 'absolute',
                                    top: 0, bottom: 0, right: '-6px',
                                    width: '4px',
                                    background: 'var(--primary)',
                                    zIndex: 50,
                                    borderRadius: '2px',
                                    boxShadow: '0 0 10px var(--primary)'
                                }} />
                            )}

                            <div className="map-card-body">
                                {mapConfig.electionId ? (
                                    <SpanishMap
                                        electionId={mapConfig.electionId}
                                        electionSelectors={selectors}
                                        extraControls={actions}
                                        dragHandle={dragHandle}
                                        showLanguageControl={false}
                                    />
                                ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.5 }}>
                                        {t('loading')}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default MultiMapView;
