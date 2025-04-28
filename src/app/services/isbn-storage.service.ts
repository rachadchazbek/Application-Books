import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class IsbnStorageService {
  private readonly STORAGE_KEY = 'saved_isbns';
  private savedIsbnsSubject = new BehaviorSubject<string[]>([]);
  public savedIsbns$: Observable<string[]> = this.savedIsbnsSubject.asObservable();

  constructor() {
    // Initialize from localStorage
    this.loadFromStorage();
  }

  /**
   * Load saved ISBNs from localStorage
   */
  private loadFromStorage(): void {
    try {
      const storedIsbns = localStorage.getItem(this.STORAGE_KEY);
      if (storedIsbns) {
        const parsedIsbns = JSON.parse(storedIsbns);
        this.savedIsbnsSubject.next(Array.isArray(parsedIsbns) ? parsedIsbns : []);
      } else {
        this.savedIsbnsSubject.next([]);
      }
    } catch (error) {
      console.error('Error loading ISBNs from localStorage:', error);
      this.savedIsbnsSubject.next([]);
    }
  }

  /**
   * Save ISBNs to localStorage
   */
  private saveToStorage(isbns: string[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(isbns));
      this.savedIsbnsSubject.next(isbns);
    } catch (error) {
      console.error('Error saving ISBNs to localStorage:', error);
    }
  }

  /**
   * Get all saved ISBNs
   */
  getSavedIsbns(): string[] {
    return this.savedIsbnsSubject.value;
  }

  /**
   * Save an ISBN to storage
   * @param isbn ISBN to save
   * @returns true if added, false if already exists
   */
  saveIsbn(isbn: string): boolean {
    if (!isbn) return false;
    
    const currentIsbns = this.getSavedIsbns();
    if (currentIsbns.includes(isbn)) {
      return false;
    }
    
    const updatedIsbns = [...currentIsbns, isbn];
    this.saveToStorage(updatedIsbns);
    return true;
  }

  /**
   * Save multiple ISBNs to storage
   * @param isbns ISBNs to save
   * @returns number of new ISBNs added
   */
  saveMultipleIsbns(isbns: string[]): number {
    if (!isbns || isbns.length === 0) return 0;
    
    const currentIsbns = this.getSavedIsbns();
    const uniqueNewIsbns = isbns.filter(isbn => isbn && !currentIsbns.includes(isbn));
    
    if (uniqueNewIsbns.length === 0) {
      return 0;
    }
    
    const updatedIsbns = [...currentIsbns, ...uniqueNewIsbns];
    this.saveToStorage(updatedIsbns);
    return uniqueNewIsbns.length;
  }

  /**
   * Remove an ISBN from storage
   * @param isbn ISBN to remove
   * @returns true if removed, false if not found
   */
  removeIsbn(isbn: string): boolean {
    if (!isbn) return false;
    
    const currentIsbns = this.getSavedIsbns();
    if (!currentIsbns.includes(isbn)) {
      return false;
    }
    
    const updatedIsbns = currentIsbns.filter(i => i !== isbn);
    this.saveToStorage(updatedIsbns);
    return true;
  }

  /**
   * Clear all saved ISBNs
   */
  clearAllIsbns(): void {
    this.saveToStorage([]);
  }

  /**
   * Check if an ISBN is already saved
   * @param isbn ISBN to check
   */
  isIsbnSaved(isbn: string): boolean {
    if (!isbn) return false;
    return this.getSavedIsbns().includes(isbn);
  }

  /**
   * Export saved ISBNs as JSON string
   * @returns JSON string of the saved ISBNs
   */
  exportToJson(): string {
    return JSON.stringify({ 
      isbns: this.getSavedIsbns()
    }, null, 2);
  }

  /**
   * Import ISBNs from JSON string
   * @param jsonData JSON data containing ISBNs
   * @returns true if successful, false otherwise
   */
  importFromJson(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      
      if (!data || !Array.isArray(data.isbns)) {
        return false;
      }
      
      // Filter out any non-string values or empty strings
      const validIsbns = data.isbns.filter((isbn: unknown) => typeof isbn === 'string' && isbn.trim() !== '');
      this.saveMultipleIsbns(validIsbns);
      return true;
    } catch (error) {
      console.error('Error importing ISBNs from JSON:', error);
      return false;
    }
  }

  /**
   * Generates a downloadable file from the exported JSON
   */
  generateExportFile(): void {
    const jsonString = this.exportToJson();
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `saved-books-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
}
