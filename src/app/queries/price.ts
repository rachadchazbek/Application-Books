export const PRICE_QUERY = (isbn: string) => `
PREFIX schema: <http://schema.org/>

SELECT ?book ?price ?availability ?sellerName ?sellerEmail ?sellerPhone
WHERE {
  ?book a schema:Book ;
        schema:isbn "${isbn}" ;
        schema:offers ?offer .
 ?offer a schema:Offer ;
         schema:availability ?availability ;
         schema:price ?price ;
         schema:seller ?seller .
    
 ?seller a schema:Organization ;
        schema:email ?sellerEmail ;
        schema:name ?sellerName ;
        schema:telephone ?sellerPhone .
}
GROUP BY ?book ?price ?availability ?sellerName ?sellerEmail ?sellerPhone
`;