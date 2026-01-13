import React, { useState, useEffect, useMemo } from 'react';
import { normalizeParty } from '../../utils/partyUtils';

/**
 * VoteComparisonChart - Shows comparison between current and selected election
 * Features: metric selector (seats/vote%/votes), hover tooltips, election dropdown
 */
const VoteComparisonChart = ({ elections, selectedElectionId, electionData }) => {
    const [compareElectionId, setCompareElectionId] = useState(null);
    const [compareElectionData, setCompareElectionData] = useState(null);
    const [metric, setMetric] = useState('pct'); // 'pct', 'seats', 'votes'

    // Get current election info
    const currentElection = useMemo(() =>
        elections.find(e => e.id === selectedElectionId),
        [elections, selectedElectionId]
    );

    // Get available elections of same type (excluding current)
    const availableCompareElections = useMemo(() => {
        if (!currentElection) return [];
        return elections
            .filter(e => e.type === currentElection.type && e.id !== selectedElectionId)
            .sort((a, b) => {
                const dateA = parseInt(a.year) * 100 + parseInt(a.month || 0);
                const dateB = parseInt(b.year) * 100 + parseInt(b.month || 0);
                return dateB - dateA;
            });
    }, [elections, currentElection, selectedElectionId]);

    // Auto-select first available election when current changes
    useEffect(() => {
        if (availableCompareElections.length > 0 && !compareElectionId) {
            setCompareElectionId(availableCompareElections[0].id);
        } else if (availableCompareElections.length > 0) {
            if (!availableCompareElections.find(e => e.id === compareElectionId)) {
                setCompareElectionId(availableCompareElections[0].id);
            }
        }
    }, [availableCompareElections, compareElectionId]);

    // Fetch compare election data
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

    // Get short name (remove type prefix)
    const getShortName = (election) => {
        if (!election) return '';
        return election.name.replace(/^(Congreso|Municipales)\s*/i, '');
    };

    if (!electionData?.summary || !compareElectionData?.summary) return null;

    const isMunicipales = electionData.metadata?.isMunicipales;
    const seatsLabel = isMunicipales ? 'municipios' : 'escaños';

    // Calculate totals
    const currentTotalVotes = Object.values(electionData.summary).reduce((sum, d) => sum + (d.votes || 0), 0);
    const compareTotalVotes = Object.values(compareElectionData.summary).reduce((sum, d) => sum + (d.votes || 0), 0);

    // Aggregate by normalized party
    const aggregateData = (summary, candidacies, total) => {
        const result = {};
        Object.entries(summary).forEach(([code, data]) => {
            const siglas = candidacies?.[code]?.siglas || code;
            const norm = normalizeParty(siglas);
            if (!result[norm.id]) {
                result[norm.id] = { display: norm.display, color: norm.color, votes: 0, seats: 0 };
            }
            result[norm.id].votes += data.votes || 0;
            result[norm.id].seats += data.seats || data.alcaldias || 0;
        });
        Object.values(result).forEach(p => {
            p.pct = total > 0 ? (p.votes / total * 100) : 0;
        });
        return result;
    };

    const currentData = aggregateData(electionData.summary, electionData.candidacies, currentTotalVotes);
    const compareData = aggregateData(compareElectionData.summary, compareElectionData.candidacies, compareTotalVotes);

    // Get all parties with seats in EITHER election
    const allPartyIds = new Set([
        ...Object.entries(currentData).filter(([_, d]) => d.seats > 0).map(([id]) => id),
        ...Object.entries(compareData).filter(([_, d]) => d.seats > 0).map(([id]) => id)
    ]);

    const parties = Array.from(allPartyIds)
        .map(id => ({
            id,
            display: currentData[id]?.display || compareData[id]?.display || id,
            color: currentData[id]?.color || compareData[id]?.color || '#64748B',
            currentPct: currentData[id]?.pct || 0,
            comparePct: compareData[id]?.pct || 0,
            currentSeats: currentData[id]?.seats || 0,
            compareSeats: compareData[id]?.seats || 0,
            currentVotes: currentData[id]?.votes || 0,
            compareVotes: compareData[id]?.votes || 0,
        }))
        .map(p => ({
            ...p,
            changePct: p.currentPct - p.comparePct,
            changeSeats: p.currentSeats - p.compareSeats,
            changeVotes: p.currentVotes - p.compareVotes
        }))
        .sort((a, b) => b.currentSeats - a.currentSeats || b.currentPct - a.currentPct);

    const compareElection = availableCompareElections.find(e => e.id === compareElectionId);

    // Get max value for bar scaling based on metric
    const getBarValue = (p, isCompare) => {
        if (metric === 'seats') return isCompare ? p.compareSeats : p.currentSeats;
        if (metric === 'votes') return isCompare ? p.compareVotes : p.currentVotes;
        return isCompare ? p.comparePct : p.currentPct;
    };

    const maxValue = Math.max(...parties.flatMap(p => [getBarValue(p, true), getBarValue(p, false)]), 1);

    // Get change value and format
    const getChange = (p) => {
        if (metric === 'seats') return { value: p.changeSeats, suffix: '' };
        if (metric === 'votes') return { value: p.changeVotes, suffix: '' };
        return { value: p.changePct, suffix: '%' };
    };

    const formatChange = (p) => {
        const { value, suffix } = getChange(p);
        const formatted = metric === 'pct' ? value.toFixed(1) : value.toLocaleString();
        return `${value >= 0 ? '+' : ''}${formatted}${suffix}`;
    };

    // Build tooltip content
    const buildTooltip = (p, isCompare) => {
        const election = isCompare ? compareElection : currentElection;
        const votes = isCompare ? p.compareVotes : p.currentVotes;
        const pct = isCompare ? p.comparePct : p.currentPct;
        const seats = isCompare ? p.compareSeats : p.currentSeats;
        return `${p.display} - ${getShortName(election)}\n${votes.toLocaleString()} votos (${pct.toFixed(1)}%)\n${seats} ${seatsLabel}`;
    };

    return (
        <div className="vote-comparison-chart" style={{
            marginTop: '1rem',
            padding: '0.75rem',
            background: 'var(--surface)',
            borderRadius: '8px'
        }}>
            {/* Header with dropdowns */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.75rem',
                fontSize: '0.7rem'
            }}>
                <select
                    className="premium-select"
                    value={compareElectionId || ''}
                    onChange={(e) => setCompareElectionId(e.target.value)}
                    style={{ flex: 1, padding: '0.3rem', fontSize: '0.7rem' }}
                >
                    {availableCompareElections.map(e => (
                        <option key={e.id} value={e.id}>{getShortName(e)}</option>
                    ))}
                </select>
                <span style={{ opacity: 0.5 }}>→</span>
                <span style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{getShortName(currentElection)}</span>
                <select
                    className="premium-select"
                    value={metric}
                    onChange={(e) => setMetric(e.target.value)}
                    style={{ padding: '0.3rem', fontSize: '0.65rem', width: '80px' }}
                >
                    <option value="pct">% Votos</option>
                    <option value="seats">{isMunicipales ? 'Municipios' : 'Escaños'}</option>
                    <option value="votes">Votos</option>
                </select>
            </div>

            {/* Party comparison bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '300px', overflowY: 'auto' }}>
                {parties.map(p => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '55px', fontSize: '0.65rem', textAlign: 'right', fontWeight: 500 }}>
                            {p.display}
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1px' }}>
                            {/* Compare election bar (faded) */}
                            <div
                                style={{
                                    height: '6px',
                                    background: 'rgba(255,255,255,0.1)',
                                    borderRadius: '2px',
                                    overflow: 'hidden',
                                    cursor: 'pointer'
                                }}
                                title={buildTooltip(p, true)}
                            >
                                <div style={{
                                    width: `${(getBarValue(p, true) / maxValue) * 100}%`,
                                    height: '100%',
                                    background: p.color,
                                    opacity: 0.4,
                                    transition: 'width 0.3s'
                                }} />
                            </div>
                            {/* Current election bar */}
                            <div
                                style={{
                                    height: '6px',
                                    background: 'rgba(255,255,255,0.1)',
                                    borderRadius: '2px',
                                    overflow: 'hidden',
                                    cursor: 'pointer'
                                }}
                                title={buildTooltip(p, false)}
                            >
                                <div style={{
                                    width: `${(getBarValue(p, false) / maxValue) * 100}%`,
                                    height: '100%',
                                    background: p.color,
                                    transition: 'width 0.3s'
                                }} />
                            </div>
                        </div>
                        <div style={{
                            width: '50px',
                            fontSize: '0.6rem',
                            textAlign: 'right',
                            color: getChange(p).value >= 0 ? '#4ade80' : '#ef4444'
                        }}>
                            {formatChange(p)}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default VoteComparisonChart;
