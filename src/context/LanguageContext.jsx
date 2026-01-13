import React, { createContext, useState, useContext } from 'react';

const translations = {
    es: {
        title: 'Electrometric.io',
        subtitle: 'Visualización de Resultados Electorales en España',
        map: 'Mapa',
        hemicycle: 'Hemiciclo',
        history: 'Histórico',
        loading: 'Cargando datos...',
        select_election: 'Seleccionar Elecciones',
        compare: 'Comparar',
        votes: 'Votos',
        seats: 'Escaños',
        census: 'Censo',
        participation: 'Participación',
        null_votes: 'Votos Nulos',
        blank_votes: 'Votos en Blanco',
        municipality: 'Municipio',
        province: 'Provincia',
        ca: 'Comunidad Autónoma',
        back: 'Volver'
    },
    en: {
        title: 'ElectoGraphica',
        subtitle: 'Spanish Electoral Results Visualization',
        map: 'Map',
        hemicycle: 'Hemicycle',
        history: 'History',
        loading: 'Loading data...',
        select_election: 'Select Election',
        compare: 'Compare',
        votes: 'Votes',
        seats: 'Seats',
        census: 'Census',
        participation: 'Participation',
        null_votes: 'Null Votes',
        blank_votes: 'Blank Votes',
        municipality: 'Municipality',
        province: 'Province',
        ca: 'Autonomous Community',
        back: 'Back'
    }
};

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
    const [lang, setLang] = useState('es');

    const t = (key) => translations[lang][key] || key;

    return (
        <LanguageContext.Provider value={{ lang, setLang, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => useContext(LanguageContext);
