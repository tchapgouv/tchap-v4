import React from "react";

import "../../../../../res/css/common/_TchapHeader.pcss";


export const TchapHeader: React.FC = () => {
    return (
        <header role="banner" className="fr-header">
            <div className="fr-header__body">
                <div className="fr-container">
                    <div className="fr-header__body-row">
                        <div className="fr-header__brand fr-enlarge-link">
                            <div className="fr-header__brand-top">
                                <div className="fr-header__logo">
                                    <p className="fr-logo">
                                        Intitulé
                                        <br/>officiel
                                    </p>
                                </div>
                            </div>
                            <div className="fr-header__service">
                                <a href="/" title="Accueil - [À MODIFIER - Nom du site / service] - Nom de l’entité (ministère, secrétariat d‘état, gouvernement)">
                                    <p className="fr-header__service-title">
                                        Nom du site / service
                                    </p>
                                </a>
                                <p className="fr-header__service-tagline">baseline - précisions sur l‘organisation</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};
