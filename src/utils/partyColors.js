
// Party Colors - Uses PARTY_CONFIG from partyUtils for consistent colors across all panels
import { normalizeParty, PARTY_CONFIG } from './partyUtils';

// Legacy export for backwards compatibility
export const PARTY_COLORS = PARTY_CONFIG.colors;

/**
 * Get party info (color and display name) using the centralized partyUtils config
 * This ensures consistent colors across Coalition Builder, Constructor, and all other panels
 */
export const getPartyInfo = (siglas) => {
    if (!siglas) return { color: PARTY_CONFIG.colors.DEFAULT, siglas: '?' };

    // Use the centralized normalizeParty function
    const normalized = normalizeParty(siglas);

    return {
        color: normalized.color,
        siglas: normalized.display || siglas,
        id: normalized.id
    };
};
