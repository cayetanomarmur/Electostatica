import React, { createContext, useState, useContext, useEffect } from 'react';

const translations = {
    es: {
        // General
        loading: 'Cargando datos...',
        no_data: 'Sin datos',
        
        // Navigation
        dashboard: 'Dashboard',
        trends: 'Tendencias',
        multimap: 'Multimapa',
        constructor: 'Constructor',
        
        // Map levels
        communities: 'Comunidades',
        provinces: 'Provincias',
        municipalities: 'Municipios',
        show_seats: 'Mostrar escaños',
        seats_short: 'Escaños',
        no_map_available: 'No hay mapa disponible para',
        
        // Election types
        congreso: 'Congreso',
        municipales: 'Municipales',
        general_election: 'Generales',
        
        // Table headers
        party: 'Partido',
        votes: 'Votos',
        seats: 'Escaños',
        municipalities_label: 'Municipios',
        compare: 'Comparar:',
        others: 'Otros',
        parties: 'partidos',
        participation: 'Participación',
        total: 'TOTAL',
        
        // Filters
        community: 'Comunidad',
        province: 'Provincia',
        municipality: 'Municipio',
        national: 'Nacional',
        all_fem: 'Todas',
        all_masc: 'Todos',
        
        // Coalition Builder
        coalition_builder: 'Constructor de Coaliciones',
        clear: 'Limpiar',
        reset: 'Reiniciar',
        in_favor: 'A favor',
        abstention: 'Abst.',
        abstention_full: 'Abstención',
        against: 'En contra',
        absolute_majority: 'Mayoría Absoluta',
        simple_majority: 'Mayoría Simple',
        no_majority: 'Sin Mayoría',
        yes: 'SÍ',
        abst: 'ABST',
        no: 'NO',
        no_seats_available: 'No hay escaños disponibles en esta vista.',
        coalition: 'Coalición:',
        none: 'Ninguna',
        abs: 'Abs',
        
        // Constructor
        type: 'Tipo:',
        base_election: 'Elección Base:',
        modify_seats_desc: 'Modifica los',
        and_select_parties: 'y selecciona partidos para ver la mayoría.',
        majority_threshold: 'Mayoría:',
        municipalities_threshold: 'municipios',
        scenario_name: 'Nombre del escenario...',
        save: 'Guardar',
        add_party: '+ Añadir partido...',
        total_seats: 'Total',
        should_be_350: 'El total debería ser 350',
        remove_party: 'Eliminar partido',
        
        // Time History / Charts
        from: 'Desde:',
        to: 'Hasta:',
        width: 'Ancho:',
        height: 'Alto:',
        add_chart: '+ Añadir Gráfico',
        remove_chart: 'Eliminar gráfico',
        add: '+ Añadir...',
        add_chart_to_start: 'Añade un gráfico para comenzar...',
        no_data_for_selection: 'No hay datos para esta selección',
        vote: 'Voto',
        
        // MultiMap
        add_map: 'Añadir Mapa',
        export: 'Exportar',
        format: 'Formato:',
        background: 'Fondo:',
        resolution: 'Resolución:',
        dark: 'Oscuro',
        white: 'Blanco',
        transparent: 'Transparente',
        download: 'Descargar',
        maps: 'mapas',
        drag_to_reorder: 'Arrastra para reordenar',
        remove_map: 'Eliminar mapa',
        map_not_found: 'No se encontró el mapa',
        no_maps_to_export: 'No hay mapas para exportar',
        export_title: 'Exportar',
        
        // Language
        language: 'Idioma',
        spanish: 'Español',
        english: 'English',
        
        // Month abbreviations
        months: ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    },
    en: {
        // General
        loading: 'Loading data...',
        no_data: 'No data',
        
        // Navigation
        dashboard: 'Dashboard',
        trends: 'Trends',
        multimap: 'Multimap',
        constructor: 'Constructor',
        
        // Map levels
        communities: 'Communities',
        provinces: 'Provinces',
        municipalities: 'Municipalities',
        show_seats: 'Show seats',
        seats_short: 'Seats',
        no_map_available: 'No map available for',
        
        // Election types
        congreso: 'Congress',
        municipales: 'Municipal',
        general_election: 'General',
        
        // Table headers
        party: 'Party',
        votes: 'Votes',
        seats: 'Seats',
        municipalities_label: 'Municipalities',
        compare: 'Compare:',
        others: 'Others',
        parties: 'parties',
        participation: 'Participation',
        total: 'TOTAL',
        
        // Filters
        community: 'Community',
        province: 'Province',
        municipality: 'Municipality',
        national: 'National',
        all_fem: 'All',
        all_masc: 'All',
        
        // Coalition Builder
        coalition_builder: 'Coalition Builder',
        clear: 'Clear',
        reset: 'Reset',
        in_favor: 'In favor',
        abstention: 'Abst.',
        abstention_full: 'Abstention',
        against: 'Against',
        absolute_majority: 'Absolute Majority',
        simple_majority: 'Simple Majority',
        no_majority: 'No Majority',
        yes: 'YES',
        abst: 'ABST',
        no: 'NO',
        no_seats_available: 'No seats available in this view.',
        coalition: 'Coalition:',
        none: 'None',
        abs: 'Abs',
        
        // Constructor
        type: 'Type:',
        base_election: 'Base Election:',
        modify_seats_desc: 'Modify the',
        and_select_parties: 'and select parties to check majority.',
        majority_threshold: 'Majority:',
        municipalities_threshold: 'municipalities',
        scenario_name: 'Scenario name...',
        save: 'Save',
        add_party: '+ Add party...',
        total_seats: 'Total',
        should_be_350: 'Total should be 350',
        remove_party: 'Remove party',
        
        // Time History / Charts
        from: 'From:',
        to: 'To:',
        width: 'Width:',
        height: 'Height:',
        add_chart: '+ Add Chart',
        remove_chart: 'Remove chart',
        add: '+ Add...',
        add_chart_to_start: 'Add a chart to get started...',
        no_data_for_selection: 'No data for this selection',
        vote: 'Vote',
        
        // MultiMap
        add_map: 'Add Map',
        export: 'Export',
        format: 'Format:',
        background: 'Background:',
        resolution: 'Resolution:',
        dark: 'Dark',
        white: 'White',
        transparent: 'Transparent',
        download: 'Download',
        maps: 'maps',
        drag_to_reorder: 'Drag to reorder',
        remove_map: 'Remove map',
        map_not_found: 'Map not found',
        no_maps_to_export: 'No maps to export',
        export_title: 'Export',
        
        // Language
        language: 'Language',
        spanish: 'Español',
        english: 'English',
        
        // Month abbreviations
        months: ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    }
};

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
    // Initialize from localStorage or default to 'es'
    const [lang, setLang] = useState(() => {
        const saved = localStorage.getItem('electostatica-lang');
        return saved || 'es';
    });

    // Persist language preference to localStorage
    useEffect(() => {
        localStorage.setItem('electostatica-lang', lang);
    }, [lang]);

    const t = (key) => translations[lang][key] || key;

    // Helper to get month name
    const getMonthName = (monthNum) => {
        const months = translations[lang].months;
        return months[parseInt(monthNum)] || monthNum;
    };

    return (
        <LanguageContext.Provider value={{ lang, setLang, t, getMonthName }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => useContext(LanguageContext);
