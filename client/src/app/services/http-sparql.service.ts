import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { SparqlResponse } from '../constants/sparqlResponse';
import { SPARQL_BTLF_FILTER } from '../constants/sparql';
import { ThemaCodes } from '../constants/thema-codes';

/**
 * @description This service class is responsible for sending SPARQL queries to the GraphDB instance and handling the responses.
 * It updates the behavioral subjects based on the responses received.
 * 
 * @todo Implement the logic to update the behavioral subjects with the responses received from the GraphDB instance.
 */
@Injectable({
  providedIn: 'root'
})
export class HttpSparqlService {


  private readonly jsonUrl = 'assets/thema_code_dict.json';

  constructor(private readonly http: HttpClient) { }

  async postQuery(sparqlQuery: string): Promise<SparqlResponse> {
    const repositoryUrl = 'http://Rachads-MacBook-Pro-2.local:7200/repositories/Books-app';
    const headers = new HttpHeaders({
      'Content-Type': 'application/sparql-query',
      'Accept': 'application/sparql-results+json',
    });

    const response = await this.http.post<SparqlResponse>(repositoryUrl, sparqlQuery, { headers }).toPromise();
    if (!response) {
      throw new Error('No response received from the server');
    }
    return response;
  }

  async findCodeByDescription(description: string): Promise<string | undefined> {
    const response = await this.http.get<ThemaCodes>(this.jsonUrl).toPromise();
    if (!response) {
      throw new Error('No response received from the server');
    }

    const normalizedDescription = description
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    console.log(`Normalized input description: ${normalizedDescription}`); // Debug input normalization

    for (const key in response) {
      if (response[key].CodeDescription === description) {
        const codeValue = response[key].CodeValue; // Return the code value if found

        // Construct the SPARQL query and send it only if the codeValue is found
        const filter = `FILTER(UCASE(?subjectThema) = "${codeValue.toUpperCase()}")`;
        const sparqlQuery = SPARQL_BTLF_FILTER(filter);
        await this.postQuery(sparqlQuery);

        return codeValue;
      }
    }

    return undefined; // Return undefined if not found
  }

}


