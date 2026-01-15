import React from 'react';
import { normalizeParty } from '../utils/partyUtils';

const SavedPredictions = ({ savedList, onLoad, onDelete }) => {
    const maxSeats = 350;
    const majoritySeats = 176;

    return (
        <div className="saved-predictions-panel">
            <h3>Escenarios ({savedList.length})</h3>

            <div className="saved-list">
                {savedList.length === 0 && <p className="no-saved">No hay escenarios guardados.</p>}
                {savedList.map((item) => {
                    // Prepare visual bar data - only SELECTED parties
                    const parties = Object.entries(item.selectedSeats || {})
                        .filter(([_, seats]) => seats > 0)
                        .map(([party, seats]) => {
                            const status = item.selectedParties?.[party] || 'yes';
                            const norm = normalizeParty(party);
                            return {
                                party,
                                seats,
                                status,
                                display: norm.display || party,
                                color: norm.color
                            };
                        })
                        .sort((a, b) => b.seats - a.seats);

                    const totalSelectedSeats = parties.reduce((s, p) => p.status === 'yes' ? s + p.seats : s, 0);
                    const totalAbstSeats = parties.reduce((s, p) => p.status === 'abst' ? s + p.seats : s, 0);
                    const hasMajority = totalSelectedSeats >= majoritySeats;

                    // Format party names
                    const partyNames = parties.map(p => {
                        return p.status === 'abst' ? `${p.display} (Abst)` : p.display;
                    }).join(' + ');

                    return (
                        <div key={item.id} className="saved-item" onClick={() => onLoad(item.seats, item.selectedParties)}>
                            <div className="saved-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span className="saved-name">{item.name}</span>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                                    className="delete-btn"
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: '#ef4444',
                                        fontSize: '1.2rem',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        padding: '0 4px',
                                        lineHeight: 1,
                                        transition: 'color 0.2s, transform 0.2s'
                                    }}
                                    onMouseEnter={(e) => { e.target.style.color = '#ff6b6b'; e.target.style.transform = 'scale(1.2)'; }}
                                    onMouseLeave={(e) => { e.target.style.color = '#ef4444'; e.target.style.transform = 'scale(1)'; }}
                                >✕</button>
                            </div>

                            {/* Mini Bar Visualization with Majority Line */}
                            <div className="mini-seat-bar-container" style={{ position: 'relative' }}>
                                <div className="mini-seat-bar" style={{
                                    display: 'flex',
                                    height: '24px',
                                    width: '100%',
                                    borderRadius: '6px',
                                    overflow: 'hidden',
                                    marginTop: '6px',
                                    background: 'rgba(255,255,255,0.05)'
                                }}>
                                    {parties.map(p => (
                                        <div
                                            key={p.party}
                                            style={{
                                                width: `${(p.seats / maxSeats) * 100}%`,
                                                background: p.status === 'abst' ?
                                                    `repeating-linear-gradient(
                                                        -45deg,
                                                        ${p.color || '#999'},
                                                        ${p.color || '#999'} 4px,
                                                        rgba(0,0,0,0.5) 4px,
                                                        rgba(0,0,0,0.5) 8px
                                                    )` : (p.color || '#ccc'),
                                                transition: 'width 0.3s'
                                            }}
                                            title={`${p.display}: ${p.seats} ${p.status === 'abst' ? '(Abstención)' : ''}`}
                                        />
                                    ))}
                                </div>
                                {/* Majority Line */}
                                <div style={{
                                    position: 'absolute',
                                    left: `${(majoritySeats / maxSeats) * 100}%`,
                                    top: '6px',
                                    height: '24px',
                                    width: '2px',
                                    background: hasMajority ? 'var(--primary)' : '#ef4444',
                                    zIndex: 2
                                }} title={`Mayoría: ${majoritySeats}`} />
                            </div>

                            {/* Party Names and Majority Status */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginTop: '8px',
                                gap: '8px'
                            }}>
                                <span style={{
                                    fontSize: '0.75rem',
                                    color: 'var(--text-muted)',
                                    flex: 1,
                                    textAlign: 'center',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {partyNames} = <strong>{totalSelectedSeats}</strong>{totalAbstSeats > 0 && <span style={{ opacity: 0.7 }}> (+{totalAbstSeats})</span>}
                                </span>
                                <span style={{
                                    fontSize: '0.7rem',
                                    fontWeight: 600,
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    whiteSpace: 'nowrap',
                                    background: hasMajority ? 'rgba(0, 255, 136, 0.15)' : 'rgba(239,68,68,0.15)',
                                    color: hasMajority ? '#00ff88' : '#ef4444',
                                    textShadow: hasMajority ? '0 0 8px rgba(0, 255, 136, 0.3)' : 'none'
                                }}>
                                    {hasMajority ? '✓ Mayoría alcanzada' : 'Mayoría no alcanzada'}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default SavedPredictions;
