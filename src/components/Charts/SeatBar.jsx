import React from 'react';
import { getPartyInfo } from '../../utils/partyColors';

const SeatBar = ({ results, candidacies, showTable = false }) => {
    if (!results || !candidacies) {
        return <div className="seat-bar-loading" style={{ opacity: 0.5 }}>Cargando...</div>;
    }

    // Process Data from Normalized Results: { votes: {}, seats: {}, total: N }

    // 1. Collect all party codes that have votes or seats
    const allCodes = new Set([
        ...Object.keys(results.votes || {}),
        ...Object.keys(results.seats || {})
    ]);

    // 2. Map to objects
    const parties = Array.from(allCodes).map(code => {
        const seats = results.seats[code] || 0;
        const votes = results.votes[code] || 0;

        const party = candidacies[code];
        const siglas = party?.siglas || code;
        const info = getPartyInfo(siglas);

        return {
            code,
            siglas,
            seats,
            votes,
            color: info.color,
            pct: results.total > 0 ? (votes / results.total * 100) : 0
        };
    })
        .sort((a, b) => b.seats - a.seats || b.votes - a.votes);

    // 3. For Bar: Only parties with seats
    const barParties = parties.filter(p => p.seats > 0);

    // Group Minor Parties (< 5 seats) for Bar Visualization
    const majorParties = barParties.filter(p => p.seats >= 5);
    const minorParties = barParties.filter(p => p.seats < 5);

    const otrosSeats = minorParties.reduce((sum, p) => sum + p.seats, 0);
    const otrosVotes = minorParties.reduce((sum, p) => sum + p.votes, 0);

    const displayParties = [...majorParties];
    if (otrosSeats > 0) {
        displayParties.push({
            code: 'OTROS',
            siglas: 'Otros',
            seats: otrosSeats,
            color: '#64748b',
            votes: otrosVotes,
            pct: results.total > 0 ? (otrosVotes / results.total * 100) : 0,
            isOtros: true
        });
    }

    const totalSeats = barParties.reduce((sum, p) => sum + p.seats, 0);
    const majoritySeats = Math.floor(totalSeats / 2) + 1;
    const majorityPercent = totalSeats > 0 ? (majoritySeats / totalSeats * 100) : 50;

    return (
        <div className="seat-bar-container">
            {/* Stacked Bar */}
            {totalSeats > 0 ? (
                <div className="seat-bar">
                    {displayParties.map((p) => {
                        const widthPercent = (p.seats / totalSeats) * 100;
                        const showLabel = p.seats > 10;
                        return (
                            <div
                                key={p.code}
                                className="seat-bar-segment"
                                style={{
                                    width: `${widthPercent}%`,
                                    backgroundColor: p.color
                                }}
                                title={`${p.siglas}: ${p.seats} escaños`}
                            >
                                {showLabel && (
                                    <span className="seat-bar-label">{p.seats}</span>
                                )}
                            </div>
                        );
                    })}
                    {/* Majority Line */}
                    <div
                        className="majority-line"
                        style={{ left: `${majorityPercent}%` }}
                        title={`Mayoría: ${majoritySeats} escaños`}
                    />
                </div>
            ) : (
                <div style={{ opacity: 0.5, fontStyle: 'italic', padding: '1rem', textAlign: 'center' }}>
                    No hay escaños a este nivel
                </div>
            )}

            {/* Majority Info */}
            {totalSeats > 0 && (
                <div className="majority-info">
                    Mayoría absoluta: <strong>{majoritySeats}</strong> escaños · Total: <strong>{totalSeats}</strong>
                </div>
            )}

            {/* Detailed Table */}
            {showTable && (
                <table className="party-table">
                    <thead>
                        <tr>
                            <th>Partido</th>
                            <th>Votos</th>
                            <th>%</th>
                            <th>Escaños</th>
                        </tr>
                    </thead>
                    <tbody>
                        {parties.slice(0, 15).map(p => ( // Show top 15
                            <tr key={p.code}>
                                <td>
                                    <div className="party-cell">
                                        <span className="party-color-dot" style={{ backgroundColor: p.color }}></span>
                                        {p.siglas}
                                    </div>
                                </td>
                                <td>{p.votes.toLocaleString()}</td>
                                <td>{p.pct.toFixed(1)}%</td>
                                <td className="seats-cell">
                                    {p.seats > 0 ? <strong>{p.seats}</strong> : '-'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default SeatBar;
