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


export interface ModelError { 
    /**
     * Status HTTP of the error
     */
    status?: string;
    /**
     * Message of the error
     */
    message?: string;
    /**
     * Technical code of the error
     */
    code?: string;
    /**
     * Parameters
     */
    parameters?: { [key: string]: string; };
}

