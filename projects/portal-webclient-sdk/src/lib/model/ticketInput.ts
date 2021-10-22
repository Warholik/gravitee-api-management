/**
 * Gravitee.io Portal Rest API
 * API dedicated to the devportal part of Gravitee
 *
 * The version of the OpenAPI document: 3.12.0-SNAPSHOT
 * Contact: contact@graviteesource.com
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */


export interface TicketInput { 
    /**
     * Subject of the ticket.
     */
    subject: string;
    /**
     * Description of the ticket.
     */
    content: string;
    /**
     * Application identifier concerned by the ticket.
     */
    application?: string;
    /**
     * Api identifer concerned by the ticket.
     */
    api?: string;
    /**
     * True if the author of the ticket wants to receive a copy of the ticket.
     */
    copy_to_sender?: boolean;
}

