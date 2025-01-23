import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { SparqlResponse } from '../constants/sparqlResponse';

@Injectable({
  providedIn: 'root'
})
export class HttpSparqlService {

  constructor(private http: HttpClient) { }

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


