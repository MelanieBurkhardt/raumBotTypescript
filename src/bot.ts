// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import {ActivityTypes, RecognizerResult, TurnContext} from 'botbuilder';
import {LuisApplication, LuisPredictionOptions, LuisRecognizer} from 'botbuilder-ai';
import {isArray} from "util";

/**
 * A simple bot that responds to utterances with answers from the Language Understanding (LUIS) service.
 * If an answer is not found for an utterance, the bot responds with help.
 */
export class LuisBot {
    private luisRecognizer: LuisRecognizer;

    /**
     * The LuisBot constructor requires one argument (`application`) which is used to create an instance of `LuisRecognizer`.
     * @param luisApplication The basic configuration needed to call LUIS. In this sample the configuration is retrieved from the .bot file.
     * @param luisPredictionOptions (Optional) Contains additional settings for configuring calls to LUIS.
     */
    constructor(luisApplication: LuisApplication, luisPredictionOptions?: LuisPredictionOptions) {
        this.luisRecognizer = new LuisRecognizer(luisApplication, luisPredictionOptions, true);
    }

    static getPersons(entities: any): string[] {
        var personen: string[] = [];

        if (entities.anzahlPersonen && isArray(entities.anzahlPersonen)) {
            for (let i = 0; i < entities.anzahlPersonen.length; i++) {
                let person = entities.anzahlPersonen[i];
                if (isArray(person)) {
                    person = person[0];
                }
                if (!personen.includes(person)) {
                    personen.push(person);
                }
            }
        }
        return personen;
    }

    static getAusstattungsString(initialString: string, ausstattungen: string[], turnContext: TurnContext): string {
        if (ausstattungen.length >= 1) {
            initialString += ' mit ';
            for (let ausstattung of ausstattungen) {
                initialString += ausstattung + ' und ';
            }
            initialString = initialString.substr(0, initialString.length - 5);
        }
        return initialString;
    }

    static getAusstattung(entities: any): string[] {
        var res: string[] = [];

        if (entities.ausstattungRaum && isArray(entities.ausstattungRaum)) {
            console.log('entities: ', entities.ausstattungRaum);
            for (let i = 0; i < entities.ausstattungRaum.length; i++) {
                let element = entities.ausstattungRaum[i];
                if (isArray(element)) {
                    element = element[0];
                }
                res.push(element);
            }
        }
        return res;
    }

    static getPersonString(initialString: string, persons: string[], turnContext: TurnContext): string {
        if (persons.length > 1 && !persons.includes('Person') || persons.length > 2) {
            let error = 'Die Anzahl der Personen ist unspezifisch, folgende Angaben wurden verstanden: ';
            for (let person of persons) {
                error += person + ' und ';
            }
            turnContext.sendActivity(error.substr(0, error.length - 5));
            initialString += 'error';
        } else if (persons.length === 2 && persons.includes('Person')) {
            if (!persons[0].includes('Person')) {
                initialString += 'Ein Raum für eine ' + persons[0];
            } else {
                initialString += 'Ein Raum für eine ' + persons[1];
            }
        } else if (persons.length === 1) {
            initialString += 'Ein Raum für eine ' + persons[0];
        }
        if (persons.length === 0) {
            initialString += 'Ein Raum für eine kleine Gruppe';
        }

        return initialString;
    }

    static getZeitString(initialString: string, entities: any, turnContext: TurnContext): string {
        let zeitRaum: string[] = [];
        let uhrzeit: Date = new Date();
        if (entities.datetime && isArray(entities.datetime)) {
            let bestandteile = entities.datetime[0].split(':');
            if (bestandteile.length === 1) {
                uhrzeit.setHours(bestandteile[0]);
                uhrzeit.setMinutes(0);
            } else if (bestandteile.length >= 2) {
                uhrzeit.setHours(bestandteile[0]);
                uhrzeit.setMinutes(bestandteile[1]);
            }
        }
        console.log(uhrzeit);

        if (entities.zeitRaum && isArray(entities.zeitRaum)) {
            console.log('entities: ', entities.zeitRaum);
            for (let i = 0; i < entities.zeitRaum.length; i++) {
                let element = entities.zeitRaum[i];
                if (isArray(element)) {
                    element = element[0];
                }
                zeitRaum.push(element);
            }
        }

        if (zeitRaum.includes('gestern')) {
            uhrzeit.setDate(uhrzeit.getDate() - 1);
        } else if (zeitRaum.includes('morgen') && !zeitRaum.includes('morgens')) {
            uhrzeit.setDate(uhrzeit.getDate() + 1);
        } else if (zeitRaum.includes('morgen') && zeitRaum.includes('morgens')) {
            uhrzeit.setDate(uhrzeit.getDate() + 1);
            uhrzeit.setHours(9);
            uhrzeit.setMinutes(0);
        } else if (zeitRaum.includes('übermorgen') || zeitRaum.includes('über morgen')) {
            uhrzeit.setDate(uhrzeit.getDate() + 2);
        }
        if (zeitRaum.includes('abend') || zeitRaum.includes('abends')) {
            uhrzeit.setHours(18);
            uhrzeit.setMinutes(0);
        } else if (zeitRaum.includes('mittag') || zeitRaum.includes('mittags')) {
            uhrzeit.setHours(13);
            uhrzeit.setMinutes(0);
        } else if (zeitRaum.includes('nachmittag') || zeitRaum.includes('nachmittags') || zeitRaum.includes('nach mittags')) {
            uhrzeit.setHours(15);
            uhrzeit.setMinutes(30);
        } else if (zeitRaum.includes('morgens') || zeitRaum.includes('früh')) {
            uhrzeit.setHours(9);
            uhrzeit.setMinutes(0);
        } else if (zeitRaum.includes('gleich')) {
            if (uhrzeit.getMinutes() >= 45) {
                uhrzeit.setHours(uhrzeit.getHours() + 1);
                uhrzeit.setMinutes(15 + uhrzeit.getMinutes() - 60)
            } else {
                uhrzeit.setMinutes(15 + uhrzeit.getMinutes())
            }
            uhrzeit.setMinutes(uhrzeit.getMinutes())
        }
        uhrzeit.setSeconds(0);
        console.log(uhrzeit.toLocaleTimeString());
        let res = ' am ' + uhrzeit.toLocaleString('de-DE', {day: 'numeric'}) + '.' + uhrzeit.toLocaleString('de-DE', {month: 'numeric'});
        res += '. um ' + uhrzeit.toLocaleString('de-DE', {hour: 'numeric', minute: 'numeric'}) + ' Uhr';
        console.log(res, uhrzeit.toDateString());
        return initialString + res;
    }

    static getTeilnehmer(entities: any): string[] {
        var res: string[] = [];

        if (entities.namePerson && isArray(entities.namePerson)) {
            console.log('entities: ', entities.namePerson);
            for (let i = 0; i < entities.namePerson.length; i++) {
                let element = entities.namePerson[i];
                if (isArray(element)) {
                    element = element[0];
                }
                res.push(element);
            }
        }
        return res;
    }

    static getTeilnehmerString(initialString: string, teilnehmer: string[], turnContext: TurnContext): string {
        if (teilnehmer.length >= 1) {
            initialString += ' mit ';
            for (let person of teilnehmer) {
                initialString += person + ' und ';
            }
            initialString = initialString.substr(0, initialString.length - 5);
        }
        return initialString;
    }

    static getOrt(entities: any): string[] {
        var res: string[] = [];

        if (entities.ortRelativ && isArray(entities.ortRelativ)) {
            console.log('entities: ', entities.ortRelativ);
            for (let i = 0; i < entities.ortRelativ.length; i++) {
                let element = entities.ortRelativ[i];
                if (isArray(element)) {
                    element = element[0];
                    if (element === 'hier') {
                        element = 'in der Nähe';
                    }
                }
                res.push(element);
            }
        } else if (entities.ortRaum && isArray(entities.ortRaum)) {
            console.log('entities: ', entities.ortRaum);
            for (let i = 0; i < entities.ortRaum.length; i++) {
                let element = entities.ortRaum[i];
                if (isArray(element)) {
                    element = element[0];
                }
                res.push('in ' + element);
            }
        }
        return res;
    }

    static getOrtString(initialString: string, orte: string[], turnContext: TurnContext): string {
        if (orte.length >= 1) {
            initialString += ' ' + orte[0];
        }
        return initialString;
    }

    /**
     * Every conversation turn calls this method.
     * There are no dialogs used, since it's "single turn" processing, meaning a single request and
     * response, with no stateful conversation.
     * @param turnContext A TurnContext instance, containing all the data needed for processing the conversation turn.
     */
    public async onTurn(turnContext: TurnContext) {
        // By checking the incoming Activity type, the bot only calls LUIS in appropriate cases.
        if (turnContext.activity.type === ActivityTypes.Message) {
            // Perform a call to LUIS to retrieve results for the user's message.
            const results: RecognizerResult = await this.luisRecognizer.recognize(turnContext);

            const entities: any = results.entities;

            let result: string = LuisBot.getPersonString('', LuisBot.getPersons(entities), turnContext);

            result = LuisBot.getAusstattungsString(result, LuisBot.getAusstattung(entities), turnContext);
            result = LuisBot.getTeilnehmerString(result, LuisBot.getTeilnehmer(entities), turnContext);
            result = LuisBot.getOrtString(result, LuisBot.getOrt(entities), turnContext);
            result = LuisBot.getZeitString(result, entities, turnContext);

            console.log(entities);

            var ausstattungRaum: string = entities.ausstattungRaum || '';
            var keyPhrase: string = entities.keyPhrase || '';
            var namePerson: string = entities.namePerson || '';
            var ortRaum: string = entities.ortRaum || '';
            var zeitRaum: string = entities.zeitRaum || '';
            var datetime: string = entities.datetime || '';

            result += ' wird gebucht.';

            if (results.luisResult.topScoringIntent !== 'None' && !result.includes('error')) {
                await turnContext.sendActivity(`${ result}`);
            } else {
                // If the top scoring intent was "None" tell the user no valid intents were found and provide help.
                await turnContext.sendActivity(`Die Eingabe wurde nicht verstanden, bitte wiederholen.`);
            }
        } else if (turnContext.activity.type === ActivityTypes.ConversationUpdate &&
            turnContext.activity.recipient.id !== turnContext.activity.membersAdded[0].id) {
            // If the Activity is a ConversationUpdate, send a greeting message to the user.
            await turnContext.sendActivity('Welcome to the NLP with LUIS sample! Send me a message and I will try to predict your intent.');
        } else if (turnContext.activity.type !== ActivityTypes.ConversationUpdate) {
            // Respond to all other Activity types.
            await turnContext.sendActivity(`[${ turnContext.activity.type }]-type activity detected.`);
        }
    }
}
