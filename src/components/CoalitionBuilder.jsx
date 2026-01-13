import React, { useState, useEffect } from 'react';
import { getPartyInfo } from '../utils/partyColors';

/**
 * CoalitionBuilder - Interactive tool to select parties and check majority
 * Supports 3 states: Favor (Yes), Abstention (Abst), Against (No)
 */
const CoalitionBuilder = ({ results, candidacies }) => {
    // State: { partyCode: 'yes' | 'abst' | 'no' }
    const [partyStatus, setPartyStatus] = useState({});

    // Reset status when results change (e.g. filter change)
    useEffect(() => {
        setPartyStatus({});
    }, [results]);

    if (!results || !results.seats || !candidacies) {
        return <div className="coalition-loading">Cargando datos...</div>;
    }

    // Build party list with seats - AGGREGATED by normalized name
    const rawParties = Object.entries(results.seats)
        .filter(([_, seats]) => seats > 0)
        .map(([code, seats]) => {
            const party = candidacies[code];
            const rawSiglas = party?.siglas || code;
            const info = getPartyInfo(rawSiglas);
            return {
                code, // Keep original code for uniqueness in keys if needed, but we typically toggle by this code
                // Wait, if we aggregate, we need a unified code.
                // If we have distinct codes '001' (Podemos) and '002' (A la valenciana) mapping to 'Podemos',
                // we probably want them to toggle together.
                id: info.id || info.siglas,
                siglas: info.siglas,
                seats,
                color: info.color
            };
        });

    // Aggregate by normalized 'siglas' (or ID)
    const aggregatedPartiesMap = new Map();

    rawParties.forEach(p => {
        if (aggregatedPartiesMap.has(p.siglas)) {
            const existing = aggregatedPartiesMap.get(p.siglas);
            existing.seats += p.seats;
            // Merge codes? The toggleStatus uses 'code'. 
            // If we merge, we need a new 'code' that represents the group, or update toggleStatus.
            // Let's use the normalized 'siglas' as the key for toggling in partyStatus.
        } else {
            aggregatedPartiesMap.set(p.siglas, { ...p, code: p.siglas }); // Use normalized name as code for toggling
        }
    });

    const parties = Array.from(aggregatedPartiesMap.values())
        .sort((a, b) => b.seats - a.seats);

    if (parties.length === 0) {
        return <div style={{ padding: '1rem', opacity: 0.5 }}>No hay escaños disponibles en esta vista.</div>;
    }

    // Calculate majority threshold based on AVAILABLE seats in this view
    // (Usually 176 for Congress, but if we filter by province, the majority of THAT province?)
    // Standard logic: Pactometer usually makes sense for a Parliament.
    // However, if filtering by Province, we show seats of that province.
    // Let's use 50% + 1 of total seats in THIS view.
    const totalSeats = parties.reduce((sum, p) => sum + p.seats, 0);
    const majoritySeats = Math.floor(totalSeats / 2) + 1;

    // Helper to get status
    const getStatus = (code) => partyStatus[code] || 'no';

    // Calculate sums
    const sums = parties.reduce((acc, p) => {
        const status = getStatus(p.code);
        acc[status] += p.seats;
        return acc;
    }, { yes: 0, no: 0, abst: 0 });

    const hasAbsoluteMajority = sums.yes >= majoritySeats;
    const hasSimpleMajority = sums.yes > sums.no;

    const toggleStatus = (code) => {
        setPartyStatus(prev => {
            const current = prev[code] || 'no';
            let next;
            if (current === 'no') next = 'yes';
            else if (current === 'yes') next = 'abst';
            else next = 'no';

            return { ...prev, [code]: next };
        });
    };

    const clearAll = () => setPartyStatus({});

    return (
        <div className="coalition-builder">
            <div className="coalition-header" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', marginBottom: '0.5rem' }}>
                <h3 style={{ textAlign: 'center', margin: 0 }}>Constructor de Coaliciones</h3>
                <button className="clear-btn" onClick={clearAll} style={{
                    position: 'absolute',
                    right: 0,
                    background: 'transparent',
                    border: '1px solid var(--surface-border)',
                    color: 'var(--text-muted)',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '0.65rem',
                    cursor: 'pointer'
                }}>Limpiar</button>
            </div>

            {/* Results Area with Background */}
            <div style={{
                background: '#0a0a0a',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                padding: '0.75rem',
                marginBottom: '0.75rem'
            }}>
                {/* Progress Bar: Yes (Green) | Abst (Yellow) | No (Red) */}
                <div className="coalition-bar-container">
                    <div className="coalition-bar-multi">
                        {/* Yes Segments */}
                        {parties.filter(p => getStatus(p.code) === 'yes').map(p => (
                            <div key={p.code} className="bar-segment yes" style={{ width: `${(p.seats / totalSeats) * 100}%`, backgroundColor: p.color }} title={`${p.siglas}: A favor`}></div>
                        ))}
                        {/* Abst Segments (Party color with stripes) */}
                        {parties.filter(p => getStatus(p.code) === 'abst').map(p => (
                            <div key={p.code} className="bar-segment abst" style={{
                                width: `${(p.seats / totalSeats) * 100}%`,
                                background: `repeating-linear-gradient(-45deg, ${p.color}, ${p.color} 6px, rgba(0,0,0,0.6) 6px, rgba(0,0,0,0.6) 12px)`
                            }} title={`${p.siglas}: Abstención`}></div>
                        ))}
                        {/* No Segments - Displaying standard grey/red for No */}
                        <div className="bar-segment no" style={{ flex: 1, backgroundColor: 'rgba(255, 255, 255, 0.1)' }}></div>

                        {/* Majority Marker */}
                        <div className="majority-marker" style={{ left: `${(majoritySeats / totalSeats) * 100}%` }} />
                    </div>
                </div>

                {/* Counters */}
                <div className="coalition-stats">
                    <div className="stat-group yes">
                        <span className="stat-label">A favor</span>
                        <span className="stat-value">{sums.yes}</span>
                    </div>
                    <div className="stat-group abst">
                        <span className="stat-label">Abst.</span>
                        <span className="stat-value">{sums.abst}</span>
                    </div>
                    <div className="stat-group no">
                        <span className="stat-label">En contra</span>
                        <span className="stat-value">{sums.no}</span>
                    </div>
                </div>

                {/* Majority Badge */}
                <div className="majority-status" style={{ marginTop: '0.5rem', textAlign: 'center' }}>
                    {hasAbsoluteMajority ? (
                        <span style={{
                            color: '#00ff88',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            textShadow: '0 0 10px rgba(0, 255, 136, 0.5)'
                        }}>✓ Mayoría Absoluta ({sums.yes} ≥ {majoritySeats})</span>
                    ) : hasSimpleMajority ? (
                        <span style={{
                            color: '#00bfff',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            textShadow: '0 0 10px rgba(0, 191, 255, 0.5)'
                        }}>✓ Mayoría Simple ({sums.yes} &gt; {sums.no})</span>
                    ) : (
                        <span style={{
                            color: '#ff6b6b',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            textShadow: '0 0 10px rgba(255, 107, 107, 0.4)'
                        }}>✗ Sin Mayoría</span>
                    )}
                </div>
            </div>

            {/* Party List */}
            <div className="party-list-scroll">
                {parties.map(p => {
                    const status = getStatus(p.code);

                    // Dynamic row styling based on status
                    let rowStyle = {};
                    let textColor = 'inherit';

                    if (status === 'yes') {
                        // Fill background with party color
                        rowStyle.background = p.color;
                        rowStyle.borderColor = p.color;
                        textColor = 'white';
                    } else if (status === 'abst') {
                        // Stripes going up-right (-45deg)
                        rowStyle.background = `repeating-linear-gradient(-45deg, ${p.color}, ${p.color} 8px, rgba(0,0,0,0.7) 8px, rgba(0,0,0,0.7) 16px)`;
                        rowStyle.borderColor = p.color;
                        textColor = 'white';
                    }

                    return (
                        <div
                            key={p.code}
                            className={`party-row status-${status}`}
                            onClick={() => toggleStatus(p.code)}
                            style={rowStyle}
                        >
                            <div className="party-info">
                                <span className="party-dot" style={{ backgroundColor: status === 'yes' ? 'white' : p.color }}></span>
                                <span className="party-siglas" style={{ color: textColor }}>{p.siglas}</span>
                                <span className="party-seats" style={{ color: textColor, opacity: status !== 'no' ? 0.9 : 1 }}>{p.seats}</span>
                            </div>
                            <div className="party-status-indicator">
                                {status === 'yes' && <span className="status-pill yes" style={{ background: 'transparent', color: 'white' }}>SÍ</span>}
                                {status === 'abst' && <span className="status-pill abst" style={{ background: 'rgba(0,0,0,0.5)', color: 'white' }}>ABST</span>}
                                {status === 'no' && <span className="status-pill no">NO</span>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div >
    );
};

export default CoalitionBuilder;
