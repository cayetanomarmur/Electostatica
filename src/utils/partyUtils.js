
// Party Configuration with Colors and Normalization Rules
export const PARTY_CONFIG = {
    // Standard Colors (Main Parties) - Using official branding colors
    colors: {
        PSOE: '#DB1A15',        // Red
        PP: '#0055A7',          // Blue (Standard PP Blue)
        VOX: '#63BE21',         // Green
        SUMAR: '#E14E86',       // Pink/Magenta
        PODEMOS: '#6B2E68',     // Purple
        IU: '#9F1E1A',          // Dark Red (Communist/IU standard)
        ERC: '#FFB232',         // Yellow/Orange
        JUNTS: '#00C3B2',       // Teal (Junts strict - from 2019)
        BILDU: '#B4D435',       // Light Green
        PNV: '#008000',         // Green
        BNG: '#76B8E6',         // Light Blue
        CC: '#FFD700',          // Yellow (Coalición Canaria)
        CCA: '#E6C200',         // Kinda Yellow (CCA-PNC-NC)
        UPN: '#003366',         // Dark Blue (distinct from PP usually, but allied)
        'NA+': '#1A4D80',       // Navarra Suma - distinct dark blue (NOT PP)
        CS: '#EB6109',          // Orange
        ADELANTE: '#34E081',    // Andalusian Green
        PACMA: '#C6E52D',       // Lime
        UCD: '#007A33',         // Historic: Green
        CDS: '#2E8B57',         // CDS - Green (per user request for 1986/1989/1993)
        AP: '#0066CC',          // Alianza Popular (Blue)
        PCE: '#9F1E1A',         // Same as IU
        // Regional parties - distinct colors (but Podemos coalitions in purple)
        ECP: '#6B2E68',         // En Comú Podem - Purple (Podemos coalition)
        'EN COMÚ PODEM': '#6B2E68', // Purple
        'EN MAREA': '#6B2E68',  // En Marea - Purple (Podemos/IU coalition in Galicia)
        'ES EL MOMENT': '#6B2E68', // Es el moment - Purple (Podemos coalition Valencia 2015)
        CIU: '#003057',         // CiU - Dark blue (darker than PP)
        CDC: '#003057',         // CDC - Dark blue (like CiU)
        DIL: '#003057',         // DiL (Democràcia i Llibertat) - Similar to CDC
        COMPROMIS: '#FF6600',   // Compromís - Orange
        'A LA VALENCIANA': '#6B2E68', // A la Valenciana - Purple (Compromís-Podemos-EUPV coalition)
        PRC: '#1A5C1A',         // PRC - Dark green
        'TERUEL EXISTE': '#2D4A2D', // Different dark green
        UPYD: '#E556A1',        // UPyD - Different pink than Sumar
        CUP: '#FFCC00',         // CUP - Yellow
        'MAS PAIS': '#00A95C',  // Más País - Green (not Sumar)
        DEFAULT: '#64748B'
    },
    // Priority parties for Trends/Analysis (User specified list)
    priority: [
        'PP', 'PSOE', 'VOX', 'PODEMOS', 'SUMAR', 'IU', 'AP', 'UCD', 'CS',
        'ERC', 'JUNTS', 'PNV', 'BILDU'
    ],
    // Strict Aliases: Only merge when truly the same party
    // Be careful: many "alliances" should remain distinct
    aliases: {
        // PP aliases (only exact matches)
        "P.P.": "PP",
        "PARTIDO POPULAR": "PP",
        // PSOE regional branches (these truly count as PSOE nationally)
        "P.S.O.E.": "PSOE",
        "PARTIDO SOCIALISTA OBRERO ESPAÑOL": "PSOE",
        "PSOE-A": "PSOE",
        "PSC": "PSOE",
        "PSDEG-PSOE": "PSOE",
        "PSE-EE": "PSOE",
        // Podemos variants (but NOT En Comú Podem - that's separate!)
        "UNIDAS PODEMOS": "PODEMOS",
        "PODEMOS-IU": "PODEMOS",
        // IU aliases (including all regional variants)
        "IU-UPEC": "IU",
        "IZQUIERDA UNIDA": "IU",
        "IULV-CA": "IU",        // IU - Andalucía
        "EUPV": "IU",           // Esquerra Unida País Valencià
        "EU-EG": "IU",          // Esquerda Unida - Galicia
        "IC-EV": "IU",          // Iniciativa per Catalunya - Els Verds
        "EV-IB": "IU",          // Els Verds - Illes Balears
        "IUCL": "IU",           // IU - Castilla y León
        "IUCLM-IV": "IU",       // IU - Castilla-La Mancha
        "EU-V": "IU",           // Esquerra Unida - Valenciana
        "IUC": "IU",            // IU - Canarias
        "ICV-EUIA": "IU",       // Iniciativa per Catalunya Verds - EUIA
        "ICV": "IU",            // Iniciativa per Catalunya Verds
        "EUIA": "IU",           // Esquerra Unida i Alternativa
        // Ciudadanos
        "C'S": "CS",
        "CIUDADANOS": "CS",
        // ERC
        "ESQUERRA": "ERC",
        "ESQUERRA REPUBLICANA": "ERC",
        "AM": "ERC",  // Catalunya: AM = ERC
        // PNV
        "EAJ-PNV": "PNV",
        "EAJ": "PNV",
        // Bildu
        "EH BILDU": "BILDU",
        // Junts (ONLY from 2019 on - JXCAT and similar)
        "JXCAT": "JUNTS",
        "JUNTS PER CATALUNYA": "JUNTS",
        // NOTE: CDC, CiU, Convergencia are NOT mapped to Junts - they're pre-2019 distinct parties
        // ADELANTE
        "ADELANTE ANDALUCÍA": "ADELANTE",
        // UPN
        "UNION DEL PUEBLO NAVARRO": "UPN",
        "UNIÓN DEL PUEBLO NAVARRO": "UPN",
        "U.P.N.": "UPN",
        // En Comú Podem variants (NOT mapped to Podemos - distinct purple party)
        "ECP-GUANYEM": "ECP",
        "ECP": "ECP",
        "EN COMÚ PODEM": "ECP",
        "EN COMÚ": "ECP",               // 2015 sigla
        "PODEMOS-COM": "ECP",           // 2016 variant
        // En Marea variants (Galicia coalition - purple)
        "PODEMOS-EN MAREA-ANOVA-EU": "EN MAREA",  // 2016 sigla
        "PODEMOS-EN": "EN MAREA",               // 2015 truncated sigla
        "PODEMOS-En": "EN MAREA",               // 2015 variant
        "EN MAREA": "EN MAREA",
        // Compromís variants
        "COMPROMÍS-PODEMOS-EUPV": "A LA VALENCIANA",
        "COMPROMÍS 2": "COMPROMIS",
        "MÉS COMPROMÍS": "COMPROMIS",
        "MES COMPROMIS": "COMPROMIS",
        // CCA variants
        "CCA-PNC-NC": "CCA",
        "CCA-PNC": "CCA",
        // CUP
        "CUP-PR": "CUP",
        // DiL
        "DL": "DIL",
        // Teruel Existe
        "¡TERUEL EXISTE!": "TERUEL EXISTE",
        // UPyD
        "UPYD": "UPYD",
        "U.P.Y.D.": "UPYD",
        "UNIÓN PROGRESO Y DEMOCRACIA": "UPYD",
        // Es el moment -> A la Valenciana (similar coalition)
        "ES EL MOMENT": "A LA VALENCIANA",
    },
    // Groups: These retain their name for display but map to a Parent for color only.
    // NOTE: NA+ is NOT mapped to PP - they are distinct parties
    groups: {
        "PP-FORO": "PP",
        "PP-PAR": "PP",
        "PP-EU": "PP",
        // UPN is kept separate - allied but distinct from PP
        // NA+ is kept separate - Navarra coalition, distinct from PP
        // CiU/CDC are kept separate - pre-Junts Catalan parties
    }
};

/**
 * Normalizes a party name based on config rules.
 * @param {string} rawSiglas - Original party acronym (e.g. "P.P.")
 * @returns {object} { id, display, color, isGroupChild }
 * - id: The canonical ID for aggregation (e.g. "PP")
 * - display: The name to show (e.g. "PP-Foro" or "PP")
 * - color: The hex color
 */
// Regex patterns for fuzzy matching - Updated to keep parties distinct
const REGEX_RULES = [
    { pattern: /(?:^|\b|[\s\-])(PSOE|PSE|PSC|P\.S\.O\.E\.?)(?:$|\b|[\s\-])/i, id: 'PSOE', display: 'PSOE' },
    { pattern: /(?:^|\b|[\s\-])(PP|P\.P\.?)(?:$|\b|[\s\-])/i, id: 'PP', display: 'PP' },
    // Sumar - ONLY Sumar itself, NOT Compromís or Más País
    { pattern: /(?:^|\b|[\s\-])(SUMAR|SUMAR-MÉS)(?:$|\b|[\s\-])/i, id: 'SUMAR', display: 'Sumar' },

    // *** PODEMOS COALITIONS - MUST COME BEFORE GENERAL PODEMOS ***
    // En Marea - Galicia coalition (matches "PODEMOS-EN MAREA" or just "EN MAREA")
    { pattern: /PODEMOS-EN MAREA|EN MAREA|PODEMOS-EN(?:\s|$)/i, id: 'EN MAREA', display: 'En Marea' },
    // En Comú Podem - Catalonia coalition (EN COMÚ, ECP-GUANYEM) - NOT PODEMOS-COM!
    { pattern: /EN COMÚ PODEM|EN COMÚ|ECP-GUANYEM|^ECP$/i, id: 'ECP', display: 'En Comú Podem' },
    // A la Valenciana / Compromís-Podemos-EUPV - Valencia 2016 coalition (Mapped to Podemos per user request)
    { pattern: /A LA VALENCIANA|COMPROMÍS-PODEMOS-EUPV/i, id: 'PODEMOS', display: 'Podemos' },
    // Es el moment - Valencia 2015 coalition (siglas: PODEMOS-COM, PODEMOS - C) (Mapped to Podemos per user request)
    { pattern: /ÉS EL MOMENT|ES EL MOMENT|COMPROMÍS-PODEMOS|PODEMOS-COM|PODEMOS - C/i, id: 'PODEMOS', display: 'Podemos' },

    // General Podemos - ONLY matches plain "PODEMOS" not the coalitions above
    { pattern: /(?:^|\b|[\s\-])(PODEMOS|UNIDAS PODEMOS)(?:$|\b|[\s\-])/i, id: 'PODEMOS', display: 'Podemos' },
    { pattern: /(?:^|\b|[\s\-])(ERC|ESQUERRA)(?:$|\b|[\s\-])/i, id: 'ERC', display: 'ERC' },
    // Junts - ONLY from 2019+ (JxCAT), NOT CiU/CDC/Convergencia
    { pattern: /(?:^|\b|[\s\-])(JUNTS|JxCAT|JUNTS PER CATALUNYA)(?:$|\b|[\s\-])/i, id: 'JUNTS', display: 'Junts' },
    // CiU - distinct party (pre-2019)
    { pattern: /(?:^|\b|[\s\-])(CIU|CONVERGÈNCIA I UNIÓ|CONVERGENCIA I UNIO)(?:$|\b|[\s\-])/i, id: 'CIU', display: 'CiU' },
    // CDC - distinct party (pre-2019)
    { pattern: /(?:^|\b|[\s\-])(CDC|CONVERGÈNCIA)(?:$|\b|[\s\-])/i, id: 'CDC', display: 'CDC' },
    { pattern: /(?:^|\b|[\s\-])(EH BILDU|BILDU)(?:$|\b|[\s\-])/i, id: 'BILDU', display: 'EH Bildu' },
    { pattern: /(?:^|\b|[\s\-])(EAJ|PNV)(?:$|\b|[\s\-])/i, id: 'PNV', display: 'PNV' },
    { pattern: /(?:^|\b|[\s\-])(BNG)(?:$|\b|[\s\-])/i, id: 'BNG', display: 'BNG' },
    { pattern: /(?:^|\b|[\s\-])(VOX)(?:$|\b|[\s\-])/i, id: 'VOX', display: 'Vox' },
    { pattern: /(?:^|\b|[\s\-])(CS|CIUDADANOS|C's)(?:$|\b|[\s\-])/i, id: 'CS', display: 'Cs' },
    { pattern: /(?:^|\b|[\s\-])(IU|IZQUIERDA UNIDA|IU-UPEC)(?:$|\b|[\s\-])/i, id: 'IU', display: 'IU' },
    // Compromís - distinct orange party (NOT the Podemos coalition)
    { pattern: /(?:^|\b|[\s\-])(COMPROMÍS|COMPROMIS)(?:$|\b|[\s\-])/i, id: 'COMPROMIS', display: 'Compromís' },
    // Más País - distinct from Sumar
    { pattern: /(?:^|\b|[\s\-])(MÁS PAÍS|MAS PAIS)(?:$|\b|[\s\-])/i, id: 'MAS PAIS', display: 'Más País' },
    // UPyD - distinct pink
    { pattern: /(?:^|\b|[\s\-])(UPYD|U\.?P\.?Y\.?D\.?)(?:$|\b|[\s\-])/i, id: 'UPYD', display: 'UPyD' },
    // CUP - yellow
    { pattern: /(?:^|\b|[\s\-])(CUP)(?:$|\b|[\s\-])/i, id: 'CUP', display: 'CUP' },
    // NA+ - distinct from PP (Navarra only)
    { pattern: /(?:^|\b|[\s\-])(NA\+|NAVARRA SUMA)(?:$|\b|[\s\-])/i, id: 'NA+', display: 'NA+' },
    // PRC - dark green
    { pattern: /(?:^|\b|[\s\-])(PRC|PARTIDO REGIONALISTA DE CANTABRIA)(?:$|\b|[\s\-])/i, id: 'PRC', display: 'PRC' },
    // Teruel Existe
    { pattern: /(?:^|\b|[\s\-])(TERUEL EXISTE)(?:$|\b|[\s\-])/i, id: 'TERUEL EXISTE', display: 'Teruel Existe' },
    // CCA - Canarias
    { pattern: /(?:^|\b|[\s\-])(CCA|CC|COALICIÓN CANARIA)(?:$|\b|[\s\-])/i, id: 'CCA', display: 'CC' },
    // AP is handled separately with year-based logic in normalizeParty function
    { pattern: /(?:^|\b|[\s\-])(UCD|UNIÓN DE CENTRO DEMOCRÁTICO)(?:$|\b|[\s\-])/i, id: 'UCD', display: 'UCD' }
];

export const normalizeParty = (rawSiglas, context = {}) => {
    if (!rawSiglas) return { id: 'OTHER', display: '?', color: PARTY_CONFIG.colors.DEFAULT };

    const up = rawSiglas.toUpperCase().trim();
    // Strip dots from acronyms (B.N.G -> BNG, P.R.C. -> PRC)
    const noDots = up.replace(/\./g, '');
    let id = null;
    let display = noDots; // Use dot-stripped version as default display
    let isGroupChild = false;

    // Special handling for AP (Alianza Popular) which has year-dependent meaning
    // Include AP-PDP, CP (Coalición Popular), and similar 1980s coalitions
    const isAP = noDots === 'AP' || noDots === 'ALIANZA POPULAR' ||
        noDots.startsWith('AP-') || noDots.includes('-AP') ||
        noDots === 'COALICIÓN POPULAR' || noDots === 'COALICION POPULAR' ||
        noDots === 'CP' || noDots === 'CD' || noDots === 'COALICION DEMOCRATICA';

    const year = context.year || 0;
    const electionId = context.electionId || '';

    if (isAP) {
        // Municipales 2023: AP = PSC/PSOE in Catalonia (specific case)
        if (electionId === 'municipales_2023_05' || (electionId.includes('municipales') && year === 2023)) {
            id = 'PSOE';
            display = 'PSOE';
            return { id, display, color: PARTY_CONFIG.colors[id] || PARTY_CONFIG.colors.DEFAULT };
        }
        // Until 1989: AP/AP-PDP/CP = Alianza Popular (PP predecessor) - all grouped as AP
        if (year < 1989 || year === 0) { // BEFORE 1989 (1982, 1986...) -> AP
            id = 'AP';
            display = 'AP';
            return { id, display, color: PARTY_CONFIG.colors.AP || PARTY_CONFIG.colors.PP || PARTY_CONFIG.colors.DEFAULT };
        }
        // After 1989: Don't normalize AP (unless it's truly AP re-founded? Unlikely).
        return { id: 'AP-OTHER', display: noDots, color: PARTY_CONFIG.colors.DEFAULT };
    }

    // CHECK FOR PRE-1989 PP (Which shouldn't exist)
    // If input is "PP" but year < 1989, it is likely AP or mislabeled. Force to AP.
    if ((noDots === 'PP' || noDots === 'PARTIDO POPULAR') && year > 0 && year < 1989) {
        id = 'AP';
        display = 'AP';
        return { id, display, color: PARTY_CONFIG.colors.AP };
    }

    // 1. Regex Matching (Priority) - use dot-stripped version
    for (const rule of REGEX_RULES) {
        if (rule.pattern.test(noDots)) {
            id = rule.id;
            display = rule.display;
            break;
        }
    }

    if (!id) {
        // 2. Strict Aliases / Fallback - check both original and dot-stripped
        if (PARTY_CONFIG.aliases[noDots]) {
            id = PARTY_CONFIG.aliases[noDots];
            display = PARTY_CONFIG.aliases[noDots];
        } else if (PARTY_CONFIG.aliases[up]) {
            id = PARTY_CONFIG.aliases[up];
            display = PARTY_CONFIG.aliases[up];
        } else if (PARTY_CONFIG.groups[noDots]) {
            id = PARTY_CONFIG.groups[noDots];
            isGroupChild = true;
            display = noDots;
        } else if (PARTY_CONFIG.groups[up]) {
            id = PARTY_CONFIG.groups[up];
            isGroupChild = true;
            display = noDots;
        } else {
            // Default: Use dot-stripped version
            id = noDots;
        }
    } else {
        // ID found via Regex.
        // Check if it's actually a group child that should keep its name?
        // E.g. "En Marea" matches "Podemos" rule? Maybe not.
        // If Regex matched, we set 'display' to canonical. 
        // Logic check: "PP-Foro" matches /PP/ -> PP. Display -> PP.
        // User earlier said: "PP-Foro maps to PP but keeps name".
        // BUT current request: "Duplicate parties... normalize".
        // If "PP-Foro" and "PP" are in the same province, they are usually distinct lists.
        // Aggregating them might be wrong if they ran against each other (rare).
        // Usually they are the coalition in that area.

        // Let's check strict group map again to see if we should restore the original display name
        if (PARTY_CONFIG.groups[up]) {
            display = rawSiglas;
            isGroupChild = true;
        } else if (up.startsWith(id + "-") || up.includes("-")) {
            // Composite name that wasn't strictly mapped?
            // e.g. "PSOE-A". Regex matches PSOE. Display becomes PSOE.
            // This is likely what is desired for "PSOE-A" -> "PSOE".
        }
    }

    // 3. Color
    const color = PARTY_CONFIG.colors[id] || PARTY_CONFIG.colors.DEFAULT;

    return {
        id,
        display,
        color,
        isGroupChild
    };
};

/**
 * Aggregates results to fix duplicates.
 * @param {object} votesObj - { candidacyId: votes }
 * @param {object} candidacies - { candidacyId: { siglas, ... } }
 * @returns {Array} - sorted array of { code, siglas, votes, color, seats }
 */
export const deduplicateResults = (votesObj, seatsObj, candidacies) => {
    if (!votesObj || !candidacies) return [];

    const aggregated = {};

    Object.entries(votesObj).forEach(([cId, votes]) => {
        const candidancy = candidacies[cId];
        const rawSiglas = candidancy ? candidancy.siglas : "Unknown";
        const norm = normalizeParty(rawSiglas);

        // Key for aggregation:
        // If we want to merge duplicates (P.P. + PP), key is norm.display?
        // User said: "four main parties are PP!". This means they are Identical.
        // So they should merge to "PP".
        // Use 'display' as the key to merge identical display names.

        const key = norm.display;

        if (!aggregated[key]) {
            aggregated[key] = {
                siglas: norm.display,
                id: norm.id,
                votes: 0,
                seats: 0,
                color: norm.color,
                cIds: []
            };
        }

        aggregated[key].votes += votes;
        aggregated[key].seats += (seatsObj && seatsObj[cId]) ? seatsObj[cId] : 0;
        aggregated[key].cIds.push(cId);
    });

    return Object.values(aggregated).sort((a, b) => b.votes - a.votes);
};
