/*
Copyright 2022 The Matrix.org Foundation C.I.C.

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

/// <reference types="cypress" />

import Chainable = Cypress.Chainable;
import RandomUtils from "../../utils/random-utils";

function openCreateRoomDialog(): Chainable<JQuery<HTMLElement>> {
    const addRoomLabel = "Ajouter un salon";
    const newRoomLabel = "Nouveau salon";
    cy.get(`[aria-label="${addRoomLabel}"]`).click();
    cy.get(`.mx_ContextualMenu [aria-label="${newRoomLabel}"]`).click();
    return cy.get(".mx_Dialog");
}

describe("Create Room", () => {
    const homeserverShortname = Cypress.env("E2E_TEST_USER_HOMESERVER_SHORT");
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");

    beforeEach(() => {
        cy.loginUser();
    });

    afterEach(() => {
        // We find the roomId to clean up from the current URL.
        // Note : This is simple and works, so good enough for now. But if we want to store the roomId at the end of the test instead, we could use “as”
        // for passing the value around : https://docs.cypress.io/guides/core-concepts/variables-and-aliases#Sharing-Context
        // Do NOT use a describe-level variable (like "let roomIdToCleanup") like we do in unit tests, cypress does not work like that.
        cy.url().then((urlString) => {
            console.log("roomId url string", urlString);
            console.log("roomId url string split", urlString.split("/#/room/"));
            console.log("roomIdToCleanup", urlString.split("/#/room/")[1]);
            const roomId = urlString.split("/#/room/")[1];
            if (roomId) {
                cy.leaveRoom(roomId);
                // todo also forgetRoom to save resources.
            } else {
                console.error("Did not find roomId in url. Not cleaning up.");
            }
        });
    });

    it("should allow us to create a private room with name", () => {
        const name = "test/" + today + "/create_room_private/" + RandomUtils.generateRandom(4);

        openCreateRoomDialog().within(() => {
            // Fill name
            const nameLabel = "Nom";
            cy.get(`[label="${nameLabel}"]`).type(name);
            // Submit
            cy.get(".mx_Dialog_primary").click();
        });

        // Url of room looks like :
        // http://localhost:8080/#/room/!kshfkshfkKSHJ:dev01.tchap.incubateur.net
        const roomUrlRegex = new RegExp("/#/room/![A-z0-9]+:" + homeserverShortname);
        cy.url().should("match", roomUrlRegex);
        cy.get(".mx_LegacyRoomHeader_nametext").contains(name);
        cy.get(".tc_RoomHeader_external").should("not.exist");
    });

    //check that the mention "open to external users" is displayed
    it("should allow us to create a private room with name and externs allowed", () => {
        const name = "test/" + today + "/create_room_externs/" + RandomUtils.generateRandom(4);

        openCreateRoomDialog().within(() => {
            // Fill name
            const nameLabel = "Nom";
            cy.get(`[label="${nameLabel}"]`).type(name);
            // Change room to external
            cy.get(".tc_TchapRoomTypeSelector_external").click();
            // Submit
            cy.get(".mx_Dialog_primary").click();
        });

        // Url of room looks like :
        // http://localhost:8080/#/room/!kshfkshfkKSHJ:dev01.tchap.incubateur.net
        const roomUrlRegex = new RegExp("/#/room/![A-z0-9]+:" + homeserverShortname);
        cy.url().should("match", roomUrlRegex);
        cy.get(".mx_LegacyRoomHeader_nametext").contains(name);
        cy.get(".tc_RoomHeader_external").should("exist");
    });

    it("should allow us to create a public room with name", () => {
        const name = "test/" + today + "/create_room_public/" + RandomUtils.generateRandom(4);

        openCreateRoomDialog().within(() => {
            // Fill name
            const nameLabel = "Nom";
            cy.get(`[label="${nameLabel}"]`).type(name);
            // Change room to public
            cy.get(".tc_TchapRoomTypeSelector_forum").click();
            // Submit
            cy.get(".mx_Dialog_primary").click();
        });

        // Url of room looks like :
        // http://localhost:8080/#/room/!kshfkshfkKSHJ:dev01.tchap.incubateur.net
        const roomUrlRegex = new RegExp("/#/room/![A-z0-9]+:" + homeserverShortname);
        cy.url().should("match", roomUrlRegex);
        cy.get(".mx_LegacyRoomHeader_nametext").contains(name);
    });

    // Note : DM creation is not tested here, because Tchap has no custom implementation for DMs. (2023-01-30)
});
