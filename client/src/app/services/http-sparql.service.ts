import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { SparqlResponse } from '../constants/sparqlResponse';

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

}


