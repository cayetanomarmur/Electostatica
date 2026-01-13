import React, { useState, useEffect, useRef } from 'react';
import { CCAA_MAP, PROVINCE_MAP } from '../../utils/regionMaps';

const ResultsComparison = ({ initialElectionId, partyConfig, elections }) => {
    const [rows, setRows] = useState([
        { id: Date.now(), electionId: initialElectionId, scope: 'national', regionId: 'national', data: null }
    ]);
    const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, content: null });
    const [draggedId, setDraggedId] = useState(null);

    const fetchData = async (electionId, scope, regionId) => {
        const res = await fetch(`/api/results/${electionId}`);
        const data = await res.json();

        let partyVotes = {};
        let partySeats = {};

        if (scope === 'national') {
            partyVotes = Object.entries(data.summary).reduce((acc, [code, s]) => {
                acc[code] = s.votes;
                return acc;
            }, {});
            partySeats = Object.entries(data.summary).reduce((acc, [code, s]) => {
                acc[code] = s.seats;
                return acc;
            }, {});
        } else if (scope === 'prov') {
            const provCode = regionId.split(':')[1];
            const provData = data.provinces[provCode];
            if (provData) {
                partyVotes = provData.votes;
                partySeats = provData.seats;
            }
        } else if (scope === 'ca') {
            const caCode = regionId.split(':')[1];
            Object.entries(data.provinces).forEach(([pCode, pData]) => {
                const firstMun = Object.values(data.municipalities).find(m => m.prov === pCode);
                if (firstMun && firstMun.ca === caCode) {
                    Object.entries(pData.votes).forEach(([cCode, votes]) => {
                        partyVotes[cCode] = (partyVotes[cCode] || 0) + votes;
                    });
                    Object.entries(pData.seats).forEach(([cCode, seats]) => {
                        partySeats[cCode] = (partySeats[cCode] || 0) + seats;
                    });
                }
            });
        }

        const totalVotes = Object.values(partyVotes).reduce((acc, v) => acc + v, 0);

        const results = Object.entries(partyVotes).map(([code, votes]) => {
            const info = data.candidacies[code];
            const config = partyConfig[info?.siglas] || {};
            return {
                siglas: info?.siglas || code,
                name: info?.name || code,
                votes: votes,
                seats: partySeats[code] || 0,
                pct: totalVotes > 0 ? (votes / totalVotes) * 100 : 0,
                color: config.color || '#64748b'
            };
        }).sort((a, b) => b.votes - a.votes);

        return results;
    };

    const updateRow = async (rowId, electionId, scope, regionId) => {
        let targetRegion = regionId;
        if (scope === 'national') targetRegion = 'national';
        if (scope === 'ca' && !regionId.startsWith('ca:')) targetRegion = 'ca:01';
        if (scope === 'prov' && !regionId.startsWith('prov:')) targetRegion = 'prov:01';

        const data = await fetchData(electionId, scope, targetRegion);

        setRows(prev => prev.map(r => r.id === rowId ? {
            ...r,
            electionId,
            scope,
            regionId: targetRegion,
            data: data
        } : r));
    };

    useEffect(() => {
        if (rows[0].electionId && !rows[0].data) {
            updateRow(rows[0].id, rows[0].electionId, rows[0].scope, rows[0].regionId);
        }
    }, [initialElectionId]);

    const addRow = () => {
        setRows([...rows, { id: Date.now(), electionId: initialElectionId, scope: 'national', regionId: 'national', data: null }]);
    };

    const removeRow = (id) => {
        if (rows.length > 1) setRows(rows.filter(r => r.id !== id));
    };

    // Drag and drop handlers
    const handleDragStart = (e, id) => {
        setDraggedId(id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e, targetId) => {
        e.preventDefault();
        if (draggedId === targetId) return;

        const dragIndex = rows.findIndex(r => r.id === draggedId);
        const dropIndex = rows.findIndex(r => r.id === targetId);

        const newRows = [...rows];
        const [removed] = newRows.splice(dragIndex, 1);
        newRows.splice(dropIndex, 0, removed);

        setRows(newRows);
        setDraggedId(null);
    };

    const handleSegmentMouseEnter = (e, p) => {
        setTooltip({
            visible: true,
            x: e.clientX,
            y: e.clientY,
            content: p
        });
    };

    const handleSegmentMouseMove = (e) => {
        if (tooltip.visible) {
            setTooltip(prev => ({ ...prev, x: e.clientX, y: e.clientY }));
        }
    };

    const handleSegmentMouseLeave = () => {
        setTooltip({ visible: false, x: 0, y: 0, content: null });
    };

    return (
        <div className="comparison-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.1rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text)' }}>COMPARATIVA</h2>
                <button onClick={addRow} style={{
                    fontSize: '0.75rem',
                    padding: '0.4rem 1rem',
                    background: 'var(--primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '100px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px var(--primary-glow)'
                }}>+ AÑADIR</button>
            </div>

            {rows.map(row => (
                <div
                    key={row.id}
                    className="comparison-row"
                    draggable
                    onDragStart={(e) => handleDragStart(e, row.id)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, row.id)}
                    style={{
                        background: draggedId === row.id ? 'rgba(14, 165, 233, 0.1)' : 'rgba(255,255,255,0.02)',
                        borderRadius: '14px',
                        padding: '1rem',
                        marginBottom: '0.75rem',
                        border: '1px solid var(--surface-border)',
                        cursor: 'grab'
                    }}
                >
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'nowrap', alignItems: 'center', overflowX: 'auto' }}>
                        <span style={{ cursor: 'grab', opacity: 0.4, marginRight: '0.25rem' }}>⠿</span>
                        <select
                            value={row.electionId}
                            onChange={(e) => updateRow(row.id, e.target.value, row.scope, row.regionId)}
                            className="premium-select"
                            style={{ minWidth: '120px', flex: '1', fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                        >
                            {elections.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                        </select>

                        <select
                            value={row.scope}
                            onChange={(e) => updateRow(row.id, row.electionId, e.target.value, row.regionId)}
                            className="premium-select"
                            style={{ minWidth: '90px', width: '90px', fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                        >
                            <option value="national">Nacional</option>
                            <option value="ca">CCAA</option>
                            <option value="prov">Provincia</option>
                        </select>

                        {row.scope !== 'national' && (
                            <select
                                value={row.regionId}
                                onChange={(e) => updateRow(row.id, row.electionId, row.scope, e.target.value)}
                                className="premium-select"
                                style={{ minWidth: '130px', flex: '1', fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                            >
                                {row.scope === 'ca' ? (
                                    Object.entries(CCAA_MAP).map(([code, name]) => (
                                        <option key={code} value={`ca:${code}`}>{name}</option>
                                    ))
                                ) : (
                                    Object.entries(PROVINCE_MAP).sort((a, b) => a[1].localeCompare(b[1])).map(([code, name]) => (
                                        <option key={code} value={`prov:${code}`}>{name}</option>
                                    ))
                                )}
                            </select>
                        )}

                        {rows.length > 1 && (
                            <button
                                onClick={() => removeRow(row.id)}
                                style={{
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    border: 'none',
                                    color: '#ef4444',
                                    cursor: 'pointer',
                                    width: '28px',
                                    height: '28px',
                                    minWidth: '28px', /* Prevent shrink */
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.8rem'
                                }}
                            >✕</button>
                        )}
                    </div>

                    {row.data ? (
                        <div style={{
                            width: '100%',
                            height: '36px',
                            background: 'rgba(0,0,0,0.2)',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            display: 'flex'
                        }}>
                            {row.data.filter(p => p.pct > 0.5).map(p => (
                                <div
                                    key={p.siglas}
                                    style={{
                                        width: `${p.pct}%`,
                                        height: '100%',
                                        backgroundColor: p.color,
                                        transition: 'width 0.8s ease',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer'
                                    }}
                                    onMouseEnter={(e) => handleSegmentMouseEnter(e, p)}
                                    onMouseMove={handleSegmentMouseMove}
                                    onMouseLeave={handleSegmentMouseLeave}
                                >
                                    {p.pct > 6 && (
                                        <span style={{
                                            fontSize: '0.7rem',
                                            fontWeight: 800,
                                            color: 'white',
                                            textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                                            pointerEvents: 'none'
                                        }}>{p.siglas}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div className="loading-spinner" style={{ width: '20px', height: '20px' }}></div>
                        </div>
                    )}
                </div>
            ))}

            {/* Custom Tooltip */}
            {tooltip.visible && tooltip.content && (
                <div style={{
                    position: 'fixed',
                    left: tooltip.x + 15,
                    top: tooltip.y - 10,
                    background: 'rgba(3, 7, 18, 0.95)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    color: 'white',
                    fontSize: '12px',
                    zIndex: 9999,
                    backdropFilter: 'blur(16px)',
                    boxShadow: '0 15px 30px -8px rgba(0, 0, 0, 0.5)',
                    pointerEvents: 'none'
                }}>
                    <div style={{ fontWeight: 700, marginBottom: '6px', color: tooltip.content.color }}>
                        {tooltip.content.name}
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600 }}>{tooltip.content.pct.toFixed(1)}%</span>
                        <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                            {tooltip.content.seats} Escaños
                        </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
                        {tooltip.content.votes.toLocaleString()} votos
                    </div>
                </div>
            )}
        </div>
    );
};

export default ResultsComparison;

