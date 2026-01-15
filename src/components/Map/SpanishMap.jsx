import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { useLanguage } from '../../context/LanguageContext';
import { normalizeParty, deduplicateResults } from '../../utils/partyUtils';

// Cache for geo data to avoid re-fetching (especially the 72MB municipalities.geojson)
const geoCache = {};

const SpanishMap = ({ electionId, onRegionClick, selectedRegion, electionSelectors, showLanguageControl = false, extraControls, dragHandle }) => {
    const svgRef = useRef();
    const zoomRef = useRef(null);
    const [geoData, setGeoData] = useState(null);
    const [electionResults, setElectionResults] = useState(null);
    const [level, setLevel] = useState('communities');
    const [showSeatCircles, setShowSeatCircles] = useState(false); // Optional seat circles overlay
    const { t, lang, setLang } = useLanguage();

    useEffect(() => {
        // Use .json (TopoJSON) for all levels
        // TopoJSON is much smaller and faster to render
        const geoUrl = `/data/geo/${level}.json`;

        // Check cache first
        const cachedGeo = geoCache[level];

        const geoPromise = cachedGeo
            ? Promise.resolve(cachedGeo)
            : fetch(geoUrl).then(res => {
                if (!res.ok) return { features: [] }; // Handle 404 gracefully
                return res.json().catch(() => ({ features: [] })); // Handle JSON parse error
            }).then(geo => {
                // Handle TopoJSON format (detected by type: "Topology")
                if (geo.type === 'Topology' && geo.objects) {
                    const objectKey = level === 'municipalities' ? 'municipalities' :
                        level === 'provinces' ? 'provinces' :
                            level === 'communities' ? 'autonomous_regions' :
                                Object.keys(geo.objects)[0];
                    if (geo.objects[objectKey]) {
                        geo = topojson.feature(geo, geo.objects[objectKey]);

                        // SANITIZE: Filter out broken geometries (e.g. huge polygons due to data glitches)
                        // A valid municipality should not span more than ~1-2 degrees.
                        if (level === 'municipalities') {
                            const initialCount = geo.features.length;
                            geo.features = geo.features.filter(f => {
                                if (!f.geometry) return false;
                                const bounds = d3.geoBounds(f);
                                const width = bounds[1][0] - bounds[0][0];
                                const height = bounds[1][1] - bounds[0][1];
                                // Threshold: 2 degrees (plenty for any munir, excludes full-earth wraps)
                                return width < 2 && height < 2;
                            });
                            const removed = initialCount - geo.features.length;
                            if (removed > 0) console.warn(`Removed ${removed} invalid/large municipality geometries.`);
                        }

                    } else if (Object.keys(geo.objects).length > 0) {
                        geo = topojson.feature(geo, geo.objects[Object.keys(geo.objects)[0]]);
                    } else {
                        geo = { features: [] };
                    }
                }
                // Cache the processed geo data
                geoCache[level] = geo;
                return geo;
            });

        Promise.all([
            geoPromise,
            fetch(`/api/results/${electionId}`).then(res => res.json())
        ]).then(([geo, results]) => {
            setGeoData(geo);
            setElectionResults(results);
        }).catch(err => {
            console.error("Failed to load map data", err);
            setGeoData({ features: [] }); // Fallback to empty geo
        });
    }, [level, electionId]);

    useEffect(() => {
        if (!geoData || !electionResults || !svgRef.current) return;

        const width = 600;
        const height = 480;
        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        // Watermark
        const watermarkG = svg.append('g')
            .attr('transform', `translate(${width + 60}, ${height - 40})`)
            .style('pointer-events', 'none')
            .style('user-select', 'none');

        watermarkG.append('image')
            .attr('href', '/logo_horiz.png')
            .attr('width', 160)
            .attr('x', -160) // Align right edge to the transform point
            .attr('y', -15)
            .style('opacity', 0.4)
            .style('filter', 'grayscale(100%) brightness(2)'); // Make it look like a white watermark

        const mainProjection = d3.geoConicConformal()
            .center([-4.5, 40])
            .scale(2000)
            .translate([width / 2 + 80, height / 2]);

        const canaryProjection = d3.geoConicConformal()
            .center([-17.5, 28.5])
            .scale(2268)
            .translate([90, height - 75]);

        const mainPath = d3.geoPath().projection(mainProjection);
        const canaryPath = d3.geoPath().projection(canaryProjection);

        const getGeoPath = (d) => {
            // Support both old (cod_prov, cod_ccaa, natcode) and new (prov_code, acom_code, mun_code) property names
            // For TopoJSON municipalities, d.id is the municipality code (e.g., "35001") - first 2 digits are province
            let provCode = d.properties?.cod_prov || d.properties?.prov_code ||
                (d.properties?.natcode ? d.properties.natcode.substring(0, 2) : null) ||
                (d.id ? String(d.id).substring(0, 2) : null);

            const caCode = d.properties?.cod_ccaa || d.properties?.acom_code;

            // Heuristic for canary islands based on known codes (Las Palmas=35, Santa Cruz de Tenerife=38, Canarias=05)
            const isCanary = provCode === '35' || provCode === '38' || caCode === '05';

            return isCanary ? canaryPath(d) : mainPath(d);
        };

        // Aggregate results
        const aggregated = {};
        Object.entries(electionResults.municipalities).forEach(([munId, mun]) => {
            const caCode = String(mun.ca).padStart(2, '0');
            const provCode = String(mun.prov).padStart(2, '0');
            // key logic
            let key;
            if (level === 'communities') key = caCode;
            else if (level === 'provinces') key = provCode;
            else key = munId; // Municipios level

            if (key) {
                if (!aggregated[key]) aggregated[key] = { votes: {}, seats: {}, total: 0 };
                Object.entries(mun.votes).forEach(([code, count]) => {
                    aggregated[key].votes[code] = (aggregated[key].votes[code] || 0) + count;
                    aggregated[key].total += count;
                });
            }
        });

        // Add seats from provinces (only for higher levels, usually)
        if (level !== 'municipalities' && electionResults.provinces) {
            Object.entries(electionResults.provinces).forEach(([pCode, pData]) => {
                const firstMun = Object.values(electionResults.municipalities).find(m => m.prov === pCode);
                const caCode = firstMun ? String(firstMun.ca).padStart(2, '0') : null;
                const key = level === 'communities' ? caCode : pCode;

                if (key && aggregated[key]) {
                    Object.entries(pData.seats).forEach(([cCode, count]) => {
                        aggregated[key].seats[cCode] = (aggregated[key].seats[cCode] || 0) + count;
                    });
                }
            });
        }

        // Precompute deduplicated tooltip data for all regions (avoids expensive computation on hover)
        const tooltipCache = {};
        Object.entries(aggregated).forEach(([code, unitData]) => {
            tooltipCache[code] = deduplicateResults(unitData.votes, unitData.seats, electionResults.candidacies)
                .slice(0, 5);
        });

        const g = svg.append('g');

        // Tooltip
        let tooltip = d3.select('body').select('.map-tooltip');
        if (tooltip.empty()) {
            tooltip = d3.select('body').append('div')
                .attr('class', 'map-tooltip')
                .style('opacity', 0);
        }

        const colorScale = (d) => {
            let code;
            if (level === 'communities') code = d.properties?.cod_ccaa || d.properties?.acom_code;
            else if (level === 'provinces') code = d.properties?.cod_prov || d.properties?.prov_code;
            else code = d.properties?.mun_code || d.id || d.properties?.natcode;

            const unit = aggregated[code];
            if (!unit || Object.keys(unit.votes).length === 0) return 'rgba(30, 41, 59, 0.4)';

            const results = deduplicateResults(unit.votes, unit.seats, electionResults.candidacies);
            let color = results.length > 0 ? results[0].color : 'rgba(30, 41, 59, 0.4)';

            // Fade colors when seat circles overlay is enabled (blend toward white)
            if (showSeatCircles && level !== 'municipalities') {
                // Parse hex color and blend with white (50% opacity effect)
                const hex = color.replace('#', '');
                if (hex.length === 6) {
                    const r = parseInt(hex.slice(0, 2), 16);
                    const g = parseInt(hex.slice(2, 4), 16);
                    const b = parseInt(hex.slice(4, 6), 16);
                    // Blend 50% toward white
                    const fadeR = Math.round(r + (255 - r) * 0.5);
                    const fadeG = Math.round(g + (255 - g) * 0.5);
                    const fadeB = Math.round(b + (255 - b) * 0.5);
                    color = `rgb(${fadeR}, ${fadeG}, ${fadeB})`;
                }
            }

            return color;
        };

        // If 'geoData.features' is empty (missing file), show message
        if (!geoData.features || geoData.features.length === 0) {
            svg.append('text')
                .attr('x', width / 2)
                .attr('y', height / 2)
                .attr('text-anchor', 'middle')
                .attr('fill', 'white')
                .text(`${t('no_map_available')} ${t(level)}`);
            return;
        }

        // Helper to check if a region is selected
        const isSelected = (d) => {
            let code;
            if (level === 'communities') code = d.properties?.cod_ccaa || d.properties?.acom_code;
            else if (level === 'provinces') code = d.properties?.cod_prov || d.properties?.prov_code;
            else code = d.properties?.mun_code || d.id || d.properties?.natcode;

            if (!selectedRegion) return false;
            if (level === 'communities' && selectedRegion.ccaa === code) return true;
            if (level === 'provinces' && selectedRegion.prov === code) return true;
            if (level === 'municipalities' && selectedRegion.mun === code) return true;
            return false;
        };

        g.selectAll('path')
            .data(geoData.features)
            .enter()
            .append('path')
            .attr('d', getGeoPath)
            .attr('fill', d => colorScale(d))
            .attr('fill-rule', 'evenodd')
            .attr('stroke', d => isSelected(d) ? 'var(--primary)' : (level === 'municipalities' ? 'none' : 'rgba(255, 255, 255, 0.7)'))
            .attr('stroke-width', d => isSelected(d) ? 3 : (level === 'municipalities' ? 0 : 1.0))
            .style('filter', d => isSelected(d) ? 'drop-shadow(0 0 8px var(--primary))' : 'none')
            .style('transition', 'fill 0.3s ease')
            .style('cursor', 'pointer')
            .on('mouseover', (event, d) => {
                if (level !== 'municipalities') {
                    d3.select(event.currentTarget)
                        .attr('stroke', 'white')
                        .attr('stroke-width', 2)
                        .raise();
                    // Keep seat circles on top when paths are raised
                    g.select('.seat-circles').raise();
                }

                let code;
                if (level === 'communities') code = d.properties?.cod_ccaa || d.properties?.acom_code;
                else if (level === 'provinces') code = d.properties?.cod_prov || d.properties?.prov_code;
                else code = d.properties?.mun_code || d.id || d.properties?.natcode;

                const unitData = aggregated[code];

                // Get name: use GeoJSON properties, fallback to election data
                let displayName = d.properties?.name || d.properties?.mun_name || d.properties?.NAME_1 || d.properties?.NAME_2;
                if (!displayName && level === 'municipalities' && electionResults.municipalities?.[code]) {
                    displayName = electionResults.municipalities[code].name || `Municipio ${code}`;
                }

                let html = `<div class="map-tooltip-content">
                    <div class="tooltip-title">${displayName || code}</div>`;

                // Use precomputed tooltip data (fast!)
                const sorted = tooltipCache[code];
                if (sorted && sorted.length > 0) {
                    const total = unitData?.total || 1;

                    sorted.forEach((p) => {
                        const pct = ((p.votes / total) * 100).toFixed(1);
                        // Don't show seats for municipales (they don't make sense at region level)
                        const showSeats = p.seats > 0 && !electionId?.startsWith('municipales');

                        html += `
                            <div class="tooltip-row">
                                <span style="display:flex;align-items:center;gap:6px;">
                                    <span style="width:6px;height:6px;border-radius:50%;background-color:${p.color}"></span>
                                    ${p.siglas}
                                </span>
                                <span style="display:flex;gap:12px;">
                                    <span style="opacity:0.7">${pct}%</span>
                                    ${showSeats ? `<span class="tooltip-seats">${p.seats}</span>` : ''}
                                </span>
                            </div>`;
                    });
                } else {
                    html += `<div style="opacity: 0.5; font-style: italic; padding: 8px;">${t('no_data')}</div>`;
                }
                html += `</div>`;

                tooltip.transition().duration(150).style('opacity', 1);
                tooltip.html(html)
                    .style('left', (event.clientX + 15) + 'px')
                    .style('top', (event.clientY - 10) + 'px');
            })
            .on('mousemove', (event) => {
                tooltip
                    .style('left', (event.clientX + 15) + 'px')
                    .style('top', (event.clientY - 10) + 'px');
            })
            .on('mouseout', (event) => {
                if (level !== 'municipalities') {
                    d3.select(event.currentTarget)
                        .attr('stroke', 'rgba(3, 7, 18, 0.7)')
                        .attr('stroke-width', 0.6);
                }
                tooltip.transition().duration(300).style('opacity', 0);
            })
            .on('touchend', () => {
                // Hide tooltip after a delay on touch devices
                setTimeout(() => {
                    tooltip.transition().duration(300).style('opacity', 0);
                }, 2000);
            })
            .on('click', (event, d) => {
                event.stopPropagation(); // Prevent event from bubbling up

                // Get the code for the clicked region
                let code;
                if (level === 'communities') code = d.properties?.cod_ccaa || d.properties?.acom_code;
                else if (level === 'provinces') code = d.properties?.cod_prov || d.properties?.prov_code;
                else code = d.properties?.mun_code || d.id || d.properties?.natcode;

                // Call callback if provided
                if (onRegionClick && code) {
                    onRegionClick({ level, code });
                }
            });

        // Hide tooltip when clicking on SVG background (touch dismiss)
        svg.on('click', (event) => {
            if (event.target === svg.node()) {
                tooltip.transition().duration(200).style('opacity', 0);
            }
        });

        // Special circles for Ceuta and Melilla
        const ceutaMelilla = [
            { code: level === 'communities' ? '18' : '51', name: 'Ceuta', coords: [-5.35, 35.89] },
            { code: level === 'communities' ? '19' : '52', name: 'Melilla', coords: [-2.94, 35.29] }
        ];

        ceutaMelilla.forEach(city => {
            if (level === 'municipalities') return;

            const cityData = aggregated[city.code];
            const point = mainProjection(city.coords);

            if (!point) return;

            const getColor = () => {
                if (!cityData) return 'rgba(30, 41, 59, 0.4)';
                const results = deduplicateResults(cityData.votes, cityData.seats, electionResults.candidacies);
                return results.length > 0 ? results[0].color : 'rgba(30, 41, 59, 0.4)';
            };

            const circle = g.append('circle')
                .attr('cx', point[0])
                .attr('cy', point[1])
                .attr('r', 5)
                .attr('fill', getColor())
                .attr('stroke', 'rgba(255, 255, 255, 0.2)')
                .attr('stroke-width', 1.5)
                .style('cursor', 'pointer')
                .style('transition', 'all 0.3s ease');

            // Add interactivity
            circle.on('mouseover', (event) => {
                d3.select(event.currentTarget)
                    .attr('stroke', 'white')
                    .attr('stroke-width', 2)
                    .attr('r', 5);

                let html = `<div class="map-tooltip-content">
                    <div class="tooltip-title">${city.name}</div>`;

                if (cityData) {
                    const sorted = deduplicateResults(cityData.votes, cityData.seats, electionResults.candidacies)
                        .slice(0, 5);

                    sorted.forEach((p) => {
                        const pct = ((p.votes / (cityData.total || 1)) * 100).toFixed(1);
                        // Don't show seats for municipales
                        const showSeats = p.seats > 0 && !electionId?.startsWith('municipales');
                        html += `
                            <div class="tooltip-row">
                                <span style="display:flex;align-items:center;gap:6px;">
                                    <span style="width:6px;height:6px;border-radius:50%;background-color:${p.color}"></span>
                                    ${p.siglas}
                                </span>
                                <span style="display:flex;gap:12px;">
                                    <span style="opacity:0.7">${pct}%</span>
                                    ${showSeats ? `<span class="tooltip-seats">${p.seats}</span>` : ''}
                                </span>
                            </div>`;
                    });
                } else {
                    html += `<div style="opacity: 0.5; font-style: italic; padding: 8px;">${t('no_data')}</div>`;
                }
                html += `</div>`;

                tooltip.transition().duration(150).style('opacity', 1);
                tooltip.html(html)
                    .style('left', (event.clientX + 15) + 'px')
                    .style('top', (event.clientY - 10) + 'px');
            })
                .on('mousemove', (event) => {
                    tooltip
                        .style('left', (event.clientX + 15) + 'px')
                        .style('top', (event.clientY - 10) + 'px');
                })
                .on('mouseout', (event) => {
                    d3.select(event.currentTarget)
                        .attr('stroke', 'rgba(255, 255, 255, 0.2)')
                        .attr('stroke-width', 1.5)
                        .attr('r', 8);
                    tooltip.transition().duration(300).style('opacity', 0);
                })
                .on('click', () => {
                    // Call onRegionClick with current level and city code (for filtering)
                    if (onRegionClick && city.code) {
                        onRegionClick({ level, code: city.code });
                    }
                });
        });

        // Render seat circles overlay if enabled (only for Comunidades/Provincias and Congreso)
        if (showSeatCircles && level !== 'municipalities' && electionResults?.provinces && !electionId?.startsWith('municipales')) {

            const seatCircleGroup = g.append('g').attr('class', 'seat-circles');

            if (level === 'provinces') {
                // Provinces view: show circles at each province centroid
                geoData.features.forEach(feature => {
                    const provCode = feature.properties?.cod_prov || feature.properties?.prov_code;
                    const provData = electionResults.provinces?.[provCode];

                    if (!provData?.seats) return;

                    const isCanary = provCode === '35' || provCode === '38';
                    const projectionFunc = isCanary ? canaryProjection : mainProjection;
                    const centroid = projectionFunc(d3.geoCentroid(feature));
                    if (!centroid || isNaN(centroid[0]) || isNaN(centroid[1])) return;

                    // Get parties with seats, sorted by count
                    const partiesWithSeats = Object.entries(provData.seats)
                        .filter(([_, seats]) => seats > 0)
                        .map(([code, seats]) => {
                            const cand = electionResults.candidacies?.[code];
                            const siglas = cand?.siglas || code;
                            const norm = normalizeParty(siglas);
                            return { code, seats, color: norm.color };
                        })
                        .sort((a, b) => b.seats - a.seats);

                    if (partiesWithSeats.length === 0) return;

                    renderSeatDots(seatCircleGroup, centroid, partiesWithSeats);
                });
            } else {
                // Communities view: aggregate seats per comunidad and show at comunidad centroid
                geoData.features.forEach(feature => {
                    const caCode = feature.properties?.cod_ccaa || feature.properties?.acom_code;
                    const unitData = aggregated[caCode];

                    if (!unitData?.seats || Object.keys(unitData.seats).length === 0) return;

                    // Determine if this is Canary Islands (code 05)
                    const isCanary = caCode === '05';
                    const projectionFunc = isCanary ? canaryProjection : mainProjection;
                    const centroid = projectionFunc(d3.geoCentroid(feature));
                    if (!centroid || isNaN(centroid[0]) || isNaN(centroid[1])) return;

                    // Get parties with seats from aggregated data
                    const partiesWithSeats = Object.entries(unitData.seats)
                        .filter(([_, seats]) => seats > 0)
                        .map(([code, seats]) => {
                            const cand = electionResults.candidacies?.[code];
                            const siglas = cand?.siglas || code;
                            const norm = normalizeParty(siglas);
                            return { code, seats, color: norm.color };
                        })
                        .sort((a, b) => b.seats - a.seats);

                    if (partiesWithSeats.length === 0) return;

                    renderSeatDots(seatCircleGroup, centroid, partiesWithSeats);
                });
            }

            // Helper function to render dots for a region
            function renderSeatDots(group, centroid, partiesWithSeats) {
                const dotRadius = 1.7;  // Reduced by another 10% from 1.9
                const dotSpacing = 3.9;   // Reduced by another 10% from 4.3
                const maxDotsPerRow = 6; // User asked for max 6-7

                // Flatten seats into individual dots
                const allDots = [];
                partiesWithSeats.forEach(p => {
                    for (let i = 0; i < p.seats; i++) {
                        allDots.push(p.color);
                    }
                });

                // Calculate grid layout
                const numRows = Math.ceil(allDots.length / maxDotsPerRow);
                const gridWidth = Math.min(allDots.length, maxDotsPerRow) * dotSpacing;
                const gridHeight = numRows * dotSpacing;

                // Center the grid at centroid
                const startX = centroid[0] - gridWidth / 2 + dotSpacing / 2;
                const startY = centroid[1] - gridHeight / 2 + dotSpacing / 2;

                allDots.forEach((color, idx) => {
                    const row = Math.floor(idx / maxDotsPerRow);
                    const col = idx % maxDotsPerRow;
                    const dotsInThisRow = Math.min(maxDotsPerRow, allDots.length - row * maxDotsPerRow);
                    const rowOffset = (maxDotsPerRow - dotsInThisRow) * dotSpacing / 2;

                    group.append('circle')
                        .attr('cx', startX + col * dotSpacing + rowOffset)
                        .attr('cy', startY + row * dotSpacing)
                        .attr('r', dotRadius)
                        .attr('fill', color)
                        .attr('stroke', 'rgba(0,0,0,0.5)')
                        .attr('stroke-width', 0.5)
                        .style('pointer-events', 'none');
                });
            }
        }

        const zoom = d3.zoom()
            .scaleExtent([0.5, 20]) // Increase zoom for municipalities
            .on('zoom', (event) => {
                g.attr('transform', event.transform);
            });

        svg.call(zoom);
        zoomRef.current = zoom;

    }, [geoData, electionResults, level, t, selectedRegion, onRegionClick, showSeatCircles]);

    const handleZoomIn = useCallback(() => {
        if (!svgRef.current || !zoomRef.current) return;
        const svg = d3.select(svgRef.current);
        svg.transition().duration(300).call(zoomRef.current.scaleBy, 1.5);
    }, []);

    const handleZoomOut = useCallback(() => {
        if (!svgRef.current || !zoomRef.current) return;
        const svg = d3.select(svgRef.current);
        svg.transition().duration(300).call(zoomRef.current.scaleBy, 0.67);
    }, []);

    const handleReset = useCallback(() => {
        if (!svgRef.current || !zoomRef.current) return;
        const svg = d3.select(svgRef.current);
        svg.transition().duration(300).call(zoomRef.current.transform, d3.zoomIdentity);
    }, []);

    return (
        <div className="map-view">
            <div className="map-controls">
                {/* Desktop Controls - buttons in a row */}
                <div className="map-controls-left desktop-only">
                    <button onClick={() => setLevel('communities')} className={level === 'communities' ? 'active' : ''}>
                        {t('communities')}
                    </button>
                    <button onClick={() => setLevel('provinces')} className={level === 'provinces' ? 'active' : ''}>
                        {t('provinces')}
                    </button>
                    <button onClick={() => setLevel('municipalities')} className={level === 'municipalities' ? 'active' : ''}>
                        {t('municipalities')}
                    </button>
                    {/* Seat circles toggle - only for Comunidades/Provincias and Congreso elections */}
                    {level !== 'municipalities' && !electionId?.startsWith('municipales') && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '1rem', fontSize: '0.8rem', cursor: 'pointer', opacity: 0.8 }}>
                            <input
                                type="checkbox"
                                checked={showSeatCircles}
                                onChange={(e) => setShowSeatCircles(e.target.checked)}
                                style={{ cursor: 'pointer' }}
                            />
                            {t('show_seats')}
                        </label>
                    )}
                </div>

                {/* Mobile/Tablet Controls - 3 columns on tablet, stacked on mobile */}
                <div className="map-controls-mobile mobile-only" style={{ display: 'none' }}>
                    {/* Column 1: Level buttons */}
                    <div className="control-col-levels">
                        <div className="mobile-level-buttons">
                            <button onClick={() => setLevel('communities')} className={level === 'communities' ? 'active' : ''}>
                                {t('communities')}
                            </button>
                            <button onClick={() => setLevel('provinces')} className={level === 'provinces' ? 'active' : ''}>
                                {t('provinces')}
                            </button>
                            <button onClick={() => setLevel('municipalities')} className={level === 'municipalities' ? 'active' : ''}>
                                {t('municipalities')}
                            </button>
                        </div>
                    </div>

                    {/* Wrapper for Row 2 (Elections + Language/Actions) - helps centered alignment on mobile */}
                    <div className="control-row-2">
                        {/* Column 2: Election Selectors */}
                        {electionSelectors && (
                            <div className="control-col-elections">
                                <div className="mobile-election-selectors">
                                    {electionSelectors}
                                </div>
                            </div>
                        )}

                        {/* Column 3: Language + Seats OR Actions (Only if enabled) */}
                        {(showLanguageControl || extraControls) && (
                            <div className="control-col-lang" style={extraControls ? { justifyContent: 'flex-end' } : {}}>
                                {showLanguageControl ? (
                                    <>
                                        <select
                                            className="premium-select"
                                            value={lang}
                                            onChange={(e) => setLang(e.target.value)}
                                            style={{ padding: '0.3rem 0.5rem', fontSize: '0.7rem' }}
                                        >
                                            <option value="es">ES 🇪🇸</option>
                                            <option value="en">EN 🇬🇧</option>
                                        </select>
                                        {level !== 'municipalities' && !electionId?.startsWith('municipales') && (
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', cursor: 'pointer', justifyContent: 'center' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={showSeatCircles}
                                                    onChange={(e) => setShowSeatCircles(e.target.checked)}
                                                    style={{ cursor: 'pointer' }}
                                                />
                                                {t('seats_short')}
                                            </label>
                                        )}
                                    </>
                                ) : (
                                    extraControls
                                )}
                            </div>
                        )}
                    </div>
                </div>



                {/* Desktop election selectors */}
                {electionSelectors && (
                    <div className="map-controls-right desktop-only">
                        {electionSelectors}
                    </div>
                )}
            </div>

            {/* Drag Handle (Absolute Top Right for MultiView) */}
            {dragHandle && (
                <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', zIndex: 100 }}>
                    {dragHandle}
                </div>
            )}

            {/* Zoom controls */}
            <div className="zoom-controls">
                <button onClick={handleZoomIn} title="Zoom In">+</button>
                <button onClick={handleZoomOut} title="Zoom Out">−</button>
                <button onClick={handleReset} title="Reset">⟲</button>

                {/* Extra Controls (Download/Remove for MultiView) - Desktop Only in Vertical Panel */}
                {extraControls && (
                    <div className="desktop-only" style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '4px' }}>
                        {extraControls}
                    </div>
                )}
            </div>

            <svg ref={svgRef} width="100%" height="100%" viewBox="0 0 700 480" preserveAspectRatio="xMidYMid meet"></svg>
        </div >
    );
};

export default SpanishMap;
