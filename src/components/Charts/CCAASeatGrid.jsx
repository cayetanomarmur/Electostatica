import React, { useMemo, useState, useRef } from 'react';
import { normalizeParty } from '../../utils/partyUtils';
import { communities, provinces } from '../../utils/regionData';

/**
 * CCAASeatGrid - Shows seat/municipality share by CCAA using colored squares
 * Each row is a CCAA, each cell is a party's share
 */
const CCAASeatGrid = ({ electionData }) => {
    const isMunicipales = electionData?.metadata?.isMunicipales;
    const seatLabel = isMunicipales ? 'Municipios' : 'Escaños';
    const [viewMode, setViewMode] = useState('seats'); // 'seats' or 'percentage'
    const [hoveredCell, setHoveredCell] = useState(null); // { ccaa, party, value, x, y }
    const containerRef = useRef(null);

    // Build aggregated data by CCAA
    const ccaaData = useMemo(() => {
        if (!electionData) return [];

        const result = {};

        // For Congreso: aggregate provinces by CCAA
        if (electionData.provinces && !isMunicipales) {
            Object.entries(electionData.provinces).forEach(([provCode, provData]) => {
                const provInfo = provinces[provCode];
                if (!provInfo) return;

                const ccaaCode = provInfo.ca;
                if (!result[ccaaCode]) {
                    result[ccaaCode] = { name: communities[ccaaCode] || ccaaCode, seats: {}, votes: {} };
                }

                Object.entries(provData.seats || {}).forEach(([party, seats]) => {
                    const norm = normalizeParty(electionData.candidacies?.[party]?.siglas || party);
                    result[ccaaCode].seats[norm.id] = (result[ccaaCode].seats[norm.id] || 0) + seats;
                });

                Object.entries(provData.votes || {}).forEach(([party, votes]) => {
                    const norm = normalizeParty(electionData.candidacies?.[party]?.siglas || party);
                    result[ccaaCode].votes[norm.id] = (result[ccaaCode].votes[norm.id] || 0) + votes;
                });
            });
        }

        // For Municipales: aggregate municipalities by province -> CCAA
        if (electionData.municipalities && isMunicipales) {
            Object.entries(electionData.municipalities).forEach(([munId, munData]) => {
                const provCode = String(munData.prov).padStart(2, '0');
                const provInfo = provinces[provCode];
                if (!provInfo) return;

                const ccaaCode = provInfo.ca;
                if (!result[ccaaCode]) {
                    result[ccaaCode] = { name: communities[ccaaCode] || ccaaCode, seats: {}, votes: {} };
                }

                // Find winner and aggregate votes
                const votes = munData.votes || {};
                if (Object.keys(votes).length === 0) return;

                const winner = Object.entries(votes).sort((a, b) => b[1] - a[1])[0][0];
                const winnerNorm = normalizeParty(electionData.candidacies?.[winner]?.siglas || winner);
                result[ccaaCode].seats[winnerNorm.id] = (result[ccaaCode].seats[winnerNorm.id] || 0) + 1;

                // Aggregate all votes for percentage mode
                Object.entries(votes).forEach(([party, v]) => {
                    const norm = normalizeParty(electionData.candidacies?.[party]?.siglas || party);
                    result[ccaaCode].votes[norm.id] = (result[ccaaCode].votes[norm.id] || 0) + v;
                });
            });
        }

        // Convert to array, precompute entries for both modes, and sort
        return Object.entries(result)
            .map(([code, data]) => {
                const totalSeats = Object.values(data.seats).reduce((sum, s) => sum + s, 0);
                const totalVotes = Object.values(data.votes).reduce((sum, v) => sum + v, 0);

                // Precompute entries for seats mode (with party normalization done once)
                const seatsEntries = Object.entries(data.seats)
                    .map(([party, seats]) => {
                        const norm = normalizeParty(party);
                        return {
                            party,
                            display: norm.display,
                            color: norm.color,
                            value: seats,
                            seats: seats,
                            votes: data.votes[party] || 0,
                            pct: totalSeats > 0 ? ((seats / totalSeats) * 100).toFixed(1) : 0
                        };
                    })
                    .sort((a, b) => b.value - a.value)
                    .slice(0, 10);

                // Precompute entries for percentage mode
                const votesEntries = Object.entries(data.votes)
                    .map(([party, votes]) => {
                        const norm = normalizeParty(party);
                        return {
                            party,
                            display: norm.display,
                            color: norm.color,
                            value: votes,
                            seats: data.seats[party] || 0,
                            votes: votes,
                            pct: totalVotes > 0 ? ((votes / totalVotes) * 100).toFixed(1) : 0
                        };
                    })
                    .sort((a, b) => b.value - a.value)
                    .slice(0, 10);

                return {
                    code,
                    name: data.name,
                    seats: data.seats,
                    votes: data.votes,
                    totalSeats,
                    totalVotes,
                    seatsEntries,
                    votesEntries
                };
            })
            .filter(c => c.totalSeats > 0)
            .sort((a, b) => b.totalSeats - a.totalSeats);
    }, [electionData, isMunicipales]);

    if (!ccaaData.length) return null;

    // Get all parties and sort by national totals
    const allParties = {};
    ccaaData.forEach(ccaa => {
        Object.entries(ccaa.seats).forEach(([party, seats]) => {
            allParties[party] = (allParties[party] || 0) + seats;
        });
    });

    const sortedParties = Object.entries(allParties)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([id]) => {
            const norm = normalizeParty(id);
            return { id, display: norm.display, color: norm.color };
        });

    return (
        <div className="ccaa-seat-grid" ref={containerRef} style={{
            marginTop: '1rem',
            paddingTop: '1rem',
            background: 'var(--surface)',
            borderRadius: '12px',
            padding: '1rem',
            position: 'relative',
            zIndex: 1,
            flexShrink: 0
        }}>
            <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'space-between' }}>
                <span style={{ textTransform: 'uppercase', tracking: '0.05em' }}>Distribución por CCAA</span>
                <div style={{ display: 'flex', background: 'var(--surface-border)', borderRadius: '4px', padding: '2px', gap: '2px' }}>
                    <button
                        onClick={() => setViewMode('seats')}
                        style={{
                            background: viewMode === 'seats' ? 'var(--primary)' : 'transparent',
                            color: viewMode === 'seats' ? 'var(--bg)' : 'var(--text-muted)',
                            border: 'none',
                            padding: '2px 8px',
                            borderRadius: '2px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        {seatLabel}
                    </button>
                    <button
                        onClick={() => setViewMode('percentage')}
                        style={{
                            background: viewMode === 'percentage' ? 'var(--primary)' : 'transparent',
                            color: viewMode === 'percentage' ? 'var(--bg)' : 'var(--text-muted)',
                            border: 'none',
                            padding: '2px 8px',
                            borderRadius: '2px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        % Votos
                    </button>
                </div>
            </h4>

            {/* Legend */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                {sortedParties.map(p => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem' }}>
                        <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: p.color }}></span>
                        <span>{p.display}</span>
                    </div>
                ))}
            </div>

            {/* Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', position: 'relative' }}>
                {ccaaData.map(ccaa => {
                    // Use precomputed entries based on viewMode (fast!)
                    const entries = viewMode === 'seats' ? ccaa.seatsEntries : ccaa.votesEntries;
                    const total = viewMode === 'seats' ? ccaa.totalSeats : ccaa.totalVotes;

                    return (
                        <div key={ccaa.code} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', position: 'relative' }}>
                            <div style={{
                                width: '120px',
                                fontSize: '0.75rem',
                                textOverflow: 'ellipsis',
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                                opacity: 0.9
                            }}>
                                {ccaa.name}
                            </div>
                            <div style={{
                                flex: 1,
                                height: '15px',
                                display: 'flex',
                                borderRadius: '4px',
                                overflow: 'hidden',
                                background: 'rgba(255,255,255,0.05)'
                            }}>
                                {entries.map(e => (
                                    <div
                                        key={e.party}
                                        style={{
                                            width: `${(e.value / total) * 100}%`,
                                            background: e.color,
                                            transition: 'width 0.3s',
                                            cursor: 'pointer'
                                        }}
                                        onMouseEnter={(ev) => {
                                            const rect = containerRef.current?.getBoundingClientRect() || { left: 0, top: 0 };
                                            setHoveredCell({
                                                ccaa: ccaa.code, ccaaName: ccaa.name, party: e.party,
                                                display: e.display, seats: e.seats, pct: e.pct,
                                                x: ev.clientX - rect.left, y: ev.clientY - rect.top
                                            });
                                        }}
                                        onMouseMove={(ev) => {
                                            if (hoveredCell) {
                                                const rect = containerRef.current?.getBoundingClientRect() || { left: 0, top: 0 };
                                                setHoveredCell(prev => prev ? { ...prev, x: ev.clientX - rect.left, y: ev.clientY - rect.top } : null);
                                            }
                                        }}
                                        onMouseLeave={() => setHoveredCell(null)}
                                    />
                                ))}
                            </div>
                            <div style={{ width: '50px', fontSize: '0.75rem', textAlign: 'right', opacity: 0.7 }}>
                                {viewMode === 'seats' ? ccaa.totalSeats : `${((ccaa.totalVotes / 1000000).toFixed(1))}M`}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Global tooltip that follows cursor */}
            {hoveredCell && (
                <div style={{
                    position: 'absolute',
                    top: (hoveredCell.y || 0) - 35,
                    left: (hoveredCell.x || 0) + 10,
                    background: 'rgba(0,0,0,0.95)',
                    color: 'white',
                    padding: '5px 12px',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                    zIndex: 1000,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                }}>
                    <strong>{hoveredCell.display}</strong>: {hoveredCell.seats} {seatLabel.toLowerCase()} ({hoveredCell.pct}%)
                </div>
            )}
        </div>
    );
};

export default CCAASeatGrid;
