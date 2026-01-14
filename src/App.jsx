import React, { useState, useEffect, useMemo } from 'react';
import { Settings, Sun, Moon } from 'lucide-react';
import SpanishMap from './components/Map/SpanishMap';
import ElectionSummary from './components/Charts/ElectionSummary';
import CCAASeatGrid from './components/Charts/CCAASeatGrid';
import SeatBar from './components/Charts/SeatBar';
import TimeHistory from './components/Charts/TimeHistory';
import CoalitionBuilder from './components/CoalitionBuilder';
import Constructor from './components/Constructor';
import MultiMapView from './components/MultiMapView';
import ElectionControls from './components/Controls/ElectionControls';
import { provinces as provinceData } from './utils/regionData';
import { useLanguage, LanguageProvider } from './context/LanguageContext';
import LoadingScreen from './components/LoadingScreen';
import './index.css';

const App = () => {
    return (
        <LanguageProvider>
            <AppContent />
        </LanguageProvider>
    );
};

const AppContent = () => {
    const { t } = useLanguage();
    const [currentView, setCurrentView] = useState('dashboard');
    const [elections, setElections] = useState([]);
    const [selectedElection, setSelectedElection] = useState('');
    const [electionData, setElectionData] = useState(null);
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
    const [isLoading, setIsLoading] = useState(true);

    // Filter State
    const [filterState, setFilterState] = useState({ ccaa: '', prov: '', mun: '' });

    useEffect(() => {
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

    // Ensure minimum loading time
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 1500); // 1.5s for a smooth transition
        return () => clearTimeout(timer);
    }, []);

    // Fetch list of elections
    useEffect(() => {
        fetch('/api/elections')
            .then(res => res.json())
            .then(data => {
                const sorted = data.sort((a, b) => b.year - a.year || b.month - a.month);
                setElections(sorted);
                if (sorted.length > 0) setSelectedElection(sorted[0].id);
            });
    }, []);

    // Fetch election details
    useEffect(() => {
        if (!selectedElection) return;
        fetch(`/api/results/${selectedElection}`)
            .then(res => res.json())
            .then(data => {
                setElectionData(data);
                setFilterState({ ccaa: '', prov: '', mun: '' });
            });
    }, [selectedElection]);

    // Derived Data with Filtering Logic
    const filteredResults = useMemo(() => {
        if (!electionData) return null;
        const { ccaa, prov, mun } = filterState;
        const isMunicipales = electionData.metadata?.isMunicipales;

        // 1. Municipality Level
        if (mun && electionData.municipalities) {
            const mData = electionData.municipalities[mun];
            if (!mData) return null; // Or empty

            const totalVotes = Object.values(mData.votes).reduce((a, b) => a + b, 0);
            return {
                votes: mData.votes,
                seats: {},
                total: totalVotes,
                metadata: { name: mData.name },
                isMunicipales
            };
        }

        // 2. Province Level
        if (prov && electionData.provinces) {
            const pData = electionData.provinces[prov];
            if (!pData) return null;

            // Calculate total if missing (usually passed but safe to ensure)
            const totalVotes = Object.values(pData.votes).reduce((a, b) => a + b, 0);
            return {
                votes: pData.votes,
                seats: pData.seats,
                total: totalVotes,
                metadata: { name: provinceData[prov]?.name || prov },
                isMunicipales
            };
        }

        // 3. CCAA Level (Aggregation)
        if (ccaa && electionData.provinces) {
            const agg = { votes: {}, seats: {}, total: 0, isMunicipales };
            let found = false;

            Object.entries(electionData.provinces).forEach(([pCode, pData]) => {
                if (provinceData[pCode]?.ca === ccaa) {
                    found = true;
                    Object.entries(pData.votes).forEach(([party, count]) => {
                        agg.votes[party] = (agg.votes[party] || 0) + count;
                        agg.total += count;
                    });
                    Object.entries(pData.seats).forEach(([party, count]) => {
                        agg.seats[party] = (agg.seats[party] || 0) + count;
                    });
                }
            });

            if (found) {
                return agg;
            }
        }

        // 4. National (Default)
        // Transform Party Dictionary to Standard { votes, seats, total } format
        if (electionData.summary) {
            const agg = { votes: {}, seats: {}, total: 0, isMunicipales };
            Object.entries(electionData.summary).forEach(([code, data]) => {
                agg.votes[code] = data.votes;
                agg.seats[code] = isMunicipales ? (data.alcaldias || 0) : (data.seats || 0);
                agg.total += data.votes;
            });
            return agg;
        }

        return null;

    }, [filterState, electionData]);

    // National results for CoalitionBuilder (always use national data)
    const nationalResults = useMemo(() => {
        if (!electionData?.summary) return null;
        const isMunicipales = electionData.metadata?.isMunicipales;
        const agg = { votes: {}, seats: {}, alcaldias: {}, total: 0, isMunicipales };
        Object.entries(electionData.summary).forEach(([code, data]) => {
            agg.votes[code] = data.votes;
            agg.seats[code] = isMunicipales ? (data.alcaldias || 0) : (data.seats || 0);
            if (isMunicipales) agg.alcaldias[code] = data.alcaldias || 0;
            agg.total += data.votes;
        });
        return agg;
    }, [electionData]);

    // Handle map region click to update filters
    const handleRegionClick = ({ level, code }) => {
        if (level === 'communities') {
            setFilterState({ ccaa: code, prov: '', mun: '' });
        } else if (level === 'provinces') {
            // Get the CCAA for this province from regionData
            const provInfo = provinceData[code];
            setFilterState({
                ccaa: provInfo?.ca || '',
                prov: code,
                mun: ''
            });
        } else if (level === 'municipalities') {
            // For municipality, we need to find its province
            const munData = electionData?.municipalities?.[code];
            if (munData) {
                const provCode = String(munData.prov).padStart(2, '0');
                const provInfo = provinceData[provCode];
                setFilterState({
                    ccaa: provInfo?.ca || '',
                    prov: provCode,
                    mun: code
                });
            }
        }
    };

    // Group elections by type for the map selectors
    const electionsByType = useMemo(() => {
        const congreso = elections.filter(e => e.type === 'congreso')
            .sort((a, b) => b.year - a.year || b.month - a.month);
        const municipales = elections.filter(e => e.type === 'municipales')
            .sort((a, b) => b.year - a.year || b.month - a.month);
        return { congreso, municipales };
    }, [elections]);

    const currentElectionType = useMemo(() => {
        const current = elections.find(e => e.id === selectedElection);
        return current?.type || 'congreso';
    }, [elections, selectedElection]);

    const handleTypeChange = (newType) => {
        const electionsOfType = electionsByType[newType];
        if (electionsOfType && electionsOfType.length > 0) {
            setSelectedElection(electionsOfType[0].id);
        }
    };

    const getShortElectionName = (election) => {
        if (!election) return '';
        return election.name.replace(/^(Congreso|Municipales)\s*/i, '');
    };

    const renderContent = () => {
        if (!electionData) return <div className="loading-state">Cargando datos...</div>;

        // Election selectors for the map
        const currentTypeElections = electionsByType[currentElectionType] || [];
        const electionSelectors = (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
                <select
                    value={currentElectionType}
                    onChange={(e) => handleTypeChange(e.target.value)}
                    className="premium-select"
                    style={{
                        background: 'rgba(0,0,0,0.6)',
                        backdropFilter: 'blur(8px)',
                        border: '1px solid var(--surface-border)',
                        width: 'auto'
                    }}
                >
                    <option value="congreso">Congreso</option>
                    <option value="municipales">Municipales</option>
                </select>
                <select
                    value={selectedElection}
                    onChange={(e) => setSelectedElection(e.target.value)}
                    className="premium-select"
                    style={{
                        background: 'rgba(0,0,0,0.6)',
                        backdropFilter: 'blur(8px)',
                        border: '1px solid var(--surface-border)',
                        minWidth: '90px',
                        width: 'auto'
                    }}
                >
                    {currentTypeElections.map(e => (
                        <option key={e.id} value={e.id}>{getShortElectionName(e)}</option>
                    ))}
                </select>
            </div>
        );

        return (
            <div className="dashboard-split">
                <div className="left-section" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto' }}>
                    {/* Map - borderless/seamless */}
                    <div className="map-container" style={{ position: 'relative', minHeight: '400px' }}>
                        <SpanishMap
                            electionId={selectedElection}
                            onRegionClick={handleRegionClick}
                            selectedRegion={filterState}
                            electionSelectors={electionSelectors}
                        />
                    </div>
                    {/* CCAA Grid - separate scrollable section */}
                    <CCAASeatGrid electionData={electionData} />
                </div>
                <aside className="right-panel">
                    <ElectionControls
                        elections={elections}
                        selectedElectionId={selectedElection}
                        onElectionChange={setSelectedElection}
                        filterState={filterState}
                        onFilterChange={setFilterState}
                        electionData={electionData}
                    />

                    {filteredResults && (
                        <>
                            <ElectionSummary
                                results={filteredResults}
                                candidacies={electionData.candidacies}
                                elections={elections}
                                selectedElectionId={selectedElection}
                                electionData={electionData}
                                filterState={filterState}
                            />

                            {/* Constructor - only for Congreso elections */}
                            {selectedElection?.startsWith('congreso') && (
                                <div className="coalition-container">
                                    <CoalitionBuilder
                                        results={nationalResults}
                                        candidacies={electionData.candidacies}
                                    />
                                </div>
                            )}
                        </>
                    )}
                </aside>
            </div>
        );
    };

    const renderView = () => {
        switch (currentView) {
            case 'trends': return <TimeHistory elections={elections} />;
            case 'constructor': return <Constructor />;
            case 'comparison': return <MultiMapView elections={elections} />;
            default: return renderContent();
        }
    }

    if (isLoading) {
        return <LoadingScreen />;
    }

    return (
        <div className="app-container premium-theme">
            <header className="premium-header">
                <div className="header-logo-container">
                    <img src="/logo_horiz.png" alt="ELECTOSTΔTICA" className="header-logo" />
                    <div className="copyright-mobile">
                        © Electostatica · <a href="https://github.com/cayetanomarmur" target="_blank" rel="noopener noreferrer">Author</a>
                    </div>
                </div>
                <div className="copyright-desktop">
                    <div>© Electostatica</div>
                    <div>Author: <a href="https://github.com/cayetanomarmur" target="_blank" rel="noopener noreferrer">Cayetano Martínez Muriel</a></div>
                </div>
                <div className="header-controls">
                    <nav className="nav-menu">
                        {/* Mobile dropdown */}
                        <select
                            className="nav-mobile-select premium-select"
                            value={currentView}
                            onChange={(e) => setCurrentView(e.target.value)}
                        >
                            <option value="dashboard">Dashboard</option>
                            <option value="trends">Tendencias</option>
                            <option value="comparison">Multimapa</option>
                            <option value="constructor">Constructor</option>
                        </select>
                        {/* Desktop buttons */}
                        <button
                            className={`nav-btn nav-desktop ${currentView === 'dashboard' ? 'active' : ''}`}
                            onClick={() => setCurrentView('dashboard')}
                        >
                            Dashboard
                        </button>
                        <button
                            className={`nav-btn nav-desktop ${currentView === 'trends' ? 'active' : ''}`}
                            onClick={() => setCurrentView('trends')}
                        >
                            Tendencias
                        </button>
                        <button
                            className={`nav-btn nav-desktop ${currentView === 'comparison' ? 'active' : ''}`}
                            onClick={() => setCurrentView('comparison')}
                        >
                            Multimapa
                        </button>
                        <button
                            className={`nav-btn nav-desktop ${currentView === 'constructor' ? 'active' : ''}`}
                            onClick={() => setCurrentView('constructor')}
                        >
                            Constructor
                        </button>
                    </nav>
                </div>
            </header>
            <main className="main-content">
                {currentView === 'dashboard' && renderContent()}
                {currentView === 'trends' && <TimeHistory elections={elections} />}
                {currentView === 'constructor' && <Constructor />}
                {currentView === 'comparison' && <MultiMapView elections={elections} />}
            </main>
        </div>
    );
};

export default App;
