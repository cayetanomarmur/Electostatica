import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { normalizeParty, PARTY_CONFIG } from '../../utils/partyUtils';

const TrendChart = ({ data, type, yearRange, onYearRangeChange, selectedParties, onPartyToggle, availableParties, onRemove, showRemove, onTypeChange, width = 800, height = 300 }) => {
    const svgRef = useRef();
    const [seatFilter, setSeatFilter] = useState('congreso'); // 'congreso' or 'municipales'

    // Separate Priority and Other parties
    const { priorityList, otherList } = useMemo(() => {
        const parties = availableParties || [];
        const priority = PARTY_CONFIG.priority.filter(p => parties.includes(p));
        const others = parties.filter(p => !priority.includes(p));
        return { priorityList: priority, otherList: others };
    }, [availableParties]);

    // Filter data for this chart's selected parties, type, AND year range
    const chartData = useMemo(() => {
        if (!data || !selectedParties) return [];

        const fromYear = yearRange?.from || 1977;
        const toYear = yearRange?.to || 2024;

        let filtered = data.filter(d =>
            selectedParties.has(d.party) &&
            d.displayYear >= fromYear &&
            d.displayYear <= toYear
        );

        // Apply Seat Filter (only for seats mode)
        if (type === 'seats') {
            filtered = filtered.filter(d => d.electionType === seatFilter);
        }

        return filtered;
    }, [data, selectedParties, type, seatFilter, yearRange]);

    useEffect(() => {
        if (!svgRef.current) return;

        const margin = { top: 40, right: 100, bottom: 40, left: 60 };
        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        if (!chartData || chartData.length === 0) {
            svg.append('text')
                .attr('x', width / 2)
                .attr('y', height / 2)
                .attr('text-anchor', 'middle')
                .attr('fill', 'var(--text-muted)')
                .text('No hay datos para esta selección');
            return;
        }

        const x = d3.scaleLinear()
            .domain([yearRange?.from || 1977, yearRange?.to || 2024])
            .range([margin.left, width - margin.right]);

        const getValue = (d) => {
            if (type === 'votes') return d.votes;
            if (type === 'seats') return d.seats;
            if (type === 'percentage') return d.pct;
            return 0;
        };

        const maxY = d3.max(chartData, getValue) || 10;
        const yDomain = type === 'percentage' ? [0, Math.min(100, maxY * 1.2)] : [0, maxY * 1.1];

        const y = d3.scaleLinear()
            .domain(yDomain)
            .range([height - margin.bottom, margin.top]);

        const g = svg.append('g');

        // Grid
        g.append('g').attr('class', 'grid').attr('transform', `translate(0,${height - margin.bottom})`)
            .call(d3.axisBottom(x).ticks(5).tickSize(-(height - margin.top - margin.bottom)).tickFormat('')).attr('opacity', 0.08);

        g.append('g').attr('class', 'grid').attr('transform', `translate(${margin.left},0)`)
            .call(d3.axisLeft(y).ticks(5).tickSize(-(width - margin.left - margin.right)).tickFormat('')).attr('opacity', 0.08);

        // Axes
        g.append('g').attr('transform', `translate(0,${height - margin.bottom})`)
            .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format('d'))).attr('font-size', '10px').attr('color', 'var(--text-muted)');

        g.append('g').attr('transform', `translate(${margin.left},0)`)
            .call(d3.axisLeft(y).ticks(5).tickFormat(type === 'percentage' ? d => d + '%' : d3.format('~s')))
            .attr('font-size', '10px').attr('color', 'var(--text-muted)');

        const lineGenerator = d3.line()
            .x(d => x(d.year))
            .y(d => y(getValue(d)))
            .curve(d3.curveMonotoneX);

        const partiesGrouped = d3.group(chartData, d => d.party);

        let tooltip = d3.select('body').select('.chart-tooltip');
        if (tooltip.empty()) {
            tooltip = d3.select('body').append('div').attr('class', 'chart-tooltip map-tooltip').style('opacity', 0);
        }

        partiesGrouped.forEach((values, party) => {
            if (values.length < 1) return;
            const sortedValues = values.sort((a, b) => a.year - b.year);
            const norm = normalizeParty(party);
            const color = norm.color;

            g.append('path')
                .datum(sortedValues)
                .attr('fill', 'none')
                .attr('stroke', color)
                .attr('stroke-width', 2.5)
                .attr('stroke-linecap', 'round')
                .attr('d', lineGenerator)
                .style('filter', `drop-shadow(0 0 2px ${color}44)`);

            g.selectAll(`.dot-${party}-${type}`)
                .data(sortedValues)
                .enter().append('circle')
                .attr('cx', d => x(d.year))
                .attr('cy', d => y(getValue(d)))
                .attr('r', 4)
                .attr('fill', 'var(--bg)')
                .attr('stroke', color)
                .attr('stroke-width', 2)
                .style('cursor', 'pointer')
                .on('mouseover', (event, d) => {
                    d3.select(event.currentTarget).attr('r', 6).attr('fill', color);
                    const yearInt = Math.floor(d.year);
                    const monthRaw = Math.round((d.year - yearInt) * 12) + 1;
                    const monthDisp = d.month ? d.month.toString().padStart(2, '0') : monthRaw.toString().padStart(2, '0');
                    const dateStr = `${monthDisp}/${yearInt}`;
                    const valStr = type === 'percentage' ? d.pct.toFixed(2) + '%' : getValue(d).toLocaleString();
                    const html = `
                        <div class="tooltip-glass">
                            <div class="tooltip-title">${dateStr} (${d.electionType === 'municipales' ? 'Municipales' : 'Generales'})</div>
                            <div class="tooltip-row">
                                <span style="display:flex;align-items:center;gap:6px;">
                                    <span style="width:8px;height:8px;border-radius:50%;background-color:${color}"></span>
                                    <b>${party}</b>
                                </span>
                            </div>
                            <div class="tooltip-row">
                                <span>${type === 'votes' ? 'Votos' : type === 'seats' ? 'Escaños' : 'Voto'}:</span>
                                <b>${valStr}</b>
                            </div>
                        </div>`;
                    tooltip.transition().duration(50).style('opacity', 1);
                    tooltip.html(html).style('left', (event.clientX + 10) + 'px').style('top', (event.clientY - 10) + 'px');
                })
                .on('mouseout', (event) => {
                    d3.select(event.currentTarget).attr('r', 4).attr('fill', 'var(--bg)');
                    tooltip.transition().duration(200).style('opacity', 0);
                });

            const finalPos = sortedValues[sortedValues.length - 1];
            g.append('text')
                .attr('x', x(finalPos.year) + 8)
                .attr('y', y(getValue(finalPos)))
                .attr('dy', '0.35em')
                .attr('fill', color)
                .attr('font-weight', '600')
                .attr('font-size', '10px')
                .text(party);
        });

    }, [chartData, type, yearRange, width, height]);

    return (
        <div style={{ position: 'relative', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--surface-border)', padding: '10px' }}>
            {/* Chart Header with Type Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '4px' }}>
                    {['votes', 'seats', 'percentage'].map(t => (
                        <button
                            key={t}
                            onClick={() => onTypeChange(t)}
                            style={{
                                padding: '4px 10px',
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                border: type === t ? '1px solid var(--primary)' : '1px solid var(--surface-border)',
                                background: type === t ? 'rgba(44, 80, 171, 0.1)' : 'transparent',
                                color: type === t ? 'var(--primary)' : 'var(--text-muted)',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            {t === 'votes' ? 'Votos' : t === 'seats' ? 'Escaños' : '%'}
                        </button>
                    ))}
                </div>

                {/* Seat Type Filter (only visible for seats) */}
                {type === 'seats' && (
                    <div style={{ display: 'flex', gap: '4px', marginLeft: '8px', paddingLeft: '8px', borderLeft: '1px solid var(--surface-border)' }}>
                        <button
                            onClick={() => setSeatFilter('congreso')}
                            style={{
                                padding: '2px 8px',
                                fontSize: '0.65rem',
                                borderRadius: '4px',
                                border: 'none',
                                background: seatFilter === 'congreso' ? 'var(--surface-border)' : 'transparent',
                                color: seatFilter === 'congreso' ? 'var(--text)' : 'var(--text-muted)',
                                cursor: 'pointer'
                            }}
                        >
                            Congreso
                        </button>
                        <button
                            onClick={() => setSeatFilter('municipales')}
                            style={{
                                padding: '2px 8px',
                                fontSize: '0.65rem',
                                borderRadius: '4px',
                                border: 'none',
                                background: seatFilter === 'municipales' ? 'var(--surface-border)' : 'transparent',
                                color: seatFilter === 'municipales' ? 'var(--text)' : 'var(--text-muted)',
                                cursor: 'pointer'
                            }}
                        >
                            Municipales
                        </button>
                    </div>
                )}

                {/* Year Range Controls - Per Chart */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '8px', paddingLeft: '8px', borderLeft: '1px solid var(--surface-border)', fontSize: '0.7rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Desde:</span>
                    <select
                        value={yearRange?.from || 1977}
                        onChange={e => onYearRangeChange?.({ ...yearRange, from: parseInt(e.target.value) })}
                        className="premium-select"
                        style={{ padding: '2px 6px', fontSize: '0.65rem' }}
                    >
                        {Array.from({ length: 50 }, (_, i) => 1977 + i).map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                    <span style={{ color: 'var(--text-muted)' }}>Hasta:</span>
                    <select
                        value={yearRange?.to || 2024}
                        onChange={e => onYearRangeChange?.({ ...yearRange, to: parseInt(e.target.value) })}
                        className="premium-select"
                        style={{ padding: '2px 6px', fontSize: '0.65rem' }}
                    >
                        {Array.from({ length: 50 }, (_, i) => 1977 + i).map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>

                {showRemove && (
                    <button
                        onClick={onRemove}
                        style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}
                        title="Eliminar gráfico"
                    >×</button>
                )}
            </div>

            {/* Party Selection Checkboxes/Buttons */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px', alignItems: 'center' }}>
                {priorityList.map(party => {
                    const isSelected = selectedParties.has(party);
                    const color = normalizeParty(party).color;
                    return (
                        <button
                            key={party}
                            onClick={() => onPartyToggle(party)}
                            style={{
                                padding: '3px 10px',
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                border: `1px solid ${isSelected ? color : 'var(--surface-border)'}`,
                                background: isSelected ? color : 'transparent',
                                color: isSelected ? 'white' : 'var(--text-muted)',
                                borderRadius: '100px',
                                cursor: 'pointer',
                                opacity: isSelected ? 1 : 0.6,
                                transition: 'all 0.2s'
                            }}
                        >
                            {party}
                        </button>
                    );
                })}

                {/* Dropdown for other/extra selected parties */}
                {otherList.length > 0 && (
                    <div className="premium-select-container" style={{ marginLeft: '4px' }}>
                        <select
                            className="premium-select"
                            style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', borderRadius: '100px', maxWidth: '120px' }}
                            onChange={(e) => {
                                if (e.target.value) {
                                    onPartyToggle(e.target.value);
                                    e.target.value = "";
                                }
                            }}
                        >
                            <option value="">+ Añadir...</option>
                            {otherList.map(p => (
                                <option key={p} value={p} disabled={selectedParties.has(p)}>
                                    {p} {selectedParties.has(p) ? '✓' : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Show any currently selected parties that are NOT in priority list */}
                {Array.from(selectedParties).filter(p => !priorityList.includes(p)).map(party => {
                    const color = normalizeParty(party).color;
                    return (
                        <button
                            key={party}
                            onClick={() => onPartyToggle(party)}
                            style={{
                                padding: '3px 10px',
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                border: `1px solid ${color}`,
                                background: color,
                                color: 'white',
                                borderRadius: '100px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                        >
                            {party} <span style={{ fontSize: '0.8em', opacity: 0.8 }}>×</span>
                        </button>
                    )
                })}
            </div>

            <svg ref={svgRef} width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" style={{ overflow: 'visible' }}></svg>
        </div>
    );
};

const TimeHistory = () => {
    const [historyData, setHistoryData] = useState([]);

    // Default Selected Parties per user request
    const defaultSelected = new Set(['PP', 'PSOE', 'VOX', 'PODEMOS', 'SUMAR', 'IU', 'AP', 'UCD', 'CS']);

    const [charts, setCharts] = useState([
        { id: 1, type: 'seats', selectedParties: new Set(defaultSelected), yearRange: { from: 1977, to: 2024 } }
    ]);

    // Chart dimensions for zoom and aspect ratio control
    const [chartWidth, setChartWidth] = useState(800);
    const [chartHeight, setChartHeight] = useState(300);

    useEffect(() => {
        fetch('/api/history')
            .then(res => res.json())
            .then(data => {
                const agg = {};
                const totals = {};

                data.forEach(d => {
                    const year = d.year;
                    const norm = normalizeParty(d.party, { year });

                    // Skip AP data between 1989 and 2023 (gap period)
                    if (norm.id === 'AP' && year > 1989 && year < 2023) {
                        return; // Skip this data point
                    }
                    // Also skip AP-OTHER (post-1989 AP that shouldn't be shown)
                    if (norm.id === 'AP-OTHER') {
                        return;
                    }

                    const month = d.month || 6;
                    const timeVal = year + ((month - 1) / 12);
                    const type = d.electionType || 'congreso';

                    totals[timeVal] = (totals[timeVal] || 0) + d.votes;

                    // Aggregate by TIME + PARTY + TYPE to keep distinct
                    const key = `${timeVal}-${norm.id}-${type}`;
                    if (!agg[key]) {
                        agg[key] = {
                            year: timeVal,
                            displayYear: year,
                            month: month,
                            party: norm.id,
                            electionType: type,
                            votes: 0,
                            seats: 0
                        };
                    }
                    agg[key].votes += d.votes;
                    agg[key].seats += (d.seats || 0);
                });

                const cleanData = Object.values(agg).map(item => ({
                    ...item,
                    pct: (item.votes / totals[item.year]) * 100
                }));

                setHistoryData(cleanData);

                const years = cleanData.map(d => d.displayYear);
                // Note: Year ranges are now set per-chart, not globally
            });
    }, []);

    const availableParties = useMemo(() => {
        if (!historyData.length) return [];
        const partyTotals = {};
        historyData.forEach(d => { partyTotals[d.party] = (partyTotals[d.party] || 0) + d.votes; });
        return Object.entries(partyTotals)
            .filter(([_, votes]) => votes > 10000) // Lowered threshold slightly to capture UCD/AP/CDS etc historically if needed
            .sort((a, b) => b[1] - a[1])
            .map(([p]) => p);
    }, [historyData]);

    const availableYears = useMemo(() => {
        const years = new Set(historyData.map(d => d.displayYear));
        return Array.from(years).sort((a, b) => a - b);
    }, [historyData]);


    // Note: Year filtering is now done per-chart inside TrendChart based on chart.yearRange

    const togglePartyInChart = (chartId, party) => {
        setCharts(prev => prev.map(c => {
            if (c.id !== chartId) return c;
            const next = new Set(c.selectedParties);
            if (next.has(party)) next.delete(party);
            else next.add(party);
            return { ...c, selectedParties: next };
        }));
    };

    const changeChartType = (chartId, newType) => {
        setCharts(prev => prev.map(c => c.id === chartId ? { ...c, type: newType } : c));
    };

    const changeChartYearRange = (chartId, newRange) => {
        setCharts(prev => prev.map(c => c.id === chartId ? { ...c, yearRange: newRange } : c));
    };

    const addChart = () => {
        if (charts.length >= 3) return;
        setCharts(prev => [...prev, {
            id: Date.now(),
            type: 'seats',
            selectedParties: new Set(['PP', 'PSOE', 'VOX', 'SUMAR']),
            yearRange: { from: 1977, to: 2024 }
        }]);
    };

    const removeChart = (id) => {
        setCharts(prev => prev.filter(c => c.id !== id));
    };

    return (
        <div className="history-view" style={{ width: '100%', height: '100%', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>

            {/* Controls Row - Chart dimensions & Add button */}
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Ancho:</label>
                    <input
                        type="range"
                        min="500"
                        max="1400"
                        value={chartWidth}
                        onChange={e => setChartWidth(parseInt(e.target.value))}
                        style={{ width: '80px' }}
                    />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Alto:</label>
                    <input
                        type="range"
                        min="200"
                        max="500"
                        value={chartHeight}
                        onChange={e => setChartHeight(parseInt(e.target.value))}
                        style={{ width: '80px' }}
                    />
                </div>

                <button onClick={addChart} disabled={charts.length >= 3} className="btn-primary" style={{ marginLeft: 'auto', opacity: charts.length >= 3 ? 0.5 : 1 }}>
                    + Añadir Gráfico
                </button>
            </div>

            {/* Charts */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {charts.length === 0 && <div className="loading">Añade un gráfico para comenzar...</div>}

                {charts.map(chart => (
                    <TrendChart
                        key={chart.id}
                        type={chart.type}
                        data={historyData}
                        selectedParties={chart.selectedParties}
                        availableParties={availableParties}
                        onPartyToggle={(party) => togglePartyInChart(chart.id, party)}
                        onTypeChange={(newType) => changeChartType(chart.id, newType)}
                        yearRange={chart.yearRange}
                        onYearRangeChange={(newRange) => changeChartYearRange(chart.id, newRange)}
                        onRemove={() => removeChart(chart.id)}
                        showRemove={charts.length > 0}
                        width={chartWidth}
                        height={chartHeight}
                    />
                ))}
            </div>
        </div>
    );
};

export default TimeHistory;
