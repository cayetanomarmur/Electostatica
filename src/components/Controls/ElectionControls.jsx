import React, { useMemo } from 'react';
import { communities, provinces } from '../../utils/regionData';

const ElectionControls = ({
    elections,
    selectedElectionId,
    onElectionChange,
    filterState,
    onFilterChange,
    electionData
}) => {
    const { ccaa, prov, mun } = filterState;

    // Derive election type from current selection
    const currentElectionType = useMemo(() => {
        const current = elections.find(e => e.id === selectedElectionId);
        return current?.type || 'congreso';
    }, [elections, selectedElectionId]);

    // Group elections by type
    const electionsByType = useMemo(() => {
        const congreso = elections.filter(e => e.type === 'congreso')
            .sort((a, b) => b.year - a.year || b.month - a.month);
        const municipales = elections.filter(e => e.type === 'municipales')
            .sort((a, b) => b.year - a.year || b.month - a.month);
        return { congreso, municipales };
    }, [elections]);

    // Handle election type change - select first election of that type
    const handleTypeChange = (e) => {
        const newType = e.target.value;
        const electionsOfType = electionsByType[newType];
        if (electionsOfType && electionsOfType.length > 0) {
            onElectionChange(electionsOfType[0].id);
        }
    };

    // Filter Provinces based on CCAA
    const availableProvinces = useMemo(() => {
        if (!ccaa) return Object.entries(provinces).sort((a, b) => a[1].name.localeCompare(b[1].name));
        return Object.entries(provinces)
            .filter(([_, data]) => data.ca === ccaa)
            .sort((a, b) => a[1].name.localeCompare(b[1].name));
    }, [ccaa]);

    // Filter Municipalities based on Province
    const availableMunicipalities = useMemo(() => {
        if (!prov || !electionData?.municipalities) return [];
        return Object.entries(electionData.municipalities)
            .filter(([_, m]) => String(m.prov).padStart(2, '0') === prov)
            .map(([id, m]) => ({ id, ...m }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [prov, electionData]);

    const handleCCAAChange = (e) => {
        const newCCAA = e.target.value;
        onFilterChange({ ccaa: newCCAA, prov: '', mun: '' });
    };

    const handleProvChange = (e) => {
        const newProv = e.target.value;
        let newCCAA = ccaa;
        if (newProv && !newCCAA) {
            newCCAA = provinces[newProv]?.ca || '';
        }
        onFilterChange({ ccaa: newCCAA, prov: newProv, mun: '' });
    };

    const handleMunChange = (e) => {
        onFilterChange({ ...filterState, mun: e.target.value });
    };

    // Get current elections for the selected type
    const currentTypeElections = electionsByType[currentElectionType] || [];

    // Get short name (remove "Congreso" or "Municipales" prefix)
    const getShortName = (election) => {
        if (!election) return '';
        // Remove type prefix from name (e.g., "Congreso Julio 2023" -> "Julio 2023")
        return election.name.replace(/^(Congreso|Municipales)\s*/i, '');
    };

    return (
        <div className="election-controls" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div className="filters-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'end' }}>
                {/* CCAA Selector */}
                <div className="control-item" style={{ flex: 1, minWidth: '150px' }}>
                    <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.75rem', opacity: 0.7 }}>Comunidad</label>
                    <select
                        className="premium-select"
                        value={ccaa}
                        onChange={handleCCAAChange}
                        style={{ width: '100%' }}
                    >
                        <option value="">Nacional</option>
                        {Object.entries(communities)
                            .sort((a, b) => a[1].localeCompare(b[1]))
                            .map(([code, name]) => (
                                <option key={code} value={code}>{name}</option>
                            ))}
                    </select>
                </div>

                {/* Province Selector */}
                <div className="control-item" style={{ flex: 1, minWidth: '150px' }}>
                    <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.75rem', opacity: 0.7 }}>Provincia</label>
                    <select
                        className="premium-select"
                        value={prov}
                        onChange={handleProvChange}
                        disabled={!availableProvinces.length && !ccaa}
                        style={{ width: '100%' }}
                    >
                        <option value="">Todas</option>
                        {availableProvinces.map(([code, data]) => (
                            <option key={code} value={code}>{data.name}</option>
                        ))}
                    </select>
                </div>

                {/* Municipality Selector */}
                <div className="control-item" style={{ flex: 1, minWidth: '150px' }}>
                    <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.75rem', opacity: 0.7 }}>Municipio</label>
                    <select
                        className="premium-select"
                        value={mun}
                        onChange={handleMunChange}
                        disabled={!availableMunicipalities.length}
                        style={{ width: '100%' }}
                    >
                        <option value="">Todos</option>
                        {availableMunicipalities.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                    </select>
                </div>
            </div>


        </div>
    );
};

export default ElectionControls;
