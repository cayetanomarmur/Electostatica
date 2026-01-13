import React, { useState, useEffect, useMemo } from 'react';
import { normalizeParty } from '../utils/partyUtils';
import SavedPredictions from './SavedPredictions';

/**
 * Predictor v3 - With Election Selection
 * - Allows selecting election type (Congreso/Municipales)
 * - Allows selecting specific election as baseline
 * - Normalizes data inputs (aliases merged)
 * - Scenario Bar for quick switching
 */
const Predictor = () => {
    // Election selection state
    const [elections, setElections] = useState([]);
    const [electionType, setElectionType] = useState('congreso');
    const [selectedElectionId, setSelectedElectionId] = useState('');
    const [electionData, setElectionData] = useState(null);
    const [loading, setLoading] = useState(true);

    // Predictor state
    const [customSeats, setCustomSeats] = useState({});
    const [selectedParties, setSelectedParties] = useState({}); // { [code]: 'yes' | 'abst' }
    const [abstencion, setAbstencion] = useState(30); // Abstention percentage (default 30%)

    // Scenario State (Session-only)
    const [scenarios, setScenarios] = useState([]);
    const [scenarioName, setScenarioName] = useState('');

    // Fetch elections list
    useEffect(() => {
        fetch('/api/elections')
            .then(res => res.json())
            .then(data => {
                const sorted = data.sort((a, b) => b.year - a.year || b.month - a.month);
                setElections(sorted);
                // Set initial selection to first congreso election
                const firstCongreso = sorted.find(e => e.type === 'congreso');
                if (firstCongreso) {
                    setSelectedElectionId(firstCongreso.id);
                }
            });
    }, []);

    // Group elections by type
    const electionsByType = useMemo(() => {
        const congreso = elections.filter(e => e.type === 'congreso')
            .sort((a, b) => b.year - a.year || b.month - a.month);
        const municipales = elections.filter(e => e.type === 'municipales')
            .sort((a, b) => b.year - a.year || b.month - a.month);
        return { congreso, municipales };
    }, [elections]);

    // Fetch election data when selection changes
    useEffect(() => {
        if (!selectedElectionId) return;
        setLoading(true);
        fetch(`/api/results/${selectedElectionId}`)
            .then(res => res.json())
            .then(data => {
                setElectionData(data);
                setLoading(false);
            });
    }, [selectedElectionId]);

    // Initialize seats and abstention when election data changes
    useEffect(() => {
        if (electionData?.summary) {
            const isMunicipales = electionData.metadata?.isMunicipales;
            const initial = {};

            // Calculate real abstention
            // We need total census and total voters. Summary usually contains parties.
            // Where are globals? Usually they are aggregated from regions if not present.
            // We'll iterate all summary entries to sum votes vs census approx? 
            // Actually, usually `summary` is keyed by party code. 
            // We need metadata for participation.
            // If API provides metadata.totalCensus / metadata.totalVoters use that.
            // Otherwise, we might default to 30.

            // Assuming metadata has it based on other components
            if (electionData.metadata) {
                const census = electionData.metadata.census || 0;
                const voters = electionData.metadata.voters || 0;
                if (census > 0) {
                    const abstPct = ((census - voters) / census) * 100;
                    setAbstencion(Math.round(abstPct));
                }
            }

            Object.entries(electionData.summary).forEach(([code, data]) => {
                const seatValue = isMunicipales ? (data.alcaldias || 0) : (data.seats || 0);
                if (seatValue > 0) {
                    const cand = electionData.candidacies?.[code];
                    const rawSiglas = cand ? cand.siglas : code;
                    const norm = normalizeParty(rawSiglas);
                    initial[norm.id] = (initial[norm.id] || 0) + seatValue;
                }
            });
            setCustomSeats(initial);
            setSelectedParties({});
        }
    }, [electionData]);

    // Handle election type change
    const handleTypeChange = (newType) => {
        setElectionType(newType);
        const electionsOfType = electionsByType[newType];
        if (electionsOfType && electionsOfType.length > 0) {
            setSelectedElectionId(electionsOfType[0].id);
        }
    };

    if (loading && !electionData) {
        return <div className="predictor-loading">Cargando datos...</div>;
    }

    // Determine if current election is municipales
    const isMunicipales = electionData?.metadata?.isMunicipales;
    const seatLabel = isMunicipales ? 'Municipios' : 'Escaños';
    const maxSeats = isMunicipales ? 8131 : 350;
    const majoritySeats = isMunicipales ? Math.ceil(maxSeats / 2) : 176;

    // Build party list from normalized state
    const parties = Object.entries(customSeats)
        .map(([id, seats]) => {
            const norm = normalizeParty(id);
            return {
                code: id,
                siglas: norm.display || id,
                seats: seats,
                color: norm.color
            };
        })
        .sort((a, b) => b.seats - a.seats);

    const totalSeats = parties.reduce((sum, p) => sum + p.seats, 0);

    // Calculate sums
    let sumYes = 0;
    let sumAbst = 0;
    const selectedPartiesList = [];
    const abstPartiesList = [];

    parties.forEach(p => {
        const status = selectedParties[p.code];
        if (status === 'yes') {
            sumYes += p.seats;
            selectedPartiesList.push(p);
        } else if (status === 'abst') {
            sumAbst += p.seats;
            abstPartiesList.push(p);
        }
    });

    const hasMajority = sumYes >= majoritySeats;
    const selectedSeats = sumYes; // Alias for compatibility with visual render if needed, or update render.

    const updateSeats = (code, value) => {
        const num = parseInt(value) || 0;
        const currentValue = customSeats[code] || 0;
        const otherSeats = totalSeats - currentValue;

        // For Congreso, enforce total cannot exceed 350
        let newValue = Math.max(0, num);
        if (!isMunicipales) {
            newValue = Math.min(newValue, 350 - otherSeats);
        }
        newValue = Math.max(0, newValue); // Ensure non-negative

        setCustomSeats(prev => ({
            ...prev,
            [code]: newValue
        }));
    };

    const toggleParty = (partyId) => {
        setSelectedParties(prev => {
            const current = prev[partyId];
            const next = { ...prev };
            if (!current) next[partyId] = 'yes';
            else if (current === 'yes') next[partyId] = 'abst';
            else delete next[partyId];
            return next;
        });
    };

    const resetToOriginal = () => {
        if (electionData?.summary) {
            const initial = {};
            Object.entries(electionData.summary).forEach(([code, data]) => {
                const seatValue = isMunicipales ? (data.alcaldias || 0) : (data.seats || 0);
                if (seatValue > 0) {
                    const cand = electionData.candidacies?.[code];
                    const rawSiglas = cand ? cand.siglas : code;
                    const norm = normalizeParty(rawSiglas);
                    initial[norm.id] = (initial[norm.id] || 0) + seatValue;
                }
            });
            setCustomSeats(initial);
            setSelectedParties({});
        }
    };

    const loadScenario = (loadedSeats, loadedSelectedParties) => {
        setCustomSeats(loadedSeats);
        if (Array.isArray(loadedSelectedParties) || loadedSelectedParties instanceof Set) {
            const obj = {};
            loadedSelectedParties.forEach(c => obj[c] = 'yes');
            setSelectedParties(obj);
        } else {
            setSelectedParties({ ...loadedSelectedParties });
        }
    };

    const saveScenario = () => {
        const finalName = scenarioName || suggestedScenarioName;
        if (!finalName) return;

        // Build selectedSeats map (only selected parties with their seats)
        // Build selectedSeats map (only selected parties with their seats)
        const selectedSeatsMap = {};
        Object.keys(selectedParties).forEach(partyId => {
            // Save status if needed, or just presence. 
            // To match logic: if in object, it is selected (yes or abst).
            // But existing logic might expect just seats? 
            // We'll save the seats if present.
            if (customSeats[partyId] !== undefined) {
                selectedSeatsMap[partyId] = customSeats[partyId];
            }
        });

        const scenario = {
            id: Date.now(),
            name: scenarioName || suggestedScenarioName,
            seats: { ...customSeats },
            selectedParties: { ...selectedParties },
            selectedSeats: selectedSeatsMap, // For SavedPredictions visualization
            timestamp: new Date().toISOString()
        };
        setScenarios([...scenarios, scenario]);
        setScenarioName('');
    };

    const removeScenario = (id) => {
        setScenarios(scenarios.filter(s => s.id !== id));
    };

    // Get all parties from election for add dropdown
    const allElectionParties = Object.entries(electionData?.candidacies || {})
        .map(([code, data]) => {
            const norm = normalizeParty(data.siglas);
            return norm.id;
        })
        .filter((v, i, arr) => arr.indexOf(v) === i)
        .sort();

    const addParty = (partyId) => {
        if (!customSeats[partyId]) {
            setCustomSeats(prev => ({ ...prev, [partyId]: 0 }));
        }
    };

    const removeParty = (partyId) => {
        setCustomSeats(prev => {
            const newSeats = { ...prev };
            delete newSeats[partyId];
            return newSeats;
        });
        setSelectedParties(prev => {
            const next = { ...prev };
            delete next[partyId];
            return next;
        });
    };

    const showSidePanel = scenarios.length > 0;
    const layoutClass = showSidePanel ? "predictor-layout split-view" : "predictor-layout centered-view";
    const currentTypeElections = electionsByType[electionType] || [];


    // Computed suggested scenario name (derived, not a side effect)
    const suggestedScenarioName = selectedPartiesList.map(p => p.siglas).join(' + ') || '';

    // Simple Majority Calculation: YES > NO (Total - Yes - Abst)
    const seatsNo = totalSeats - sumYes - sumAbst;
    const hasSimpleMajority = sumYes > seatsNo;

    return (
        <div className={layoutClass}>
            <div className="predictor-main">
                <div className="predictor-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3>Predictor de Coaliciones</h3>
                    <button className="reset-btn" onClick={resetToOriginal} style={{
                        background: 'transparent',
                        border: '1px solid var(--surface-border)',
                        color: 'var(--text-muted)',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        cursor: 'pointer'
                    }}>Reiniciar</button>
                </div>

                {/* Election Selection - Single Line Compact */}
                <div className="predictor-election-selector" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    marginBottom: '1rem',
                    padding: '0.75rem',
                    background: 'var(--surface)',
                    borderRadius: '8px',
                    border: '1px solid var(--surface-border)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <label style={{ opacity: 0.7, fontSize: '0.75rem', whiteSpace: 'nowrap' }}>Tipo:</label>
                        <select
                            className="premium-select compact"
                            value={electionType}
                            onChange={(e) => handleTypeChange(e.target.value)}
                            style={{ minWidth: '100px' }}
                        >
                            <option value="congreso">Congreso</option>
                            <option value="municipales">Municipales</option>
                        </select>
                    </div>
                    <div style={{ height: '20px', width: '1px', background: 'var(--surface-border)' }}></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                        <label style={{ opacity: 0.7, fontSize: '0.75rem', whiteSpace: 'nowrap' }}>Elección Base:</label>
                        <select
                            className="premium-select compact"
                            value={selectedElectionId}
                            onChange={(e) => setSelectedElectionId(e.target.value)}
                            style={{ flex: 1 }}
                        >
                            {currentTypeElections.map(e => (
                                <option key={e.id} value={e.id}>{e.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <p className="predictor-description" style={{ marginBottom: '1rem', fontSize: '0.8rem' }}>
                    Modifica los {seatLabel.toLowerCase()} y selecciona partidos para ver la mayoría.
                    {isMunicipales && <span style={{ opacity: 0.7 }}> (Mayoría: {majoritySeats}+ municipios)</span>}
                </p>

                {/* Save Scenario Form */}
                <div className="save-scenario-form" style={{
                    marginBottom: '1rem',
                    display: 'flex',
                    gap: '0.5rem'
                }}>
                    <input
                        type="text"
                        placeholder="Nombre del escenario..."
                        value={scenarioName}
                        onChange={e => setScenarioName(e.target.value)}
                        className="premium-input"
                        style={{
                            flex: 1,
                            background: 'var(--bg)',
                            border: '1px solid var(--surface-border)',
                            color: 'white',
                            padding: '0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.85rem'
                        }}
                    />
                    <button onClick={saveScenario} disabled={!scenarioName && !suggestedScenarioName} className="save-btn" style={{
                        background: 'var(--primary)',
                        color: 'var(--bg)',
                        border: 'none',
                        padding: '0 1rem',
                        borderRadius: '4px',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        cursor: (scenarioName || suggestedScenarioName) ? 'pointer' : 'not-allowed',
                        opacity: (scenarioName || suggestedScenarioName) ? 1 : 0.5
                    }}>
                        Guardar
                    </button>
                </div>

                {/* Visual Coalition Bar (Yes/Abst/No) */}
                <div className="coalition-summary" style={{
                    marginBottom: '1.5rem',
                    padding: '1rem',
                    background: hasMajority ? 'rgba(0, 200, 100, 0.15)' : 'var(--surface)',
                    borderRadius: '8px',
                    border: hasMajority ? '1px solid rgba(0, 200, 100, 0.4)' : '1px solid var(--surface-border)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <div style={{ fontSize: '0.85rem' }}>
                            <strong>Coalición:</strong> {selectedPartiesList.map(p => p.siglas).join(' + ') || 'Ninguna'}
                            {abstPartiesList.length > 0 && <span style={{ opacity: 0.7 }}> (+ {abstPartiesList.length} Abs)</span>}
                        </div>
                        <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>
                            {sumYes} / {majoritySeats} ({sumAbst} Abs)
                        </div>
                    </div>

                    {/* BAR VISUALIZATION */}
                    <div className="coalition-bar-container" style={{ margin: '0.5rem 0 1rem 0' }}>
                        <div className="coalition-bar-multi">
                            {/* Yes (Selected) */}
                            {selectedPartiesList.map(p => (
                                <div key={p.code} className="bar-segment yes" style={{
                                    width: `${(p.seats / totalSeats) * 100}%`,
                                    backgroundColor: p.color
                                }} />
                            ))}
                            {/* Abst (Party color with stripes) */}
                            {abstPartiesList.map(p => (
                                <div key={p.code} className="bar-segment abst" style={{
                                    width: `${(p.seats / totalSeats) * 100}%`,
                                    background: `repeating-linear-gradient(
                                        -45deg,
                                        ${p.color},
                                        ${p.color} 6px,
                                        rgba(0,0,0,0.6) 6px,
                                        rgba(0,0,0,0.6) 12px
                                    )`
                                }} />
                            ))}
                            {/* No (Trans) */}
                            <div className="bar-segment no" style={{ flex: 1, backgroundColor: 'rgba(255, 255, 255, 0.1)' }}></div>

                            {/* Majority Marker */}
                            <div className="majority-marker" style={{ left: `${(majoritySeats / (isMunicipales ? 8131 : 350)) * 100}%` }}></div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        {hasMajority && (
                            <div style={{ color: '#00ff88', fontSize: '0.85rem', fontWeight: 600, textShadow: '0 0 10px rgba(0, 255, 136, 0.5)' }}>
                                ✓ Mayoría Absoluta
                            </div>
                        )}
                        {!hasMajority && hasSimpleMajority && (
                            <div style={{ color: '#00bfff', fontSize: '0.85rem', fontWeight: 600, textShadow: '0 0 10px rgba(0, 191, 255, 0.5)' }}>
                                ✓ Mayoría Simple
                            </div>
                        )}
                    </div>
                </div>

                {/* Party List with sliders */}
                <div className="party-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {parties.map(p => {
                        const status = selectedParties[p.code] || 'no';

                        // Dynamic styling
                        let rowStyle = {
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            padding: '0.75rem',
                            background: 'var(--surface)',
                            borderRadius: '8px',
                            border: '1px solid var(--surface-border)',
                            transition: 'all 0.2s',
                            cursor: 'pointer'
                        };

                        let textColor = 'white';

                        if (status === 'yes') {
                            rowStyle.background = p.color; // Party Color
                            rowStyle.border = `1px solid ${p.color}`;
                            textColor = 'white';
                            // Check for very light colors (like PNV yellow or CC) might need black text, 
                            // but usually white is safer for "dark mode" apps unless the color is bright yellow.
                            // For simplicity and matching "Boom" contrast, I'll keep white unless it's obviously yellow.
                            if (p.color === '#fbbf24' || p.color === '#FFD700' || p.color === '#FFEB3B') {
                                textColor = 'black';
                            }
                        } else if (status === 'abst') {
                            // Party color with diagonal black stripes
                            rowStyle.background = `repeating-linear-gradient(
                                -45deg,
                                ${p.color},
                                ${p.color} 8px,
                                rgba(0,0,0,0.7) 8px,
                                rgba(0,0,0,0.7) 16px
                            )`;
                            rowStyle.border = `1px solid ${p.color}`;
                            textColor = 'white';
                        }

                        return (
                            <div
                                key={p.code}
                                className={`party-slider-row ${status}`}
                                onClick={() => toggleParty(p.code)}
                                style={rowStyle}
                            >
                                <div className={`status-indicator type-${status}`} style={{
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '50%',
                                    background: status === 'no' ? 'rgba(255,255,255,0.1)' : (status === 'yes' ? 'white' : 'black'),
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.8rem',
                                    color: status === 'yes' ? p.color : (status === 'abst' ? '#fbbf24' : 'rgba(255,255,255,0.5)'),
                                    fontWeight: 'bold'
                                }}>
                                    {status === 'yes' && '✓'}
                                    {status === 'abst' && '-'}
                                </div>
                                <div style={{ width: '100px', display: 'flex', alignItems: 'center', gap: '0.5rem', color: textColor }}>
                                    <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: status === 'yes' ? 'white' : p.color }}></span>
                                    <span style={{ fontWeight: 600 }}>{p.siglas}</span>
                                </div>
                                <input
                                    type="range"
                                    min={0}
                                    max={maxSeats}
                                    value={p.seats}
                                    onChange={(e) => updateSeats(p.code, e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    style={{ flex: 1 }}
                                />
                                <input
                                    type="number"
                                    min={0}
                                    max={maxSeats}
                                    value={p.seats}
                                    onChange={(e) => updateSeats(p.code, e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                        width: '70px',
                                        textAlign: 'center',
                                        background: 'var(--bg)',
                                        border: '1px solid var(--surface-border)',
                                        color: 'white',
                                        padding: '0.4rem',
                                        borderRadius: '4px'
                                    }}
                                />
                                <button
                                    onClick={(e) => { e.stopPropagation(); removeParty(p.code); }}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--text-muted)',
                                        cursor: 'pointer',
                                        fontSize: '1.2rem'
                                    }}
                                    title="Eliminar partido"
                                >×</button>
                            </div>
                        )
                    }
                    )}

                    {/* Abstención Row with diagonal stripes */}
                    <div
                        className="party-slider-row abstencion-row"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            padding: '0.75rem',
                            background: 'var(--surface)',
                            borderRadius: '8px',
                            border: '1px dashed var(--surface-border)',
                            marginTop: '0.5rem'
                        }}>
                        <div style={{ width: '18px' }}></div>
                        <div style={{ width: '100px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{
                                width: '12px',
                                height: '12px',
                                borderRadius: '50%',
                                background: 'repeating-linear-gradient(45deg, #666, #666 2px, transparent 2px, transparent 4px)'
                            }}></span>
                            <span style={{ fontWeight: 500, opacity: 0.7 }}>Abstención</span>
                        </div>
                        <input
                            type="range"
                            min={0}
                            max={60}
                            value={abstencion}
                            onChange={(e) => setAbstencion(parseInt(e.target.value))}
                            style={{ flex: 1, cursor: 'pointer' }}
                        />
                        <input
                            type="number"
                            min={0}
                            max={60}
                            value={abstencion}
                            onChange={(e) => setAbstencion(Math.min(60, Math.max(0, parseInt(e.target.value) || 0)))}
                            style={{
                                width: '70px',
                                textAlign: 'center',
                                background: 'var(--bg)',
                                border: '1px solid var(--surface-border)',
                                color: 'white',
                                padding: '0.4rem',
                                borderRadius: '4px'
                            }}
                        />
                        <span style={{ opacity: 0.5, fontSize: '0.8rem' }}>%</span>
                    </div>
                </div>

                {/* Add Party */}
                <div className="predictor-add-more" style={{ marginTop: '1rem' }}>
                    <select
                        className="premium-select"
                        style={{ width: '100%', padding: '0.6rem' }}
                        onChange={(e) => {
                            if (e.target.value) {
                                addParty(e.target.value);
                                e.target.value = "";
                            }
                        }}
                    >
                        <option value="">+ Añadir partido...</option>
                        {allElectionParties.map(pId => {
                            if (customSeats[pId] !== undefined) return null;
                            const norm = normalizeParty(pId);
                            return <option key={pId} value={pId}>{norm.display}</option>;
                        })}
                    </select>
                </div>

                {/* Total Summary */}
                <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--surface)', borderRadius: '8px' }}>
                    <strong>Total {seatLabel}:</strong> {totalSeats}
                    {!isMunicipales && totalSeats !== 350 && (
                        <span style={{ color: 'orange', marginLeft: '1rem' }}>
                            ⚠ El total debería ser 350
                        </span>
                    )}
                </div>
            </div>

            {/* Right Panel: Saved Predictions (Only if scenarios exist) */}
            {showSidePanel && (
                <div className="predictor-side-panel">
                    <SavedPredictions
                        savedList={scenarios}
                        onLoad={loadScenario}
                        onDelete={removeScenario}
                    />
                </div>
            )}
        </div>
    );
};

export default Predictor;
