import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
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
    // const repositoryUrl = 'http://Rachads-MacBook-Pro-2.local:7200/repositories/Books-app'
    const repositoryUrl = 'http://51.79.51.204:7200/repositories/books';

    const headers = new HttpHeaders({
      'Content-Type': 'application/sparql-query',
      'Accept': 'application/sparql-results+json',
    });

    try {
      // Log query for debugging (truncate long queries)
      const queryPreview = sparqlQuery.length > 500 
        ? sparqlQuery.substring(0, 500) + '...' 
        : sparqlQuery;
      console.log('Executing SPARQL query:', queryPreview);
      
      // Measure query execution time
      const startTime = performance.now();
      
      const response = await this.http.post<SparqlResponse>(
        repositoryUrl, 
        sparqlQuery, 
        { headers }
      ).toPromise();
      
      const endTime = performance.now();
      const executionTime = (endTime - startTime).toFixed(2);
      
      if (!response) {
        throw new Error('No response received from the server');
      }
      
      const resultCount = response.results?.bindings?.length || 0;
      console.log(`Query executed in ${executionTime}ms, returned ${resultCount} results`);
      
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

}
