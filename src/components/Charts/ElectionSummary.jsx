import React, { useState, useEffect, useMemo } from 'react';
import { normalizeParty } from '../../utils/partyUtils';
import { provinces as provinceData } from '../../utils/regionData';
import { useLanguage } from '../../context/LanguageContext';

const ElectionSummary = ({ results, candidacies, elections, selectedElectionId, electionData, filterState }) => {
    const { t } = useLanguage();
    const [compareElectionId, setCompareElectionId] = useState(null);
    const [compareElectionData, setCompareElectionData] = useState(null);
    const [hoveredParty, setHoveredParty] = useState(null);
    const [metric, setMetric] = useState('pct');
    const [sortBy, setSortBy] = useState('seats'); // 'votes', 'pct', or 'seats' (always descending)

    if (!results || !candidacies) {
        return (
            <div className="election-summary loading">
                <div style={{ padding: '1rem', textAlign: 'center', opacity: 0.5 }}>{t('loading')}</div>
            </div>
        );
    }

    const isMunicipales = results.isMunicipales;
    const seatsLabel = isMunicipales ? t('municipalities_label') : t('seats');

    // Get current election
    const currentElection = useMemo(() =>
        elections?.find(e => e.id === selectedElectionId),
        [elections, selectedElectionId]
    );

    // Get available comparison elections
    const availableCompareElections = useMemo(() => {
        if (!currentElection || !elections) return [];
        return elections
            .filter(e => e.type === currentElection.type && e.id !== selectedElectionId)
            .sort((a, b) => {
                const dateA = parseInt(a.year) * 100 + parseInt(a.month || 0);
                const dateB = parseInt(b.year) * 100 + parseInt(b.month || 0);
                return dateB - dateA;
            });
    }, [elections, currentElection, selectedElectionId]);

    // Auto-select comparison election
    useEffect(() => {
        if (availableCompareElections.length > 0) {
            if (!compareElectionId || !availableCompareElections.find(e => e.id === compareElectionId)) {
                setCompareElectionId(availableCompareElections[0].id);
            }
        }
    }, [availableCompareElections]);

    // Fetch comparison data
    useEffect(() => {
        if (!compareElectionId) {
            setCompareElectionData(null);
            return;
        }
        fetch(`/api/results/${compareElectionId}`)
            .then(res => res.json())
            .then(data => setCompareElectionData(data))
            .catch(() => setCompareElectionData(null));
    }, [compareElectionId]);

    const getShortName = (election) => {
        if (!election) return '';
        return election.name.replace(/^(Congreso|Municipales)\s*/i, '');
    };

    // Process current election data
    const aggregated = {};
    Object.entries(results.votes || {}).forEach(([code, votes]) => {
        const party = candidacies[code];
        const siglas = party?.siglas || code;
        const norm = normalizeParty(siglas);
        const key = norm.id;
        if (!aggregated[key]) {
            aggregated[key] = { id: key, siglas: norm.display, votes: 0, seats: 0, color: norm.color };
        }
        aggregated[key].votes += votes;
    });
    Object.entries(results.seats || {}).forEach(([code, seats]) => {
        const party = candidacies[code];
        const siglas = party?.siglas || code;
        const norm = normalizeParty(siglas);
        const key = norm.id;
        if (!aggregated[key]) {
            aggregated[key] = { id: key, siglas: norm.display, votes: 0, seats: 0, color: norm.color };
        }
        aggregated[key].seats += seats;
    });

    // Process comparison data - apply same regional filter as main results
    const compareAggregated = {};
    if (compareElectionData) {
        const compareIsMunicipales = compareElectionData.metadata?.type === '04';
        let compareData = {};

        // Apply same regional filter to comparison data
        const { ccaa, prov, mun } = filterState || {};

        if (mun && compareElectionData.municipalities?.[mun]) {
            // Municipality level
            const mData = compareElectionData.municipalities[mun];
            Object.entries(mData.votes || {}).forEach(([code, votes]) => {
                compareData[code] = { votes, seats: 0 };
            });
        } else if (prov && compareElectionData.provinces?.[prov]) {
            // Province level
            const pData = compareElectionData.provinces[prov];
            Object.entries(pData.votes || {}).forEach(([code, votes]) => {
                compareData[code] = { votes, seats: pData.seats?.[code] || 0 };
            });
        } else if (ccaa && compareElectionData.provinces) {
            // CCAA level - aggregate provinces belonging to this CCAA
            Object.entries(compareElectionData.provinces).forEach(([pCode, pData]) => {
                // Check if province belongs to this CCAA
                const provInfo = provinceData?.[pCode];
                if (provInfo?.ca === ccaa) {
                    Object.entries(pData.votes || {}).forEach(([code, votes]) => {
                        if (!compareData[code]) compareData[code] = { votes: 0, seats: 0 };
                        compareData[code].votes += votes;
                        compareData[code].seats += pData.seats?.[code] || 0;
                    });
                }
            });
        } else if (compareElectionData.summary) {
            // National level - use summary (limit to top parties for performance)
            const summaryEntries = Object.entries(compareElectionData.summary)
                .sort((a, b) => (b[1].votes || 0) - (a[1].votes || 0))
                .slice(0, 100); // Only process top 100 parties by votes

            summaryEntries.forEach(([code, data]) => {
                compareData[code] = {
                    votes: data.votes || 0,
                    seats: compareIsMunicipales ? (data.alcaldias || 0) : (data.seats || 0)
                };
            });
        }

        // Aggregate comparison data by normalized party
        const compareTotalVotes = Object.values(compareData).reduce((sum, d) => sum + (d.votes || 0), 0);
        Object.entries(compareData).forEach(([code, data]) => {
            const siglas = compareElectionData.candidacies?.[code]?.siglas || code;
            const norm = normalizeParty(siglas);
            const key = norm.id;
            if (!compareAggregated[key]) {
                compareAggregated[key] = { votes: 0, seats: 0, pct: 0 };
            }
            compareAggregated[key].votes += data.votes || 0;
            compareAggregated[key].seats += data.seats || 0;
        });
        Object.values(compareAggregated).forEach(p => {
            const compareTotalVotes = Object.values(compareAggregated).reduce((sum, d) => sum + d.votes, 0);
            p.pct = compareTotalVotes > 0 ? (p.votes / compareTotalVotes * 100) : 0;
        });
    }

    // Merge parties from comparison that had >5% but don't exist in current
    Object.entries(compareAggregated).forEach(([key, data]) => {
        if (!aggregated[key] && data.pct > 5) {
            aggregated[key] = {
                id: key,
                siglas: data.display || key,
                votes: 0,
                seats: 0,
                color: data.color || normalizeParty(key).color
            };
        }
    });

    const allParties = Object.values(aggregated);
    const grandTotalVotes = allParties.reduce((sum, p) => sum + p.votes, 0);
    const grandTotalSeats = allParties.reduce((sum, p) => sum + p.seats, 0);

    const parties = allParties
        .map(p => ({
            ...p,
            pct: results.total > 0 ? (p.votes / results.total * 100) : 0,
            comparePct: compareAggregated[p.id]?.pct || 0,
            compareVotes: compareAggregated[p.id]?.votes || 0,
            compareSeats: compareAggregated[p.id]?.seats || 0
        }))
        .map(p => ({
            ...p,
            changePct: p.pct - p.comparePct,
            changeVotes: p.votes - p.compareVotes,
            changeSeats: p.seats - p.compareSeats
        }))
        // Include: has seats, has >0.5% votes, had seats in comparison, OR had >5% in comparison
        .filter(p => p.seats > 0 || p.pct > 0.5 || p.compareSeats > 0 || p.comparePct > 5)
        .sort((a, b) => {
            // Always sort descending (max to min)
            if (sortBy === 'votes') return b.votes - a.votes;
            if (sortBy === 'pct') return b.pct - a.pct;
            return b.seats - a.seats || b.votes - a.votes;
        })
        .slice(0, 25);

    const totalVotes = results.total || grandTotalVotes;
    const totalSeats = grandTotalSeats;

    // Calculate "Others" data
    const displayedVotes = parties.reduce((sum, p) => sum + p.votes, 0);
    const displayedSeats = parties.reduce((sum, p) => sum + p.seats, 0);
    const othersVotes = grandTotalVotes - displayedVotes;
    const othersSeats = grandTotalSeats - displayedSeats;
    const othersPct = totalVotes > 0 ? (othersVotes / totalVotes * 100) : 0;
    const othersCount = allParties.length - parties.length;

    // Bar scaling
    const getBarValues = (p) => {
        if (metric === 'seats') return { current: p.seats, compare: p.compareSeats };
        if (metric === 'votes') return { current: p.votes, compare: p.compareVotes };
        return { current: p.pct, compare: p.comparePct };
    };
    const maxBarValue = Math.max(...parties.flatMap(p => [getBarValues(p).current, getBarValues(p).compare]), 1);

    const getChange = (p) => {
        if (metric === 'seats') return p.changeSeats;
        if (metric === 'votes') return p.changeVotes;
        return p.changePct;
    };

    const formatChange = (change) => {
        if (metric === 'pct') return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
        return `${change >= 0 ? '+' : ''}${change.toLocaleString()}`;
    };

    const compareElection = availableCompareElections.find(e => e.id === compareElectionId);
    const hasComparison = compareElectionData && availableCompareElections.length > 0;

    return (
        <div className="election-summary">
            {/* Comparison controls */}
            {elections && elections.length > 1 && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.75rem',
                    fontSize: '0.7rem',
                    padding: '0.5rem',
                    background: 'var(--surface)',
                    borderRadius: '6px'
                }}>
                    <span style={{ opacity: 0.6 }}>{t('compare')}</span>
                    <select
                        className="premium-select"
                        value={compareElectionId || ''}
                        onChange={(e) => setCompareElectionId(e.target.value)}
                        style={{ flex: 1, padding: '0.25rem', fontSize: '0.7rem' }}
                    >
                        {availableCompareElections.map(e => (
                            <option key={e.id} value={e.id}>{getShortName(e)}</option>
                        ))}
                    </select>
                    <select
                        className="premium-select"
                        value={metric}
                        onChange={(e) => setMetric(e.target.value)}
                        style={{ padding: '0.25rem', fontSize: '0.65rem', width: '70px' }}
                    >
                        <option value="pct">%</option>
                        <option value="seats">{seatsLabel}</option>
                        <option value="votes">{t('votes')}</option>
                    </select>
                </div>
            )}

            <div className="table-container">
                <table className="party-table" style={{ tableLayout: 'fixed', width: '100%' }}>
                    <thead>
                        <tr>
                            <th style={{ textAlign: 'left', width: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t('party')}</th>
                            {hasComparison && <th style={{ width: '120px' }}></th>}
                            <th
                                className="mobile-hide"
                                style={{ textAlign: 'right', width: '80px', cursor: 'pointer', userSelect: 'none' }}
                                onClick={() => setSortBy('votes')}
                            >
                                {t('votes')} {sortBy === 'votes' && '▼'}
                            </th>
                            <th
                                style={{ textAlign: 'right', width: '50px', cursor: 'pointer', userSelect: 'none' }}
                                onClick={() => setSortBy('pct')}
                            >
                                % {sortBy === 'pct' && '▼'}
                            </th>
                            <th
                                style={{ textAlign: 'right', width: '70px', cursor: 'pointer', userSelect: 'none' }}
                                onClick={() => setSortBy('seats')}
                            >
                                {seatsLabel} {sortBy === 'seats' && '▼'}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {parties.map(p => {
                            const barVals = getBarValues(p);
                            const change = getChange(p);
                            const isHovered = hoveredParty === p.id;

                            return (
                                <tr
                                    key={p.id}
                                    onMouseEnter={() => setHoveredParty(p.id)}
                                    onMouseLeave={() => setHoveredParty(null)}
                                    onClick={() => setHoveredParty(prev => prev === p.id ? null : p.id)}
                                    style={{ position: 'relative', cursor: 'pointer' }}
                                >
                                    <td style={{ maxWidth: '14ch' }}>
                                        <div className="party-cell" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            <span className="party-color-dot" style={{ backgroundColor: p.color }}></span>
                                            {p.siglas}
                                        </div>
                                    </td>
                                    {hasComparison && (
                                        <td style={{ padding: '0.25rem 0.5rem', position: 'relative' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                    {/* Compare bar (faded) */}
                                                    <div style={{
                                                        height: '8px',
                                                        background: 'rgba(255,255,255,0.08)',
                                                        borderRadius: '2px',
                                                        overflow: 'hidden'
                                                    }}>
                                                        <div style={{
                                                            width: `${(barVals.compare / maxBarValue) * 100}%`,
                                                            height: '100%',
                                                            background: p.color,
                                                            opacity: 0.4,
                                                            transition: 'width 0.2s'
                                                        }} />
                                                    </div>
                                                    {/* Current bar */}
                                                    <div style={{
                                                        height: '8px',
                                                        background: 'rgba(255,255,255,0.08)',
                                                        borderRadius: '2px',
                                                        overflow: 'hidden'
                                                    }}>
                                                        <div style={{
                                                            width: `${(barVals.current / maxBarValue) * 100}%`,
                                                            height: '100%',
                                                            background: p.color,
                                                            transition: 'width 0.2s'
                                                        }} />
                                                    </div>
                                                </div>
                                                {/* Change indicator */}
                                                <span style={{
                                                    fontSize: '0.65rem',
                                                    fontWeight: 500,
                                                    color: change >= 0 ? '#4ade80' : '#ef4444',
                                                    minWidth: '40px',
                                                    textAlign: 'right'
                                                }}>
                                                    {formatChange(change)}
                                                </span>
                                            </div>
                                            {/* Instant tooltip on hover */}
                                            {isHovered && (
                                                <div style={{
                                                    position: 'absolute',
                                                    left: '50%',
                                                    bottom: '100%',
                                                    transform: 'translateX(-50%)',
                                                    background: 'var(--bg)',
                                                    border: '1px solid var(--surface-border)',
                                                    borderRadius: '6px',
                                                    padding: '0.5rem',
                                                    fontSize: '0.65rem',
                                                    zIndex: 100,
                                                    whiteSpace: 'nowrap',
                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                                                    marginBottom: '4px'
                                                }}>
                                                    <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{p.siglas}</div>
                                                    <div style={{ opacity: 0.6 }}>{getShortName(compareElection)}:</div>
                                                    <div>{p.compareVotes.toLocaleString()} ({p.comparePct.toFixed(1)}%) - {p.compareSeats} {seatsLabel.toLowerCase()}</div>
                                                    <div style={{ opacity: 0.6, marginTop: '0.25rem' }}>{getShortName(currentElection)}:</div>
                                                    <div>{p.votes.toLocaleString()} ({p.pct.toFixed(1)}%) - {p.seats} {seatsLabel.toLowerCase()}</div>
                                                </div>
                                            )}
                                        </td>
                                    )}
                                    <td className="mobile-hide" style={{ textAlign: 'right' }}>{p.votes.toLocaleString()}</td>
                                    <td style={{ textAlign: 'right' }}>{p.pct.toFixed(1)}%</td>
                                    <td className="seats-cell" style={{ textAlign: 'right' }}>
                                        {p.seats > 0 ? <strong>{p.seats}</strong> : <span style={{ opacity: 0.3 }}>-</span>}
                                    </td>
                                </tr>
                            );
                        })}
                        {/* Others row */}
                        {othersCount > 0 && (
                            <tr style={{ opacity: 0.7, fontStyle: 'italic' }}>
                                <td>{t('others')} ({othersCount} {t('parties')})</td>
                                {hasComparison && <td></td>}
                                <td className="mobile-hide" style={{ textAlign: 'right' }}>{othersVotes.toLocaleString()}</td>
                                <td style={{ textAlign: 'right' }}>{othersPct.toFixed(1)}%</td>
                                <td className="seats-cell" style={{ textAlign: 'right' }}>
                                    {othersSeats > 0 ? <strong>{othersSeats}</strong> : <span style={{ opacity: 0.3 }}>-</span>}
                                </td>
                            </tr>
                        )}
                    </tbody>
                    <tfoot>
                        <tr style={{ borderTop: '2px solid var(--surface-border)', fontWeight: 600 }}>
                            <td>{t('total')}</td>
                            {hasComparison && (
                                <td style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--primary)' }}>
                                    {electionData?.metadata?.censo > 0 && electionData?.metadata?.total_votos > 0 && (
                                        <span style={{ fontFamily: 'inherit', fontSize: '1rem' }}>{t('participation')}: {((electionData.metadata.total_votos / electionData.metadata.censo) * 100).toFixed(2)}%</span>
                                    )}
                                </td>
                            )}
                            <td className="mobile-hide" style={{ textAlign: 'right' }}>{totalVotes.toLocaleString()}</td>
                            <td style={{ textAlign: 'right' }}>100%</td>
                            <td className="seats-cell" style={{ textAlign: 'right' }}>
                                <strong>{totalSeats}</strong>
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};

export default ElectionSummary;
