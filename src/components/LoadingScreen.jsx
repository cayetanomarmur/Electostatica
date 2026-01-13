import React from 'react';

const LoadingScreen = () => {
    return (
        <div className="loading-screen">
            <div className="loader-content">
                <img src="/logo_iso.png" alt="Electostática" className="loader-logo" />
                <div className="loading-bar-container">
                    <div className="loading-bar"></div>
                </div>
            </div>
        </div>
    );
};

export default LoadingScreen;
