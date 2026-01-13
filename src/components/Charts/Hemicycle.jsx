import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { getPartyInfo } from '../../utils/partyColors';

/**
 * Hemicycle Chart - Arc-based parliament visualization
 * PSOE on far left, PP on far right, others in between
 */
const Hemicycle = ({ electionData }) => {
    const svgRef = useRef();

    useEffect(() => {
        if (!electionData || !electionData.summary || !svgRef.current) return;

        const { summary, candidacies } = electionData;

        // Build party list with seats
        // API structure: summary[partyCode] = { votes, seats }
        const parties = Object.entries(summary)
            .filter(([code, data]) => data.seats > 0)
            .map(([code, data]) => {
                const party = candidacies[code];
                const siglas = party?.siglas || code;
                const info = getPartyInfo(siglas);
                return {
                    code,
                    siglas,
                    seats: data.seats,
                    color: info.color,
                    votes: data.votes || 0
                };
            })
            .sort((a, b) => b.seats - a.seats);

        if (parties.length === 0) return;

        // Order: PSOE group (left) -> Others (center) -> PP group (right)
        const psoeGroup = parties.filter(p =>
            p.siglas.includes('PSOE') || p.siglas.includes('PSC') || p.siglas.includes('PSN')
        );
        const ppGroup = parties.filter(p =>
            p.siglas.includes('PP') && !p.siglas.includes('PSOE')
        );
        const leftParties = parties.filter(p =>
            p.siglas.includes('SUMAR') || p.siglas.includes('PODEMOS') ||
            p.siglas.includes('ERC') || p.siglas.includes('BILDU') ||
            p.siglas.includes('BNG') || p.siglas.includes('CUP')
        );
        const rightParties = parties.filter(p =>
            p.siglas.includes('VOX')
        );
        const centerParties = parties.filter(p =>
            !psoeGroup.includes(p) && !ppGroup.includes(p) &&
            !leftParties.includes(p) && !rightParties.includes(p)
        );

        // Final order for hemicycle (left to right)
        const orderedParties = [
            ...psoeGroup,
            ...leftParties.sort((a, b) => b.seats - a.seats),
            ...centerParties.sort((a, b) => b.seats - a.seats),
            ...rightParties,
            ...ppGroup
        ];

        const totalSeats = orderedParties.reduce((sum, p) => sum + p.seats, 0);
        const majoritySeats = Math.floor(totalSeats / 2) + 1;

        // SVG Setup
        const width = 400;
        const height = 220;
        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const centerX = width / 2;
        const centerY = height - 20;
        const outerRadius = 180;
        const innerRadius = 100;

        // Create arc generator
        const arc = d3.arc()
            .innerRadius(innerRadius)
            .outerRadius(outerRadius);

        // Calculate angles for each party (semicircle from PI to 0)
        let currentAngle = Math.PI;
        const arcs = orderedParties.map(party => {
            const angleSpan = (party.seats / totalSeats) * Math.PI;
            const startAngle = currentAngle;
            const endAngle = currentAngle - angleSpan;
            currentAngle = endAngle;
            return {
                ...party,
                startAngle,
                endAngle
            };
        });

        // Draw arcs
        const g = svg.append('g')
            .attr('transform', `translate(${centerX}, ${centerY})`);

        g.selectAll('path')
            .data(arcs)
            .enter()
            .append('path')
            .attr('d', d => arc({
                innerRadius,
                outerRadius,
                startAngle: d.startAngle - Math.PI / 2,
                endAngle: d.endAngle - Math.PI / 2
            }))
            .attr('fill', d => d.color)
            .attr('stroke', '#0a0a0a')
            .attr('stroke-width', 1)
            .style('cursor', 'pointer')
            .on('mouseover', function (event, d) {
                d3.select(this).attr('opacity', 0.8);
            })
            .on('mouseout', function () {
                d3.select(this).attr('opacity', 1);
            });

        // Add seat labels for parties with significant seats
        arcs.filter(d => d.seats >= 10).forEach(d => {
            const midAngle = (d.startAngle + d.endAngle) / 2 - Math.PI / 2;
            const labelRadius = (innerRadius + outerRadius) / 2;
            const x = Math.cos(midAngle) * labelRadius;
            const y = Math.sin(midAngle) * labelRadius;

            g.append('text')
                .attr('x', x)
                .attr('y', y)
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'middle')
                .attr('fill', 'white')
                .attr('font-size', d.seats >= 50 ? '16px' : '12px')
                .attr('font-weight', '700')
                .style('text-shadow', '0 1px 3px rgba(0,0,0,0.8)')
                .text(d.seats);
        });

        // Center text - Majority info
        g.append('text')
            .attr('x', 0)
            .attr('y', -30)
            .attr('text-anchor', 'middle')
            .attr('fill', 'rgba(255,255,255,0.6)')
            .attr('font-size', '12px')
            .text('Mayoría');

        g.append('text')
            .attr('x', 0)
            .attr('y', -10)
            .attr('text-anchor', 'middle')
            .attr('fill', 'white')
            .attr('font-size', '18px')
            .attr('font-weight', '700')
            .text(`${majoritySeats} escaños`);

        // Watermark
        svg.append('text')
            .attr('x', width - 10)
            .attr('y', height - 5)
            .attr('text-anchor', 'end')
            .attr('fill', 'rgba(255, 255, 255, 0.05)')
            .attr('font-size', '10px')
            .attr('font-weight', '600')
            .text('ELECTOGRAPHICA');

    }, [electionData]);

    if (!electionData) {
        return <div className="hemicycle-loading">Cargando hemiciclo...</div>;
    }

    return (
        <div className="hemicycle-container">
            <svg
                ref={svgRef}
                width="100%"
                height="220"
                viewBox="0 0 400 220"
                preserveAspectRatio="xMidYMid meet"
            />
        </div>
    );
};

export default Hemicycle;
