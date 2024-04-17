/*
Copyright 2019, 2021 The Matrix.org Foundation C.I.C.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import classNames from "classnames";
import { SERVICE_TYPES, MatrixClient } from "matrix-js-sdk/src/matrix";
import { logger } from "matrix-js-sdk/src/logger";

import Modal from "./Modal";
import TermsDialog from "./components/views/dialogs/TermsDialog";
import {
    doesAccountDataHaveIdentityServer,
    setToDefaultIdentityServer,
} from './utils/IdentityServerUtils';
import TchapUIFeature from "../../../src/tchap/util/TchapUIFeature";

export class TermsNotSignedError extends Error {}

/**
 * Class representing a service that may have terms & conditions that
 * require agreement from the user before the user can use that service.
 */
export class Service {
    /**
     * @param {MatrixClient.SERVICE_TYPES} serviceType The type of service
     * @param {string} baseUrl The Base URL of the service (ie. before '/_matrix')
     * @param {string} accessToken The user's access token for the service
     */
    public constructor(
        public serviceType: SERVICE_TYPES,
        public baseUrl: string,
        public accessToken: string,
    ) {}
}

export interface LocalisedPolicy {
    name: string;
    url: string;
}

export interface Policy {
    // @ts-ignore: No great way to express indexed types together with other keys
    version: string;
    [lang: string]: LocalisedPolicy;
}

export type Policies = {
    [policy: string]: Policy;
};

export type ServicePolicyPair = {
    policies: Policies;
    service: Service;
};

export type TermsInteractionCallback = (
    policiesAndServicePairs: ServicePolicyPair[],
    agreedUrls: string[],
    extraClassNames?: string,
) => Promise<string[]>;

/**
 * Start a flow where the user is presented with terms & conditions for some services
 *
 * @param client The Matrix Client instance of the logged-in user
 * @param {Service[]} services Object with keys 'serviceType', 'baseUrl', 'accessToken'
 * @param {function} interactionCallback Function called with:
 *      * an array of { service: {Service}, policies: {terms response from API} }
 *      * an array of URLs the user has already agreed to
 *     Must return a Promise which resolves with a list of URLs of documents agreed to
 * @returns {Promise} resolves when the user agreed to all necessary terms or rejects
 *     if they cancel.
 */
export async function startTermsFlow(
    client: MatrixClient,
    services: Service[],
    interactionCallback: TermsInteractionCallback = dialogTermsInteractionCallback,
): Promise<void> {
    // :TCHAP: auto-accept-tac - no need to go through Terms flow as we trust our backend servers
    if (TchapUIFeature.autoAcceptTermsAndConditions){
        if (!doesAccountDataHaveIdentityServer(client)) {
            setToDefaultIdentityServer(client);
        }
        return;
    }
    // end :TCHAP:

    const termsPromises = services.map((s) => client.getTerms(s.serviceType, s.baseUrl));

    /*
     * a /terms response looks like:
     * {
     *     "policies": {
     *         "terms_of_service": {
     *             "version": "2.0",
     *              "en": {
     *                 "name": "Terms of Service",
     *                 "url": "https://example.org/somewhere/terms-2.0-en.html"
     *             },
     *             "fr": {
     *                 "name": "Conditions d'utilisation",
     *                 "url": "https://example.org/somewhere/terms-2.0-fr.html"
     *             }
     *         }
     *     }
     * }
     */

    const terms: { policies: Policies }[] = await Promise.all(termsPromises);
    const policiesAndServicePairs = terms.map((t, i) => {
        return { service: services[i], policies: t.policies };
    });

    // fetch the set of agreed policy URLs from account data
    const currentAcceptedTerms = await client.getAccountData("m.accepted_terms");
    let agreedUrlSet: Set<string>;
    if (!currentAcceptedTerms || !currentAcceptedTerms.getContent() || !currentAcceptedTerms.getContent().accepted) {
        agreedUrlSet = new Set();
    } else {
        agreedUrlSet = new Set(currentAcceptedTerms.getContent().accepted);
    }

    // remove any policies the user has already agreed to and any services where
    // they've already agreed to all the policies
    // NB. it could be nicer to show the user stuff they've already agreed to,
    // but then they'd assume they can un-check the boxes to un-agree to a policy,
    // but that is not a thing the API supports, so probably best to just show
    // things they've not agreed to yet.
    const unagreedPoliciesAndServicePairs: ServicePolicyPair[] = [];
    for (const { service, policies } of policiesAndServicePairs) {
        const unagreedPolicies: Policies = {};
        for (const [policyName, policy] of Object.entries(policies)) {
            let policyAgreed = false;
            for (const lang of Object.keys(policy)) {
                if (lang === "version") continue;
                if (agreedUrlSet.has(policy[lang].url)) {
                    policyAgreed = true;
                    break;
                }
            }
            if (!policyAgreed) unagreedPolicies[policyName] = policy;
        }
        if (Object.keys(unagreedPolicies).length > 0) {
            unagreedPoliciesAndServicePairs.push({ service, policies: unagreedPolicies });
        }
    }

    // if there's anything left to agree to, prompt the user
    const numAcceptedBeforeAgreement = agreedUrlSet.size;
    if (unagreedPoliciesAndServicePairs.length > 0) {
        const newlyAgreedUrls = await interactionCallback(unagreedPoliciesAndServicePairs, [...agreedUrlSet]);
        logger.log("User has agreed to URLs", newlyAgreedUrls);
        // Merge with previously agreed URLs
        newlyAgreedUrls.forEach((url) => agreedUrlSet.add(url));
    } else {
        logger.log("User has already agreed to all required policies");
    }

    // We only ever add to the set of URLs, so if anything has changed then we'd see a different length
    if (agreedUrlSet.size !== numAcceptedBeforeAgreement) {
        const newAcceptedTerms = { accepted: Array.from(agreedUrlSet) };
        await client.setAccountData("m.accepted_terms", newAcceptedTerms);
    }

    const agreePromises = policiesAndServicePairs.map((policiesAndService) => {
        // filter the agreed URL list for ones that are actually for this service
        // (one URL may be used for multiple services)
        // Not a particularly efficient loop but probably fine given the numbers involved
        const urlsForService = Array.from(agreedUrlSet).filter((url) => {
            for (const policy of Object.values(policiesAndService.policies)) {
                for (const lang of Object.keys(policy)) {
                    if (lang === "version") continue;
                    if (policy[lang].url === url) return true;
                }
            }
            return false;
        });

        if (urlsForService.length === 0) return Promise.resolve();

        return client.agreeToTerms(
            policiesAndService.service.serviceType,
            policiesAndService.service.baseUrl,
            policiesAndService.service.accessToken,
            urlsForService,
        );
    });
    await Promise.all(agreePromises);
}

export async function dialogTermsInteractionCallback(
    policiesAndServicePairs: {
        service: Service;
        policies: { [policy: string]: Policy };
    }[],
    agreedUrls: string[],
    extraClassNames?: string,
): Promise<string[]> {
    logger.log("Terms that need agreement", policiesAndServicePairs);

    const { finished } = Modal.createDialog(
        TermsDialog,
        {
            policiesAndServicePairs,
            agreedUrls,
        },
        classNames("mx_TermsDialog", extraClassNames),
    );

    const [done, _agreedUrls] = await finished;
    if (!done || !_agreedUrls) {
        throw new TermsNotSignedError();
    }
    return _agreedUrls;
}
