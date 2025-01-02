import React from "react";
 
export const TchapHeader: React.FC = () => {
    return (
        <header role="banner" className="lasuite fr-header lasuite-header">
            <div className="fr-header__body">
                <div className="fr-container lasuite-container">
                    <div className="fr-header__body-row">
                        <div className="fr-header__brand fr-enlarge-link">
                            <div className="fr-header__brand-top">
                                <div className="fr-header__logo">
                                    <p className="fr-logo">
                                        République
                                        <br/>Française
                                    </p>
                                </div>
                            </div>
                            <div className="fr-header__service">
                                <a className="lasuite-header__service-link ui-home" href="/" title="Accueil - Tchap - DINUM">
                                    <img src="/themes/tchap/img/logos/tchap-logo.svg" alt="" className="lasuite-header__service-logo fr-responsive-img" width="32" height="32" />
                                    <p className="fr-header__service-title lasuite-header__service-title">
                                        Tchap
                                    </p>
                                </a>
                                {/* <p className="fr-header__service-tagline">La messagerie instantanée du secteur public</p> */}
                            </div>
                        </div>

                        <div className="fr-header__tools">
                            <div className="fr-header__tools-links lasuite-header__tools-links" data-fr-js-header-links="true">
                                <ul className="fr-btns-group">
                                    <li className="lasuite-nomobile">
                                        <button
                                            type="button"
                                            className="lasuite-gaufre-btn lasuite-gaufre-btn--vanilla js-lasuite-gaufre-btn"
                                            title="Les services de La Suite numérique"
                                        >
                                            Les services de La Suite numérique
                                        </button>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};
