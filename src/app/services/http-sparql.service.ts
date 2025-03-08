import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { SPARQL_BTLF_FILTER } from '../constants/sparql';
import { ThemaCodes } from '../constants/thema-codes';
import { SparqlResponse } from '../constants/Response';

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

  /**
   * Execute a SPARQL query against the GraphDB repository
   * @param sparqlQuery The SPARQL query to execute
   * @returns A promise that resolves to the SPARQL response
   */
  async postQuery(sparqlQuery: string): Promise<SparqlResponse> {
    // const repositoryUrl = 'http://Rachads-MacBook-Pro-2.local:7200/repositories/Books-app' --> Local version
    const repositoryUrl = 'http://148.113.191.18:7200/repositories/books';

    const headers = new HttpHeaders({
      'Content-Type': 'application/sparql-query',
      'Accept': 'application/sparql-results+json',
    });

    try {
      console.log('Sending SPARQL query:', sparqlQuery.substring(0, 100) + '...');
      
      const response = await this.http.post<SparqlResponse>(
        repositoryUrl, 
        sparqlQuery, 
        { headers }
      ).toPromise();
      
      if (!response) {
        throw new Error('No response received from the server');
      }
      
      console.log('SPARQL query successful, received results:', 
        response.results?.bindings?.length || 0);
      
      return response;
    } catch (error) {
      console.error('Error executing SPARQL query:', error);
      
      // Rethrow with more context
      if (error instanceof Error) {
        throw new Error(`SPARQL query failed: ${error.message}`);
      } else {
        throw new Error('SPARQL query failed with unknown error');
      }
    }
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
